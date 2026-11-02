// Receipt layout for the 58mm Bluetooth thermal printer.
//
// A receipt is built once as a list of printer "lines" and then rendered
// either to raw ESC/POS bytes (sent straight to the printer — no print
// dialog) or to HTML (fallback for browsers that can't talk to the printer).
import type { OrderWithItems, PaymentMethod } from "@/lib/types";
import { PARCEL_FEE_PER_CUP } from "@/lib/constants";
import { LOGO_BASE64, LOGO_HEIGHT, LOGO_WIDTH } from "@/lib/receiptLogo";

export const SHOP_NAME = "KHAN CHAYE";
// Complaints / orders hotline printed on every receipt.
export const SHOP_PHONE = "0343-4994409";

// 58mm paper, Font A (12x24) = 32 characters per line.
const WIDTH = 32;
const TZ = "Asia/Karachi";

export type ReceiptLine = {
  name: string;
  unitPrice: number;
  quantity: number;
  parcelQty: number;
  parcelFee: number; // per cup, as charged on this order
};

export type ReceiptData = {
  orderNumber: number;
  createdAt: string; // ISO
  createdBy?: string | null;
  clientName?: string | null;
  paymentMethod: PaymentMethod;
  paid: boolean; // false while the order is pending (bill with the waiter)
  note?: string | null;
  lines: ReceiptLine[];
  total: number;
  editedAt?: string | null;
};

export type ReceiptCopy = "customer" | "shop";

export function receiptFromOrder(order: OrderWithItems): ReceiptData {
  return {
    orderNumber: order.order_number,
    createdAt: order.created_at,
    createdBy: order.created_by,
    clientName: order.client_name,
    paymentMethod: order.payment_method,
    paid: order.status !== "pending",
    note: order.note,
    total: Number(order.total),
    editedAt: order.edited_at,
    lines: order.order_items.map((li) => ({
      name: li.item_name,
      unitPrice: Number(li.unit_price),
      quantity: li.quantity,
      parcelQty: li.parcel_qty,
      parcelFee: Number(li.parcel_fee) || PARCEL_FEE_PER_CUP,
    })),
  };
}

// ---------------------------------------------------------------------------
// Line model

type Size = "normal" | "tall" | "double"; // tall = 2x height, double = 2x both

export type PrintLine =
  | { kind: "text"; text: string; align?: "left" | "center" | "right"; bold?: boolean; size?: Size; invert?: boolean }
  | { kind: "rule"; char: string }
  | { kind: "feed"; lines: number }
  | { kind: "logo" };

function money(n: number): string {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmt(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(new Date(iso));
}

// e.g. "02 Nov 26, 7:04 PM"
const stamp = (iso: string) =>
  fmt(iso, { day: "2-digit", month: "short", year: "2-digit", hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());

/** Left and right text on one line, padded to `width`. */
function row(left: string, right: string, width = WIDTH): string {
  const space = width - left.length - right.length;
  if (space >= 1) return left + " ".repeat(space) + right;
  return left.slice(0, Math.max(0, width - right.length - 1)) + " " + right;
}

function wrap(text: string, width = WIDTH): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += " " + word;
    else {
      out.push(line);
      line = word;
    }
    while (line.length > width) {
      out.push(line.slice(0, width));
      line = line.slice(width);
    }
  }
  if (line) out.push(line);
  return out;
}

/** Item / amount on one line; long names wrap with the amount on the last line. */
function itemRows(left: string, right: string): string[] {
  if (left.length + 1 + right.length <= WIDTH) return [row(left, right)];
  const parts = wrap(left, WIDTH - right.length - 1);
  const last = parts.pop()!;
  return [...parts, row(last, right)];
}

