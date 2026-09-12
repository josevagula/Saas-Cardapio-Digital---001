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
const MAX_LOG_ENTRIES = 300;
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

function saveLog(allJobs: PrintJob[]) {
  const trimmed = allJobs.slice(-MAX_LOG_ENTRIES);
  writeJSON(LOG_KEY, trimmed);
  if (trimmed.length < allJobs.length) {
    const keepIds = new Set(trimmed.map(j => j.id));
    Array.from(jobBytes.keys()).forEach(id => { if (!keepIds.has(id)) jobBytes.delete(id); });
  }
}

const jobBytes = new Map<string, Uint8Array>();
let jobs: PrintJob[] = loadLog();
const queueListeners = new Set<(jobs: PrintJob[]) => void>();

function emitQueue() {
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

function notifyStatus(printerId: string, status: PrinterConnectionStatus) {
  (statusListeners.get(printerId) || new Set()).forEach(cb => cb(status));
}

export function subscribePrinterStatus(printerId: string, cb: (status: PrinterConnectionStatus) => void): () => void {
  if (!statusListeners.has(printerId)) statusListeners.set(printerId, new Set());
  statusListeners.get(printerId)!.add(cb);
  cb(getPrinterStatus(printerId));
  return () => statusListeners.get(printerId)?.delete(cb);
}

export function getPrinterStatus(printerId: string): PrinterConnectionStatus {
  const t = transports.get(printerId);
  return t?.isConnected() ? 'conectado' : 'desconectado';
}

function attachTransport(printerId: string, transport: BluetoothPrinterTransport) {
  transports.set(printerId, transport);
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

// Silent reconnect to an already-paired printer — no picker, safe to call
// automatically on page load for every saved printer.
export async function reconnectPrinter(printerId: string): Promise<boolean> {
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

async function runJob(job: PrintJob) {
  upsertJob({ ...job, status: 'imprimindo', updatedAt: new Date().toISOString() });
  const transport = transports.get(job.printerId);
  const bytes = jobBytes.get(job.id);
  if (!transport || !transport.isConnected() || !bytes) {
    failJob(job, !bytes ? 'Conteúdo da impressão não está mais disponível — use Reimprimir.' : 'Impressora desconectada.');
    return;
  }
  try {
    await transport.write(bytes);
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

function enqueue(job: Omit<PrintJob, 'status' | 'attempts' | 'createdAt' | 'updatedAt'>, bytes: Uint8Array) {
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
jobs = jobs.map(j => (j.status === 'pendente' || j.status === 'imprimindo') ? { ...j, status: 'erro' as PrintJobStatus, errorMessage: 'Sessão anterior encerrada antes de concluir a impressão.' } : j);
saveLog(jobs);

export function printTest(printerId: string, printerName: string, establishmentName: string, accentMode: AccentMode, paperWidth: 58 | 80) {
  const builder = buildTestReceipt(establishmentName, accentMode, colsForPaperWidth(paperWidth));
  enqueue({ id: crypto.randomUUID(), kind: 'teste', printerId, printerName }, builder.toBytes());
}

export function printOrderOnPrinter(
  printerId: string,
  printerName: string,
  order: Order,
  orderCode: string,
  config: PrintingConfig,
  paperWidth: 58 | 80
) {
  const builder = buildOrderReceipt(order, orderCode, config, config.accentMode, colsForPaperWidth(paperWidth));
  enqueue({ id: crypto.randomUUID(), kind: 'pedido', orderId: order.id, orderCode, printerId, printerName }, builder.toBytes());
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
