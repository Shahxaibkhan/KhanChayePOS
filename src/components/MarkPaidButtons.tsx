"use client";

import { useState } from "react";
import type { PaymentMethod } from "@/lib/types";
import { formatMoney } from "@/lib/date";
import { markPaidAction } from "@/app/pos/orders/actions";

const METHODS: PaymentMethod[] = ["cash", "card", "online"];

/** "Money received" buttons for a pending order — one tap per payment method. */
export default function MarkPaidButtons({ orderId, total }: { orderId: string; total: number }) {
  const [busy, setBusy] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markPaid(method: PaymentMethod) {
    setBusy(method);
    setError(null);
    const result = await markPaidAction(orderId, method);
    if (!result.ok) setError(result.error);
    setBusy(null);
  }

  return (
    <div>
      <div className="text-xs text-kc-muted mb-2">
        Received {formatMoney(total)}? Mark as paid by:
      </div>
      <div className="flex gap-2">
        {METHODS.map((m) => (
          <button
            key={m}
            disabled={!!busy}
            onClick={() => markPaid(m)}
            className="flex-1 h-10 rounded-xl bg-kc-green/15 text-kc-green text-xs font-semibold uppercase tracking-wide hover:bg-kc-green/25 disabled:opacity-40"
          >
            {busy === m ? "Saving…" : `✓ ${m}`}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-kc-red mt-2">{error}</p>}
    </div>
  );
}
