// Central orchestrator for the printing module: owns the live Bluetooth
// connections (one BluetoothPrinterTransport per paired printer), the print
// queue (serialized per printer, retried on failure, nothing dropped) and
// the print log/history. Deliberately a plain module-level singleton, not
// React state — a Bluetooth GATT connection is tied to this one browser
// tab/device, so there both can and should be exactly one of these per page.
//
// Device identity split (see PrinterProfile in types.ts): the shareable
// profile (name/role/paper width) lives in visualConfig.printingConfig and
// syncs like any other setting; the raw Bluetooth device id it resolves to
// is only meaningful on the browser that paired it, so it stays here in
// localStorage, keyed by our own internal printerId.
import { Order, PrintingConfig } from '../../types';
import {
  BluetoothPrinterTransport,
  PrinterConnectionStatus,
  requestBluetoothPrinter,
  reconnectKnownBluetoothPrinter
} from './bluetoothTransport';
import { buildOrderReceipt, buildTestReceipt, colsForPaperWidth } from './receiptTemplates';
import { AccentMode } from './escpos';
import { buildLogoRaster, LogoRaster } from './logoRaster';

// Cached per logoUrl+paperWidth so re-printing (especially auto-print, once
// per incoming order) doesn't re-download/re-convert the same logo every
// single time. Session-only (in-memory) — a page reload after uploading a
// new logo in Personalização is enough to pick up the change, since the
// logo's storage URL commonly stays the same after a re-upload.
const logoRasterCache = new Map<string, Promise<LogoRaster | null>>();

function getLogoRaster(logoUrl: string | undefined, paperWidth: 58 | 80): Promise<LogoRaster | null> {
  if (!logoUrl) return Promise.resolve(null);
  const key = `${logoUrl}|${paperWidth}`;
  if (!logoRasterCache.has(key)) {
    logoRasterCache.set(key, buildLogoRaster(logoUrl, paperWidth));
  }
  return logoRasterCache.get(key)!;
}

export type PrintJobStatus = 'pendente' | 'imprimindo' | 'impresso' | 'erro';
export type PrintJobKind = 'teste' | 'pedido';

export interface PrintJob {
  id: string;
  kind: PrintJobKind;
  orderId?: string;
  orderCode?: string;
  printerId: string;
  printerName: string;
  status: PrintJobStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

const DEVICE_MAP_KEY = 'zushy_printer_device_map';
const LOG_KEY = 'zushy_print_job_log';
const AUTO_PRINTED_KEY = 'zushy_auto_printed_orders';
const MAX_LOG_ENTRIES = 10;
const MAX_ATTEMPTS = 3;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full/unavailable — the queue keeps working in-memory for
    // this session, it just won't survive a reload. Not fatal.
  }
}

type DeviceMap = Record<string, string>; // printerId -> bluetooth device id

function getDeviceMap(): DeviceMap {
  return readJSON<DeviceMap>(DEVICE_MAP_KEY, {});
}

function setDeviceMapping(printerId: string, deviceId: string) {
  const map = getDeviceMap();
  map[printerId] = deviceId;
  writeJSON(DEVICE_MAP_KEY, map);
}

function clearDeviceMapping(printerId: string) {
  const map = getDeviceMap();
  delete map[printerId];
  writeJSON(DEVICE_MAP_KEY, map);
}

// --- Auto-print dedup (never print the same order twice for the same
// trigger — e.g. a realtime reconnect re-delivering an INSERT event, or two
// browser tabs open on the same account) ---
type AutoPrintedLog = Record<string, ('received' | 'confirmed')[]>;

function wasAutoPrinted(orderId: string, trigger: 'received' | 'confirmed'): boolean {
  const log = readJSON<AutoPrintedLog>(AUTO_PRINTED_KEY, {});
  return (log[orderId] || []).includes(trigger);
}

function markAutoPrinted(orderId: string, trigger: 'received' | 'confirmed') {
  const log = readJSON<AutoPrintedLog>(AUTO_PRINTED_KEY, {});
  log[orderId] = [...(log[orderId] || []), trigger];
  // Cap growth — only the last 500 orders' dedup markers are kept.
  const entries = Object.entries(log);
  if (entries.length > 500) {
    writeJSON(AUTO_PRINTED_KEY, Object.fromEntries(entries.slice(entries.length - 500)));
  } else {
    writeJSON(AUTO_PRINTED_KEY, log);
  }
}

// --- Print log/queue (persisted so a reload never silently drops a job) ---

function loadLog(): PrintJob[] {
  return readJSON<PrintJob[]>(LOG_KEY, []);
}

