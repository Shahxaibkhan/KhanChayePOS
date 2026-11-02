// Sends receipts straight to the Bluetooth thermal printer — no print dialog.
//
//  - Windows/Mac (Chrome or Edge): Web Serial. The printer is paired in
//    Windows Bluetooth settings, which gives it a COM port ("Standard Serial
//    over Bluetooth link"). The user picks that port once via
//    connectPrinter(); Chrome remembers the permission after that.
//  - Android: the RawBT app (Play Store) receives the ESC/POS bytes through
//    an intent link and prints them on the paired printer.
//  - Anything else: falls back to the browser print dialog.
import { buildReceipt, toEscPos, toHtml, type ReceiptCopy, type ReceiptData } from "@/lib/receipt";

// Minimal Web Serial typings (not in TS's DOM lib yet).
type SerialPortLike = {
  open(opts: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  forget?(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
};
type SerialLike = {
  getPorts(): Promise<SerialPortLike[]>;
  requestPort(): Promise<SerialPortLike>;
};

function serial(): SerialLike | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as unknown as { serial?: SerialLike }).serial ?? null;
}

export function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

export type PrintMode = "serial" | "rawbt" | "dialog";

export function printMode(): PrintMode {
  if (isAndroid()) return "rawbt";
  if (serial()) return "serial";
  return "dialog";
}

export async function getSavedPrinter(): Promise<SerialPortLike | null> {
  const s = serial();
  if (!s) return null;
  const ports = await s.getPorts();
  return ports[0] ?? null;
}

/** Asks the user to choose the printer's COM port. Must run from a click. */
export async function connectPrinter(): Promise<boolean> {
  const s = serial();
  if (!s) return false;
  const port = await s.requestPort();
  // Keep only the chosen port so printing never goes to the wrong device.
  for (const other of await s.getPorts()) {
    if (other !== port) await other.forget?.();
  }
  return true;
}

async function writeSerial(port: SerialPortLike, bytes: Uint8Array) {
  await port.open({ baudRate: 9600 });
  try {
    const writer = port.writable!.getWriter();
    try {
      // Small chunks — cheap Bluetooth printers have tiny input buffers.
      for (let i = 0; i < bytes.length; i += 256) {
        await writer.write(bytes.slice(i, i + 256));
        await new Promise((r) => setTimeout(r, 40));
      }
    } finally {
      writer.releaseLock();
    }
    // Give the Bluetooth link time to flush before closing the port.
    await new Promise((r) => setTimeout(r, 400));
  } finally {
    await port.close();
  }
}

function sendToRawBT(bytes: Uint8Array) {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  window.location.href = `intent:base64,${btoa(bin)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}

function printViaDialog(html: string) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    setTimeout(() => frame.remove(), 1000);
  }, 100);
}

export class PrinterNotConnectedError extends Error {
  constructor() {
    super("Printer not connected. Tap “Connect printer” and choose the Bluetooth COM port.");
  }
}

export async function printReceipt(
  data: ReceiptData,
  copies: ReceiptCopy[],
  opts: { reprint?: boolean } = {}
): Promise<void> {
  const receipts = copies.map((c) => buildReceipt(data, c, opts));
  const mode = printMode();

  if (mode === "rawbt") return sendToRawBT(toEscPos(receipts));
  if (mode === "dialog") return printViaDialog(toHtml(receipts));

  const port = await getSavedPrinter();
  if (!port) throw new PrinterNotConnectedError();
  await writeSerial(port, toEscPos(receipts));
}
