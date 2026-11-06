import type { StockMovement } from "@/lib/data/inventory";
import { formatDateTime } from "@/lib/date";
import { formatQty } from "@/lib/qty";

/** Recent deliveries and stock counts. */
export default function StockHistory({ movements }: { movements: StockMovement[] }) {
  if (!movements.length) return <p className="text-kc-muted text-sm">No deliveries or counts recorded yet.</p>;
  return (
    <div className="rounded-2xl bg-kc-charcoal-2 divide-y divide-kc-charcoal-3">
      {movements.map((m) => (
        <div key={m.id} className="flex items-center gap-3 px-5 py-3 text-sm">
          <span className="w-20 shrink-0 text-xs text-kc-muted">{formatDateTime(m.created_at)}</span>
          <span className="flex-1 min-w-0 truncate text-kc-cream">
            {m.ingredients?.name ?? "—"}
            <span className="text-kc-muted text-xs">
              {" "}
              · {m.reason === "restock" ? "delivery" : "stock count"} by {m.created_by ?? "—"}
              {m.note && <> · {m.note}</>}
            </span>
          </span>
          <span className={`shrink-0 font-medium ${m.change >= 0 ? "text-kc-green" : "text-kc-red"}`}>
            {m.change >= 0 ? "+" : ""}
            {formatQty(m.change, m.ingredients?.unit ?? "")}
          </span>
        </div>
      ))}
    </div>
  );
}