function isActiveJob(j: PrintJob): boolean {
  return j.status === 'pendente' || j.status === 'imprimindo';
}

// Caps the HISTORY (finished jobs — impresso/erro) at MAX_LOG_ENTRIES, but
// never drops a still-active (pendente/imprimindo) job just for being old —
// a busy printer with a real backlog (e.g. reconnecting after being offline
// for a while) must keep every one of those until it actually prints,
// otherwise "nenhum pedido perdido" would stop being true the moment more
// than MAX_LOG_ENTRIES orders piled up.
function capJobs(allJobs: PrintJob[]): PrintJob[] {
  const recentFinished = allJobs.filter(j => !isActiveJob(j)).slice(-MAX_LOG_ENTRIES);
  const keepIds = new Set([...allJobs.filter(isActiveJob), ...recentFinished].map(j => j.id));
  return allJobs.filter(j => keepIds.has(j.id));
}

function saveLog(currentJobs: PrintJob[]) {
  writeJSON(LOG_KEY, currentJobs);
  const keepIds = new Set(currentJobs.map(j => j.id));
  Array.from(jobBytes.keys()).forEach(id => { if (!keepIds.has(id)) jobBytes.delete(id); });
}

// Each job is one or more byte segments — normally just one, but the logo
// (when printed) is its own leading segment so it can be sent as a separate
// transport write, with a cooldown pause after it (see runJob below).
const jobBytes = new Map<string, Uint8Array[]>();
let jobs: PrintJob[] = loadLog();
const queueListeners = new Set<(jobs: PrintJob[]) => void>();

function emitQueue() {
  jobs = capJobs(jobs);
  saveLog(jobs);
  queueListeners.forEach(cb => cb(jobs));
}

export function subscribeQueue(cb: (jobs: PrintJob[]) => void): () => void {
  queueListeners.add(cb);
  cb(jobs);
  return () => queueListeners.delete(cb);
}

export function getQueueSnapshot(): PrintJob[] {
  return jobs;
}

// --- Live connections ---

const transports = new Map<string, BluetoothPrinterTransport>();
const statusListeners = new Map<string, Set<(status: PrinterConnectionStatus) => void>>();
// Tracks each transport's own last-reported status, 'reconectando' included
// — getPrinterStatus used to derive this from isConnected() alone, which
// can only ever answer 'conectado'/'desconectado' and made a transport that
// was busy retrying internally (after a real mid-session drop) look
// identical to one that had fully given up. That ambiguity is exactly what
// let a naive watchdog/retry call pile a second, competing reconnect
// attempt on top of an already-in-progress one.
const printerStatuses = new Map<string, PrinterConnectionStatus>();

function notifyStatus(printerId: string, status: PrinterConnectionStatus) {
  printerStatuses.set(printerId, status);
  (statusListeners.get(printerId) || new Set()).forEach(cb => cb(status));
}

export function subscribePrinterStatus(printerId: string, cb: (status: PrinterConnectionStatus) => void): () => void {
  if (!statusListeners.has(printerId)) statusListeners.set(printerId, new Set());
  statusListeners.get(printerId)!.add(cb);
  cb(getPrinterStatus(printerId));
  return () => statusListeners.get(printerId)?.delete(cb);
}

export function getPrinterStatus(printerId: string): PrinterConnectionStatus {
  return printerStatuses.get(printerId) ?? 'desconectado';
}

function attachTransport(printerId: string, transport: BluetoothPrinterTransport) {
  transports.set(printerId, transport);
  notifyStatus(printerId, transport.isConnected() ? 'conectado' : 'desconectado');
  transport.onStatusChange(status => notifyStatus(printerId, status));
}

// Pairs a brand-new printer via the browser's native device picker. Caller
// is responsible for creating the PrinterProfile (id/name/role/paperWidth)
// and persisting it in visualConfig — this only handles the Bluetooth side
// and remembers, locally, which device that profile id maps to.
export async function pairNewPrinter(printerId: string): Promise<{ suggestedName: string }> {
  const transport = await requestBluetoothPrinter();
  await transport.connect();
  attachTransport(printerId, transport);
  setDeviceMapping(printerId, transport.deviceId);
  return { suggestedName: transport.deviceName };
}

// Guards reconnectPrinter against ever running twice at once for the same
// printer — e.g. the global "reconnect everything" effect and a manual
// "Conectar" click racing. Without this, the second call would wrap the
// same physical device in a brand-new BluetoothPrinterTransport and
// overwrite the live one in `transports`, orphaning the first (its own
// heartbeat timer keeps running, writing to a characteristic reference
// nothing else uses anymore) — a real duplicate-connection leak, not just
// a wasted network round trip.
const reconnectsInFlight = new Map<string, Promise<boolean>>();

