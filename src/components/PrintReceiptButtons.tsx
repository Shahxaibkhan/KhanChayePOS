"use client";

import { useEffect, useState } from "react";
import type { ReceiptCopy, ReceiptData, StatementData } from "@/lib/receipt";
import {
  connectPrinter,
  getSavedPrinter,
  printMode,
  printReceipt,
  printStatement,
  PrinterNotConnectedError,
} from "@/lib/printer";

const OPTIONS: { label: string; copies: ReceiptCopy[] }[] = [
  { label: "Both copies", copies: ["customer", "shop"] },
  { label: "Customer", copies: ["customer"] },
  { label: "Shop", copies: ["shop"] },
];

/** Pass `data` for a single order's receipt, or `statement` for a client's collective bill. */
export default function PrintReceiptButtons({
  data,
  statement,
  reprint = false,
  compact = false,
}: {
  data?: ReceiptData;
  statement?: StatementData;
  reprint?: boolean;
  compact?: boolean;
}) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Decided after mount — navigator isn't available during server render.
  const [needsConnect, setNeedsConnect] = useState(false);

  useEffect(() => {
    if (printMode() !== "serial") return;
    getSavedPrinter().then((p) => {
      setNeedsConnect(true);
      setConnected(!!p);
    });
  }, []);

  async function connect() {
    setMessage(null);
    try {
      setConnected(await connectPrinter());
    } catch {
      // user closed the port picker
    }
  }

  async function print(label: string, copies: ReceiptCopy[]) {
    setBusy(label);
    setMessage(null);
    try {
      if (statement) await printStatement(statement, copies);
      else if (data) await printReceipt(data, copies, { reprint });
      setMessage({ ok: true, text: `Sent to printer — ${label.toLowerCase()}` });
    } catch (err) {
      if (err instanceof PrinterNotConnectedError) setConnected(false);
      setMessage({
        ok: false,
        text:
          err instanceof Error && !(err instanceof PrinterNotConnectedError)
            ? `Print failed: ${err.message}. Is the printer on and in range?`
            : (err as Error).message,
      });
    } finally {
      setBusy(null);
    }
  }

  const btn = compact
    ? "px-3 py-1.5 rounded-lg text-xs"
    : "flex-1 h-11 rounded-xl text-sm";

  return (
    <div className={compact ? "" : "w-full"}>
      {needsConnect && connected === false ? (
        <button
          onClick={connect}
          className={`${compact ? "px-3 py-1.5 rounded-lg text-xs" : "w-full h-11 rounded-xl text-sm"} bg-kc-gold/15 text-kc-gold-light font-semibold hover:bg-kc-gold/25`}
        >
          🔌 Connect printer
        </button>
      ) : (
        <div className={`flex gap-2 ${compact ? "flex-wrap items-center" : ""}`}>
          {compact && <span className="text-xs text-kc-muted">🖨 Print:</span>}
          {OPTIONS.map((o) => (
            <button
              key={o.label}
              onClick={() => print(o.label, o.copies)}
              disabled={!!busy}
              className={`${btn} font-semibold transition disabled:opacity-40 ${
                o.copies.length === 2
                  ? "bg-kc-cream text-kc-black hover:bg-white"
                  : "bg-kc-charcoal-3 text-kc-cream hover:bg-kc-charcoal-3/70"
              }`}
            >
              {busy === o.label ? "Printing…" : compact ? o.label : `🖨 ${o.label}`}
            </button>
          ))}
        </div>
      )}
      {message && (
        <p className={`text-xs mt-2 ${message.ok ? "text-kc-green" : "text-kc-red"}`}>{message.text}</p>
      )}
      {needsConnect && connected && !compact && (
        <button onClick={connect} className="text-[11px] text-kc-muted hover:text-kc-cream mt-2">
          Change printer
        </button>
      )}
    </div>
  );
}