// Kept deliberately short to save paper: the customer copy gets the logo and
// complaints line, the shop copy is just the order itself.
export function buildReceipt(data: ReceiptData, copy: ReceiptCopy, opts: { reprint?: boolean } = {}): PrintLine[] {
  const L: PrintLine[] = [];
  const text = (t: string, o: Omit<Extract<PrintLine, { kind: "text" }>, "kind" | "text"> = {}) =>
    L.push({ kind: "text", text: t, ...o });
  const rule = () => L.push({ kind: "rule", char: "-" });

  const itemCount = data.lines.reduce((s, l) => s + l.quantity, 0);
  const label = copy === "customer" ? "CUSTOMER COPY" : "SHOP COPY";

  // Header
  if (copy === "customer") L.push({ kind: "logo" });
  text(SHOP_NAME, { align: "center", bold: true, size: "double" });
  text(` ${label}${opts.reprint ? " - REPRINT" : ""} `, { align: "center", bold: true, invert: true });
  text(row(`Order #${data.orderNumber}`, stamp(data.createdAt)), { bold: true });
  const who = [data.paid ? data.paymentMethod.toUpperCase() : "UNPAID", data.createdBy].filter(Boolean).join(" | ");
  text(row(data.clientName ? `Cust: ${data.clientName}` : "", who));
  rule();

  // Items
  for (const l of data.lines) {
    itemRows(`${l.quantity} ${l.name}`, money(l.unitPrice * l.quantity)).forEach((t) => text(t));
    if (l.parcelQty > 0) text(row(`  +${l.parcelQty} parcel @${money(l.parcelFee)}`, money(l.parcelQty * l.parcelFee)));
  }
  rule();

  // Total
  text(row(`TOTAL (${itemCount} item${itemCount > 1 ? "s" : ""})`, `Rs ${money(data.total)}`), {
    bold: true,
    size: "tall",
  });
  if (!data.paid) text("** PAYMENT PENDING **", { align: "center", bold: true });
  if (data.note) wrap(`Note: ${data.note}`).forEach((t) => text(t));
  if (data.editedAt) text(`Edited ${stamp(data.editedAt)}`);

  // Footer
  if (copy === "customer") {
    rule();
    text("Thank you! Please visit again", { align: "center" });
    text(`Orders/Complaints: ${SHOP_PHONE}`, { align: "center", bold: true });
  }

  return L;
}

// ---------------------------------------------------------------------------
// Collective bill: one receipt covering many orders for a client

export type StatementOrder = { orderNumber: number; createdAt: string; total: number; paid: boolean };

export type StatementData = {
  clientName: string;
  period: string; // e.g. "Today (03 Nov 2026)" or "27 Oct - 03 Nov 2026"
  orders: StatementOrder[];
  lines: ReceiptLine[]; // combined across all orders
  total: number;
  paidTotal: number;
};

/** Builds a collective bill from a client's orders (voided/returned ones are left out). */
export function statementFromOrders(orders: OrderWithItems[], clientName: string, period: string): StatementData {
  const billable = orders
    .filter((o) => o.status === "completed" || o.status === "pending")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Same item at the same price is combined into one line.
  const lines = new Map<string, ReceiptLine>();
  for (const line of billable.flatMap((o) => receiptFromOrder(o).lines)) {
    const key = `${line.name}|${line.unitPrice}|${line.parcelFee}`;
    const existing = lines.get(key);
    if (existing) {
      existing.quantity += line.quantity;
      existing.parcelQty += line.parcelQty;
    } else lines.set(key, { ...line });
  }

  const summary = billable.map((o) => ({
    orderNumber: o.order_number,
    createdAt: o.created_at,
    total: Number(o.total),
    paid: o.status === "completed",
  }));
  return {
    clientName,
    period,
    orders: summary,
    lines: [...lines.values()],
    total: summary.reduce((s, o) => s + o.total, 0),
    paidTotal: summary.filter((o) => o.paid).reduce((s, o) => s + o.total, 0),
  };
}