// Silent reconnect to an already-paired printer — no picker, safe to call
// automatically on page load (or navigation) for every saved printer, and
// safe to call repeatedly from the watchdog below. Skips 'reconectando' too,
// not just 'conectado' — that status means an existing transport is already
// retrying on its own (see BluetoothPrinterTransport.attemptReconnect); a
// second call piling a competing attempt on top of it is exactly the
// duplicate-connection bug this whole guard exists to prevent.
export function reconnectPrinter(printerId: string): Promise<boolean> {
  const status = getPrinterStatus(printerId);
  if (status === 'conectado') return Promise.resolve(true);
  if (status === 'reconectando') return Promise.resolve(false);
  const inFlight = reconnectsInFlight.get(printerId);
  if (inFlight) return inFlight;

  const attempt = (async () => {
    const deviceId = getDeviceMap()[printerId];
    if (!deviceId) return false;
    const transport = await reconnectKnownBluetoothPrinter(deviceId);
    if (!transport) return false;
    try {
      await transport.connect();
    } catch {
      return false;
    }
    attachTransport(printerId, transport);
    return true;
  })();

  reconnectsInFlight.set(printerId, attempt);
  attempt.finally(() => reconnectsInFlight.delete(printerId));
  return attempt;
}

// Watchdog: a printer's own BluetoothPrinterTransport already retries
// forever after a *mid-session* drop (see attemptReconnect), and AppContext
// calls reconnectPrinter once for every saved printer on load/config change
// — but that one-shot page-load attempt has no retry of its own if it fails
// once (e.g. the OS Bluetooth stack not fully ready yet, getDevices() not
// yet returning the device, a transient GATT error). Without a backstop,
// that single miss left a printer stuck showing "desconectado" until the
// admin manually clicked Conectar again — which is the actual "não está
// reconectando quando desconecta" bug. This periodically retries every
// printer that's genuinely 'desconectado' (never one already 'reconectando'
// — reconnectPrinter's own guard already skips those) until it's connected.
const RECONNECT_WATCHDOG_INTERVAL_MS = 20000;
let watchedPrinterIds: string[] = [];
let watchdogTimer: ReturnType<typeof setInterval> | null = null;

function runWatchdogSweep() {
  watchedPrinterIds.forEach(id => { reconnectPrinter(id).catch(() => {}); });
}

export function setWatchedPrinters(printerIds: string[]): void {
  watchedPrinterIds = printerIds;
  if (printerIds.length === 0) return;
  if (!watchdogTimer) {
    watchdogTimer = setInterval(runWatchdogSweep, RECONNECT_WATCHDOG_INTERVAL_MS);
  }
  // Also worth an immediate try right now, e.g. right after this printer
  // was just added to the watch list.
  runWatchdogSweep();
}

// Backgrounded/inactive tabs get their timers throttled by the browser, so
// the watchdog interval above can slip badly while the admin is looking at
// something else — check again the instant the tab becomes visible instead
// of waiting for a possibly-delayed tick.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') runWatchdogSweep();
  });
}

export async function disconnectPrinter(printerId: string): Promise<void> {
  const t = transports.get(printerId);
  if (t) await t.disconnect();
}

export function forgetPrinter(printerId: string): void {
  const t = transports.get(printerId);
  if (t) t.disconnect().catch(() => {});
  transports.delete(printerId);
  clearDeviceMapping(printerId);
}

// --- Queue processing ---

function upsertJob(job: PrintJob) {
  const idx = jobs.findIndex(j => j.id === job.id);
  if (idx >= 0) jobs = [...jobs.slice(0, idx), job, ...jobs.slice(idx + 1)];
  else jobs = [...jobs, job];
  emitQueue();
}

// One in-flight print at a time PER PRINTER (a physical Bluetooth link can't
// take two concurrent writes) — this map tracks whether a printer's queue is
// currently being drained so enqueue() only ever kicks off one drain loop.
const draining = new Set<string>();

async function drainPrinterQueue(printerId: string) {
  if (draining.has(printerId)) return;
  draining.add(printerId);
  try {
    while (true) {
      const next = jobs.find(j => j.printerId === printerId && j.status === 'pendente');
      if (!next) break;
      await runJob(next);
    }
  } finally {
    draining.delete(printerId);
  }
}

// Pause between segments (currently: after the logo, before the rest of the
// receipt) so a printer with a weak power supply gets a real recovery
// window after the single most current-hungry thing it's asked to print —
// see the comment on the logo-segment split in receiptTemplates.ts.
const INTER_SEGMENT_COOLDOWN_MS = 400;

