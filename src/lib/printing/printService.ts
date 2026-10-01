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
import { AccentMode, EscPosBuilder } from './escpos';
import { buildLogoRaster, LogoRaster } from './logoRaster';
import { printLog } from './printLog';

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

// Each job is one or more byte segments (logo, header, item chunks, footer —
// see receiptTemplates.ts), each sent as a separate transport write with a
// cooldown pause after it (see runJob below). estimatedPrintMs is how long
// the head needs to physically print that segment, so the pause can start
// when the printing actually ends rather than when the bytes were delivered.
interface JobSegment {
  bytes: Uint8Array;
  estimatedPrintMs: number;
}

function toJobSegments(builders: EscPosBuilder[]): JobSegment[] {
  return builders.map(b => ({ bytes: b.toBytes(), estimatedPrintMs: b.estimatedPrintMs() }));
}

const jobBytes = new Map<string, JobSegment[]>();
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
    if (!deviceId) {
      console.warn(`[printing] reconnectPrinter(${printerId}): nenhum dispositivo Bluetooth salvo para essa impressora.`);
      return false;
    }
    const transport = await reconnectKnownBluetoothPrinter(deviceId);
    if (!transport) {
      console.warn(`[printing] reconnectPrinter(${printerId}): dispositivo ${deviceId} não encontrado entre os pareados conhecidos pelo navegador (navigator.bluetooth.getDevices).`);
      return false;
    }
    try {
      await transport.connect();
    } catch (e: any) {
      console.warn(`[printing] reconnectPrinter(${printerId}): connect() falhou —`, e?.message || e);
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

// Pause between segments so a printer with a weak power supply gets a real
// recovery window between bursts of heating — see the segment split in
// receiptTemplates.ts.
//
// The pause only starts once the segment has (by estimate) finished
// PHYSICALLY printing. Previously it was measured from the end of the BLE
// write, which completes in a fraction of a second while the head goes on
// printing for several more seconds out of the printer's own buffer: the
// next segment was already queued up behind it before the head ever
// stopped, so the "cooldowns" never produced an actual idle moment and the
// whole receipt printed as one continuous, full-draw burst — the exact load
// pattern that browns out these units mid-receipt.
const INTER_SEGMENT_COOLDOWN_MS = 700;

// Same idea between back-to-back jobs (e.g. several orders arriving at
// once): without it the next receipt's bytes landed while the previous one
// was still printing, chaining them into one long uninterrupted burst.
const INTER_JOB_COOLDOWN_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// How long a job is willing to wait, on top of its own retry backoff, for a
// printer that's mid-reconnect (heartbeat drop, watchdog sweep, etc.) to
// come back before treating it as a hard failure. Cheap BLE printers drop
// and silently reconnect on their own within a few seconds all the time —
// without this wait, a job that lands in that exact window used to fail (or,
// for auto-print, be skipped outright — see printBridge.ts) even though the
// same printer would have accepted the job perfectly fine a moment later.
// This is the root cause of receipts that "sometimes print, sometimes
// don't": success depended entirely on not landing in that window.
//
// Sized to comfortably cover one connect() attempt (see CONNECT_TIMEOUT_MS
// in bluetoothTransport.ts) since waitForConnection below now forces that
// attempt to start immediately instead of waiting out whatever backoff the
// transport's own retry loop happened to be sitting on.
const RECONNECT_WAIT_MS = 14000;

// Waits for the printer's status to reach 'conectado', up to timeoutMs.
// Deliberately NOT just `await reconnectPrinter(printerId)` — that call
// no-ops (resolves immediately, without waiting) whenever a reconnect is
// already in flight, which is exactly the common case here (the transport's
// own heartbeat-triggered attemptReconnect, or the periodic watchdog, is
// already retrying).
//
// When a reconnect is already in flight, this doesn't just sit and hope it
// lands in time — a printer that's dropped repeatedly (e.g. a flaky power
// supply) has its own attemptReconnect backoff climbing up to a 15s cap,
// which regularly outlasted the old fixed wait window on its own and made
// an otherwise-about-to-succeed reconnect look like a hard failure to every
// job in the meantime. A real print job waiting is a much stronger signal
// than that fixed schedule, so it cuts the remaining backoff short and
// forces the connect attempt to start right now.
function waitForConnection(printerId: string, timeoutMs: number): Promise<boolean> {
  return new Promise(resolve => {
    if (getPrinterStatus(printerId) === 'conectado') { resolve(true); return; }
    let settled = false;
    let unsubscribe: () => void = () => {};
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve(false);
    }, timeoutMs);
    unsubscribe = subscribePrinterStatus(printerId, status => {
      if (settled || status !== 'conectado') return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(true);
    });
    const existing = transports.get(printerId);
    if (existing && getPrinterStatus(printerId) === 'reconectando') {
      existing.requestImmediateReconnect();
    } else {
      reconnectPrinter(printerId).catch(() => {});
    }
  });
}

