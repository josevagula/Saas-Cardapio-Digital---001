// Web Bluetooth transport for ESC/POS thermal printers.
//
// HONEST COMPATIBILITY NOTE (read before touching this file): Web Bluetooth
// only talks to Bluetooth LE (GATT) devices. A printer that is Bluetooth
// Classic/SPP-only (common on some older 58mm printers) is NOT reachable
// from any browser — there is no web API for classic RFCOMM sockets. This
// is a browser/OS platform limitation, not something fixable in this app.
// Web Bluetooth is also only implemented in Chromium browsers (Chrome/Edge/
// Opera, desktop + Android) — it does not exist in Safari/iOS at all. Both
// limitations are surfaced to the user in PrintingManager's UI copy instead
// of being silently swallowed.
//
// Compatible with "múltiplas impressoras" (kitchen/counter/delivery): each
// PrinterProfile gets its own BluetoothPrinterTransport instance, and
// nothing here assumes a single global connection.

export type PrinterConnectionStatus = 'conectado' | 'desconectado' | 'reconectando';

export interface PrinterTransport {
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  onStatusChange(cb: (status: PrinterConnectionStatus) => void): () => void;
}

// Known GATT service UUIDs used by generic/off-brand BLE thermal printers in
// the wild. Web Bluetooth only exposes services listed here (or in a scan
// filter) even if the physical device advertises more — a printer using a
// UUID outside this list simply won't be found, which is reported to the
// user as a compatibility gap rather than a silent failure.
const KNOWN_PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // common generic "printer" service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC/Microchip transparent UART (very common in cheap BLE printer modules)
  '0000ff00-0000-1000-8000-00805f9b34fb', // common vendor custom range
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 style BLE UART, used by many generic modules (incl. printers)
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2'  // alternate UART-style printer service seen on some modules
];

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;
}

// Smaller chunks + a bit more breathing room between them than the GATT
// MTU strictly requires — cheap BLE thermal printers draw far more current
// while the head is actively firing dots (a raster image especially) than
// while idle between writes, and a weak internal battery/regulator can brown
// out and power itself off under a long, uninterrupted burst. Trickling the
// data in gives the printer's power supply (and the print head) periodic
// recovery windows instead of one sustained draw for the whole job.
const WRITE_CHUNK_SIZE = 120;
const WRITE_CHUNK_DELAY_MS = 35;
const CONNECT_TIMEOUT_MS = 12000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findWritableCharacteristic(server: BluetoothRemoteGATTServer): Promise<{ characteristic: BluetoothRemoteGATTCharacteristic; withoutResponse: boolean } | null> {
  const services = await server.getPrimaryServices().catch(() => [] as BluetoothRemoteGATTService[]);
  for (const service of services) {
    const characteristics = await service.getCharacteristics().catch(() => [] as BluetoothRemoteGATTCharacteristic[]);
    for (const characteristic of characteristics) {
      if (characteristic.properties.writeWithoutResponse) {
        return { characteristic, withoutResponse: true };
      }
      if (characteristic.properties.write) {
        return { characteristic, withoutResponse: false };
      }
    }
  }
  return null;
}

export class BluetoothPrinterTransport implements PrinterTransport {
  readonly deviceId: string;
  readonly deviceName: string;
  private device: BluetoothDevice;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private writeWithoutResponse = false;
  private status: PrinterConnectionStatus = 'desconectado';
  private listeners = new Set<(status: PrinterConnectionStatus) => void>();
  private reconnectAttempts = 0;
  private manuallyDisconnected = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(device: BluetoothDevice) {
    this.device = device;
    this.deviceId = device.id;
    this.deviceName = device.name || 'Impressora Bluetooth';
    device.addEventListener('gattserverdisconnected', this.handleGattDisconnected);
  }

  isConnected(): boolean {
    return this.status === 'conectado';
  }