async function runJob(job: PrintJob) {
  upsertJob({ ...job, status: 'imprimindo', updatedAt: new Date().toISOString() });
  const transport = transports.get(job.printerId);
  const segments = jobBytes.get(job.id);
  if (!transport || !transport.isConnected() || !segments) {
    failJob(job, !segments ? 'Conteúdo da impressão não está mais disponível — use Reimprimir.' : 'Impressora desconectada.');
    return;
  }
  try {
    for (let i = 0; i < segments.length; i++) {
      await transport.write(segments[i]);
      if (i + 1 < segments.length) await new Promise(resolve => setTimeout(resolve, INTER_SEGMENT_COOLDOWN_MS));
    }
    jobBytes.delete(job.id);
    upsertJob({ ...job, status: 'impresso', updatedAt: new Date().toISOString(), errorMessage: undefined });
  } catch (e: any) {
    failJob(job, e?.message || 'Falha ao enviar dados para a impressora.');
  }
}

function failJob(job: PrintJob, message: string) {
  const attempts = job.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    // Bytes are deliberately kept (not deleted) here — "Tentar novamente" in
    // the queue view re-sends the same payload without rebuilding it.
    upsertJob({ ...job, status: 'erro', attempts, updatedAt: new Date().toISOString(), errorMessage: message });
    return;
  }
  // Reenvio automático — small backoff, back to 'pendente' so drainPrinterQueue picks it up again.
  upsertJob({ ...job, status: 'pendente', attempts, updatedAt: new Date().toISOString(), errorMessage: message });
  setTimeout(() => drainPrinterQueue(job.printerId), 1500 * attempts);
}

function enqueue(job: Omit<PrintJob, 'status' | 'attempts' | 'createdAt' | 'updatedAt'>, bytes: Uint8Array[]) {
  const full: PrintJob = {
    ...job,
    status: 'pendente',
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  jobBytes.set(full.id, bytes);
  upsertJob(full);
  drainPrinterQueue(job.printerId);
}

// On module load, any job stranded mid-flight from a previous page session
// (bytes aren't persisted across reload) is marked as an error rather than
// silently vanishing — "nenhum pedido perdido" means the failure is visible
// and reprintable, not that a stale byte buffer is resurrected.
jobs = capJobs(jobs.map(j => isActiveJob(j) ? { ...j, status: 'erro' as PrintJobStatus, errorMessage: 'Sessão anterior encerrada antes de concluir a impressão.' } : j));
saveLog(jobs);

export async function printTest(
  printerId: string,
  printerName: string,
  establishmentName: string,
  establishmentLogoUrl: string | undefined,
  accentMode: AccentMode,
  paperWidth: 58 | 80,
  printLogoEnabled: boolean = true
) {
  const logo = printLogoEnabled ? await getLogoRaster(establishmentLogoUrl, paperWidth) : null;
  const segments = buildTestReceipt(establishmentName, accentMode, colsForPaperWidth(paperWidth), logo);
  enqueue({ id: crypto.randomUUID(), kind: 'teste', printerId, printerName }, segments.map(s => s.toBytes()));
}

export async function printOrderOnPrinter(
  printerId: string,
  printerName: string,
  order: Order,
  orderCode: string,
  config: PrintingConfig,
  paperWidth: 58 | 80,
  establishmentLogoUrl: string | undefined
) {
  // !== false (not a truthy check) — printingConfig rows saved before this
  // field existed don't have it at all, and a missing field must still mean
  // "on" (the intended default), not silently turn the logo off for every
  // establishment that had already configured printing.
  const logo = config.printLogo !== false ? await getLogoRaster(establishmentLogoUrl, paperWidth) : null;
  const segments = buildOrderReceipt(order, orderCode, config, config.accentMode, colsForPaperWidth(paperWidth), logo);
  enqueue({ id: crypto.randomUUID(), kind: 'pedido', orderId: order.id, orderCode, printerId, printerName }, segments.map(s => s.toBytes()));
}

export function retryJob(jobId: string) {
  const job = jobs.find(j => j.id === jobId);
  if (!job) return;
  upsertJob({ ...job, status: 'pendente', attempts: 0, errorMessage: undefined, updatedAt: new Date().toISOString() });
  drainPrinterQueue(job.printerId);
}

export function hasEverPrintedOrder(orderId: string): boolean {
  return jobs.some(j => j.orderId === orderId && j.status === 'impresso');
}

export { wasAutoPrinted, markAutoPrinted };