function describeJob(job: PrintJob): string {
  return `job ${job.id.slice(0, 8)} (${job.kind}${job.orderCode ? ` ${job.orderCode}` : ''}, impressora "${job.printerName}", tentativa ${job.attempts + 1}/${MAX_ATTEMPTS})`;
}

async function runJob(job: PrintJob) {
  upsertJob({ ...job, status: 'imprimindo', updatedAt: new Date().toISOString() });
  const label = describeJob(job);
  printLog('info', `Início: ${label}`);
  let transport = transports.get(job.printerId);
  if (!transport || !transport.isConnected()) {
    printLog('warn', `Impressora não conectada, aguardando reconexão (até ${RECONNECT_WAIT_MS}ms): ${label}`);
    const connected = await waitForConnection(job.printerId, RECONNECT_WAIT_MS);
    printLog(connected ? 'info' : 'warn', connected ? `Reconectada: ${label}` : `Reconexão não ocorreu a tempo: ${label}`);
    transport = transports.get(job.printerId);
  }
  const segments = jobBytes.get(job.id);
  if (!transport || !transport.isConnected() || !segments) {
    await failJob(job, !segments ? 'Conteúdo da impressão não está mais disponível — use Reimprimir.' : 'Impressora desconectada.');
    return;
  }
  const startedAt = Date.now();
  let i = 0;
  try {
    for (; i < segments.length; i++) {
      const seg = segments[i];
      printLog('info', `Enviando bloco ${i + 1}/${segments.length} (${seg.bytes.length} bytes, impressão estimada ${seg.estimatedPrintMs}ms): ${label}`);
      await transport.write(seg.bytes);
      if (i + 1 < segments.length) await sleep(seg.estimatedPrintMs + INTER_SEGMENT_COOLDOWN_MS);
    }
    jobBytes.delete(job.id);
    upsertJob({ ...job, status: 'impresso', updatedAt: new Date().toISOString(), errorMessage: undefined });
    printLog('info', `Concluído em ${Date.now() - startedAt}ms: ${label}`);
  } catch (e: any) {
    // A write failing here means the printer accepted and physically printed
    // everything up to this point and then stopped mid-job — a real GATT
    // write exception this far in is a mid-print drop, not a pre-flight
    // connectivity gap (that's already handled above via waitForConnection).
    printLog('error', `Falha no bloco ${i + 1}/${segments.length}, ${Date.now() - startedAt}ms após o início (impressora provavelmente desligou/desconectou): ${label}`, e?.message || String(e));
    await failJob(job, e?.message || 'Falha ao enviar dados para a impressora.');
    return;
  }
  // Let the last segment finish printing, plus a rest, before
  // drainPrinterQueue moves on to the next job for this printer.
  await sleep(segments[segments.length - 1].estimatedPrintMs + INTER_JOB_COOLDOWN_MS);
}