  onStatusChange(cb: (status: PrinterConnectionStatus) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private setStatus(status: PrinterConnectionStatus) {
    this.status = status;
    this.listeners.forEach(cb => cb(status));
  }

  async connect(): Promise<void> {
    this.manuallyDisconnected = false;
    if (!this.device.gatt) throw new Error('Este dispositivo não expõe uma conexão GATT.');
    const server = await this.device.gatt.connect();
    const found = await findWritableCharacteristic(server);
    if (!found) {
      server.disconnect();
      throw new Error('Impressora conectada, mas nenhuma característica de escrita compatível foi encontrada (modelo pode não ser suportado).');
    }
    this.characteristic = found.characteristic;
    this.writeWithoutResponse = found.withoutResponse;
    this.reconnectAttempts = 0;
    this.setStatus('conectado');
    this.startHeartbeat();
  }

  async disconnect(): Promise<void> {
    this.manuallyDisconnected = true;
    this.stopHeartbeat();
    this.characteristic = null;
    if (this.device.gatt?.connected) this.device.gatt.disconnect();
    this.setStatus('desconectado');
  }

  // Cheap Bluetooth thermal printers commonly drop the connection after a
  // short idle period (an aggressive power-saving sleep timer, not a real
  // range/interference issue) — this is the #1 real-world cause of
  // "a impressora não fica conectada por muito tempo". A periodic no-op
  // write (ESC @ — the standard ESC/POS "initialize printer" command, safe
  // to send at any time: no visible output, no paper feed) keeps the link
  // active so it never gets the chance to go idle.
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.write(new Uint8Array([0x1B, 0x40])).catch(() => {
        // A failed heartbeat write means the link is already gone — the
        // browser's own 'gattserverdisconnected' event (handled below) is
        // what actually drives reconnection, so nothing else to do here.
      });
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleGattDisconnected = () => {
    this.stopHeartbeat();
    this.characteristic = null;
    if (this.manuallyDisconnected) {
      this.setStatus('desconectado');
      return;
    }
    this.attemptReconnect();
  };

  // Keeps retrying for as long as the page stays open — a printer that only
  // reconnects 3 times before giving up (the previous behavior) is
  // effectively "impressora não fica conectada por muito tempo" all over
  // again after a single bad patch of drops. Backoff is capped, not the
  // attempt count; only an explicit disconnect() stops it.
  //
  // The connect attempt is raced against a timeout — device.gatt.connect()
  // isn't guaranteed to ever settle on every platform/driver when a
  // previously-paired device is intermittently reachable, and a single hung
  // call here would otherwise stall this whole retry loop in 'reconectando'
  // forever (the literal "não está reconectando quando desconecta" bug).
  private async attemptReconnect() {
    this.setStatus('reconectando');
    this.reconnectAttempts += 1;
    const backoffMs = Math.min(15000, 1000 * this.reconnectAttempts);
    await sleep(backoffMs);
    if (this.manuallyDisconnected) return;
    try {
      await Promise.race([
        this.connect(),
        sleep(CONNECT_TIMEOUT_MS).then(() => { throw new Error('Tempo esgotado ao tentar reconectar.'); })
      ]);
    } catch {
      if (!this.manuallyDisconnected) this.attemptReconnect();
    }
  }

  // Serializes every write (real print jobs AND the heartbeat) onto one
  // queue — printService already sends one job at a time per printer, but
  // the heartbeat timer fires independently of that, and two concurrent
  // writes to the same GATT characteristic would interleave their bytes
  // into a corrupted receipt.
  private writeQueue: Promise<void> = Promise.resolve();

  write(data: Uint8Array): Promise<void> {
    const run = this.writeQueue.then(() => this.writeRaw(data));
    this.writeQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  private async writeRaw(data: Uint8Array): Promise<void> {
    if (!this.characteristic) throw new Error('Impressora não conectada.');
    for (let offset = 0; offset < data.length; offset += WRITE_CHUNK_SIZE) {
      const chunk = data.slice(offset, offset + WRITE_CHUNK_SIZE);
      if (this.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
      if (offset + WRITE_CHUNK_SIZE < data.length) await sleep(WRITE_CHUNK_DELAY_MS);
    }
  }
}

// Opens the browser's native device picker (the only UI Web Bluetooth
// allows for discovery — there is no way to render scan results in our own
// list, by design of the API) and returns a transport for whatever the user
// picked.
export async function requestBluetoothPrinter(): Promise<BluetoothPrinterTransport> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Este navegador não suporta Web Bluetooth. Use Google Chrome ou Microsoft Edge no computador ou Android (Safari/iOS não é compatível).');
  }
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: KNOWN_PRINTER_SERVICE_UUIDS
  });
  return new BluetoothPrinterTransport(device);
}

// Silent reconnection to a previously-paired printer (no picker prompt) —
// relies on Chrome's persistent device permissions. Returns null if the
// device is no longer permitted/known (e.g. permission revoked, or a
// different browser/profile), in which case the user must pair again via
// "Conectar Impressora".
export async function reconnectKnownBluetoothPrinter(deviceId: string): Promise<BluetoothPrinterTransport | null> {
  if (!isWebBluetoothSupported() || !navigator.bluetooth.getDevices) return null;
  const known = await navigator.bluetooth.getDevices().catch(() => [] as BluetoothDevice[]);
  const match = known.find(d => d.id === deviceId);
  if (!match) return null;
  return new BluetoothPrinterTransport(match);
}
