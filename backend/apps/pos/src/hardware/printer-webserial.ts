// WebSerial types aren't in lib.dom by default; use any to keep strict TS elsewhere.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SerialPort = any;

let cached: SerialPort | null = null;

async function getPort(): Promise<SerialPort> {
  if (cached) return cached;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  if (!nav.serial) throw new Error('WebSerial not supported in this browser');
  const ports: SerialPort[] = await nav.serial.getPorts();
  if (ports.length > 0) {
    cached = ports[0];
  } else {
    cached = await nav.serial.requestPort();
  }
  await cached.open({ baudRate: 9600 });
  return cached;
}

/** Force a new printer-pairing permission prompt. Called from Settings UI. */
export async function pairPrinter(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = await (navigator as any).serial.requestPort();
  await p.open({ baudRate: 9600 });
  cached = p;
}

/** Send raw bytes to the paired (or auto-selected) serial printer. */
export async function sendBytes(bytes: Uint8Array): Promise<void> {
  const port = await getPort();
  const writer = port.writable.getWriter();
  try {
    await writer.write(bytes);
  } finally {
    writer.releaseLock();
  }
}

/** True once a port has been opened (from pairPrinter or a prior sendBytes call). */
export function isPaired(): boolean {
  return cached !== null;
}