async function failJob(job: PrintJob, message: string) {
  const attempts = job.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    printLog('error', `Desistindo após ${attempts} tentativas: ${describeJob(job)}`, message);
    // Bytes are deliberately kept (not deleted) here — "Tentar novamente" in
    // the queue view re-sends the same payload without rebuilding it.
    upsertJob({ ...job, status: 'erro', attempts, updatedAt: new Date().toISOString(), errorMessage: message });
    return;
  }
  printLog('warn', `Nova tentativa em ${1500 * attempts}ms: ${describeJob(job)}`, message);
  upsertJob({ ...job, status: 'pendente', attempts, updatedAt: new Date().toISOString(), errorMessage: message });
  // drainPrinterQueue's loop re-picks this same job (still 'pendente') the
  // instant runJob returns — without actually waiting out this backoff
  // here, a printer that just dropped mid-write (e.g. a brief power dip)
  // got hit with all MAX_ATTEMPTS retries within well under a second,
  // since transport.isConnected() often doesn't flip to false immediately
  // after a failed write. That's retrying in name only: the hardware never
  // got a real chance to recover between attempts, so a job that started
  // printing and then stopped mid-receipt just kept stopping at the same
  // point until it gave up — indistinguishable from not retrying at all.
  await new Promise(resolve => setTimeout(resolve, 1500 * attempts));
}

function enqueue(job: Omit<PrintJob, 'status' | 'attempts' | 'createdAt' | 'updatedAt'>, segments: JobSegment[]) {
  const full: PrintJob = {
    ...job,
    status: 'pendente',
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  jobBytes.set(full.id, segments);
  upsertJob(full);
  drainPrinterQueue(job.printerId);
}

// Records a job as failed outright, without ever having gone through
// enqueue()/drainPrinterQueue — used when something throws while still
// building the receipt (logo download, byte-stream assembly), before there
// was anything to hand a printer. Without this, that failure was an
// uncaught promise rejection nobody saw: no queue entry, no toast, nothing
// — just an order that silently never printed, and for auto-print,
// permanently so (see markAutoPrinted in printBridge.ts, which had already
// fired by the time the failure happened). "Nenhum pedido perdido sem
// rastro" has to hold here too, not just for jobs that make it into the
// queue.
function recordBuildFailure(
  job: Omit<PrintJob, 'status' | 'attempts' | 'createdAt' | 'updatedAt'>,
  message: string
) {
  const now = new Date().toISOString();
  printLog('error', `Falha ao montar o recibo (nada foi enviado à impressora "${job.printerName}")`, message);
  upsertJob({ ...job, status: 'erro', attempts: MAX_ATTEMPTS, createdAt: now, updatedAt: now, errorMessage: message });
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
  printLogoEnabled: boolean = true,
  lowPowerEnabled: boolean = false
) {
  const jobStub = { id: crypto.randomUUID(), kind: 'teste' as PrintJobKind, printerId, printerName };
  try {
    const logo = printLogoEnabled ? await getLogoRaster(establishmentLogoUrl, paperWidth) : null;
    const segments = buildTestReceipt(establishmentName, accentMode, colsForPaperWidth(paperWidth), logo, lowPowerEnabled);
    enqueue(jobStub, toJobSegments(segments));
  } catch (e: any) {
    recordBuildFailure(jobStub, e?.message || 'Falha ao preparar a impressão de teste.');
  }
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
  const jobStub = { id: crypto.randomUUID(), kind: 'pedido' as PrintJobKind, orderId: order.id, orderCode, printerId, printerName };
  try {
    // !== false (not a truthy check) — printingConfig rows saved before this
    // field existed don't have it at all, and a missing field must still
    // mean "on" (the intended default), not silently turn the logo off for
    // every establishment that had already configured printing.
    const logo = config.printLogo !== false ? await getLogoRaster(establishmentLogoUrl, paperWidth) : null;
    const segments = buildOrderReceipt(order, orderCode, config, config.accentMode, colsForPaperWidth(paperWidth), logo, !!config.lowPowerMode);
    enqueue(jobStub, toJobSegments(segments));
  } catch (e: any) {
    recordBuildFailure(jobStub, e?.message || 'Falha ao preparar o recibo para impressão.');
  }
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