const shortStamp = (iso: string) =>
  fmt(iso, { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).replace(
    /\b(am|pm)\b/i,
    (m) => m.toUpperCase()
  );

export function buildStatement(data: StatementData, copy: ReceiptCopy): PrintLine[] {
  const L: PrintLine[] = [];
  const text = (t: string, o: Omit<Extract<PrintLine, { kind: "text" }>, "kind" | "text"> = {}) =>
    L.push({ kind: "text", text: t, ...o });
  const rule = () => L.push({ kind: "rule", char: "-" });

  const itemCount = data.lines.reduce((s, l) => s + l.quantity, 0);
  const due = data.total - data.paidTotal;

  // Header
  if (copy === "customer") L.push({ kind: "logo" });
  text(SHOP_NAME, { align: "center", bold: true, size: "double" });
  text(` CLIENT BILL - ${copy === "customer" ? "CUSTOMER" : "SHOP"} COPY `, { align: "center", bold: true, invert: true });
  wrap(`Client: ${data.clientName}`).forEach((t) => text(t, { bold: true }));
  wrap(`Period: ${data.period}`).forEach((t) => text(t));
  text(`Orders: ${data.orders.length}`);
  text(`Printed: ${stamp(new Date().toISOString())}`);
  rule();

  // Combined items
  for (const l of data.lines) {
    itemRows(`${l.quantity} ${l.name}`, money(l.unitPrice * l.quantity)).forEach((t) => text(t));
    if (l.parcelQty > 0) text(row(`  +${l.parcelQty} parcel @${money(l.parcelFee)}`, money(l.parcelQty * l.parcelFee)));
  }
  rule();

  // Totals
  text(row(`TOTAL (${itemCount} item${itemCount === 1 ? "" : "s"})`, `Rs ${money(data.total)}`), { bold: true, size: "tall" });
  if (data.paidTotal > 0) text(row("Paid", money(data.paidTotal)));
  text(row("BALANCE DUE", `Rs ${money(due)}`), { bold: true, size: "tall" });
  rule();

  // Order-by-order list so the client can match it against their slips
  text("ORDERS", { bold: true });
  for (const o of data.orders) {
    text(row(`#${o.orderNumber} ${shortStamp(o.createdAt)}`, `${money(o.total)} ${o.paid ? "PAID" : "DUE "}`));
  }

  // Footer
  if (copy === "customer") {
    rule();
    text("Thank you for your business!", { align: "center" });
    text(`Orders/Complaints: ${SHOP_PHONE}`, { align: "center", bold: true });
  } else {
    rule();
    L.push({ kind: "feed", lines: 1 });
    text("Received by: ____________");
  }

  return L;
}

// ---------------------------------------------------------------------------
// ESC/POS

const ESC = 0x1b;
const GS = 0x1d;

function ascii(s: string): number[] {
  // Thermal printers only have a single-byte code page — drop anything else.
  return [...s.normalize("NFKD")].map((c) => {
    const code = c.charCodeAt(0);
    return code >= 0x20 && code < 0x7f ? code : 0x3f;
  });
}

/** Logo as GS v 0 raster commands, in 24-row bands so small printer buffers keep up. */
function logoRaster(): number[] {
  const bin = atob(LOGO_BASE64);
  const bytesPerRow = LOGO_WIDTH / 8;
  const out: number[] = [];
  for (let y = 0; y < LOGO_HEIGHT; y += 24) {
    const rows = Math.min(24, LOGO_HEIGHT - y);
    out.push(GS, 0x76, 0x30, 0, bytesPerRow & 0xff, bytesPerRow >> 8, rows & 0xff, rows >> 8);
    for (let i = y * bytesPerRow; i < (y + rows) * bytesPerRow; i++) out.push(bin.charCodeAt(i));
  }
  return out;
}

/** Renders one or more receipts (e.g. customer + shop copy) into one print job. */
export function toEscPos(receipts: PrintLine[][]): Uint8Array {
  const b: number[] = [ESC, 0x40]; // init

  receipts.forEach((lines) => {
    for (const line of lines) {
      if (line.kind === "feed") {
        b.push(ESC, 0x64, line.lines);
        continue;
      }
      if (line.kind === "logo") {
        b.push(ESC, 0x61, 1, ...logoRaster());
        continue;
      }
      if (line.kind === "rule") {
        b.push(ESC, 0x61, 0, ...ascii(line.char.repeat(WIDTH)), 0x0a);
        continue;
      }
      const align = line.align === "center" ? 1 : line.align === "right" ? 2 : 0;
      const size = line.size === "double" ? 0x11 : line.size === "tall" ? 0x01 : 0x00;
      b.push(ESC, 0x61, align, ESC, 0x45, line.bold ? 1 : 0, GS, 0x21, size, GS, 0x42, line.invert ? 1 : 0);
      b.push(...ascii(line.text), 0x0a);
      b.push(GS, 0x21, 0, ESC, 0x45, 0, GS, 0x42, 0);
    }
    // Feed past the tear bar, then cut (ignored by printers without a cutter).
    b.push(ESC, 0x64, 3, GS, 0x56, 0x01);
  });

  return new Uint8Array(b);
}

// ---------------------------------------------------------------------------
// HTML fallback (browser print dialog)

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function toHtml(receipts: PrintLine[][]): string {
  const body = receipts
    .map((lines) =>
      lines
        .map((l) => {
          if (l.kind === "feed") return `<div style="height:${l.lines * 1.3}em"></div>`;
          if (l.kind === "logo") return `<div class="center"><img src="/receipt-logo.png" style="width:18mm"></div>`;
          if (l.kind === "rule") return `<div>${esc(l.char.repeat(WIDTH))}</div>`;
          const cls = [l.bold && "b", l.size, l.invert && "inv", l.align].filter(Boolean).join(" ");
          return `<div class="${cls}"><span>${esc(l.text)}</span></div>`;
        })
        .join("")
    )
    .map((r) => `<section>${r}</section>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title><style>
@page { size: 58mm auto; margin: 0; }
html, body { margin: 0; background: #fff; color: #000; }
section { width: 48mm; margin: 0 auto; padding: 2mm 0 6mm; break-after: page; }
section:last-child { break-after: auto; }
div { font: 2.5mm/1.35 "Courier New", monospace; white-space: pre; overflow: hidden; }
.b { font-weight: 700; }
.center { text-align: center; } .right { text-align: right; }
.double { font-size: 5mm; } .tall { font-size: 3.6mm; }
.inv span { background: #000; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>${body}</body></html>`;
}
