"use client";

import { useState } from "react";
import type { ClientBill, OrderWithItems } from "@/lib/types";
import { formatDate, formatDateTime, formatMoney } from "@/lib/date";
import { statementFromOrders } from "@/lib/receipt";
import { saveBillAction } from "@/app/pos/clients/[id]/actions";
import PrintReceiptButtons from "@/components/PrintReceiptButtons";

export type BillHistoryEntry = { bill: ClientBill; orders: OrderWithItems[] };

/**
 * A client's collective bill for the orders ticked in the list, plus the
 * bills printed before so any of them can be reprinted.
 */
export default function CollectiveBillPanel({
  clientId,
  clientName,
  period,
  billable,
  selected,
  setSelected,
  history,
}: {
  clientId: string;
  clientName: string;
  period: string; // the page's filter, used when every order shown is ticked
  billable: OrderWithItems[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  history: BillHistoryEntry[];
}) {
  const [openBill, setOpenBill] = useState<string | null>(null);
  const picked = billable.filter((o) => selected.has(o.id));
  const all = picked.length === billable.length;

  const dates = picked.map((o) => o.created_at).sort();
  const billPeriod = all
    ? period
    : dates.length
      ? `${picked.length} selected orders, ${formatDate(dates[0])}` +
        (formatDate(dates[0]) !== formatDate(dates[dates.length - 1]) ? ` - ${formatDate(dates[dates.length - 1])}` : "")
      : "";
  const statement = statementFromOrders(picked, clientName, billPeriod);

  if (!billable.length && !history.length) return null;

  return (
    <div className="-mt-3 mb-7 rounded-2xl bg-kc-charcoal-2 px-5 py-4 space-y-3">
      {billable.length > 0 && (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-kc-cream">🧾 Collective bill</span>
            <span className="text-xs text-kc-muted">
              {picked.length} of {billable.length} orders ticked ·{" "}
              <button onClick={() => setSelected(new Set(billable.map((o) => o.id)))} className="hover:text-kc-cream underline">
                All
              </button>{" "}
              ·{" "}
              <button
                onClick={() => setSelected(new Set(billable.filter((o) => o.status === "pending").map((o) => o.id)))}
                className="hover:text-kc-cream underline"
              >
                Unpaid
              </button>{" "}
              ·{" "}
              <button onClick={() => setSelected(new Set())} className="hover:text-kc-cream underline">
                None
              </button>
            </span>
          </div>
          {picked.length > 0 ? (
            <>
              <div className="text-xs text-kc-muted">
                {statement.lines.reduce((s, l) => s + l.quantity, 0)} items · Total{" "}
                <span className="text-kc-gold-light">{formatMoney(statement.total)}</span> · Due{" "}
                <span className="text-kc-orange font-semibold">{formatMoney(statement.total - statement.paidTotal)}</span>
              </div>
              <PrintReceiptButtons
                statement={statement}
                compact
                onPrinted={() => saveBillAction(clientId, picked.map((o) => o.id), billPeriod, statement.total)}
              />
            </>
          ) : (
            <p className="text-xs text-kc-muted">Tick the orders to put on the bill.</p>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className={billable.length ? "pt-3 border-t border-kc-charcoal-3" : ""}>
          <div className="text-xs text-kc-muted uppercase tracking-wide mb-2">Printed bills</div>
          <div className="space-y-2">
            {history.map(({ bill, orders }) => {
              const s = statementFromOrders(orders, clientName, bill.period);
              const dropped = bill.order_ids.length - s.orders.length;
              const open = openBill === bill.id;
              return (
                <div key={bill.id} className="text-xs">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-kc-cream">{formatDateTime(bill.created_at)}</span>
                    <span className="text-kc-muted">
                      {s.orders.length} orders · {formatMoney(s.total)}
                      {s.total > s.paidTotal ? (
                        <span className="text-kc-orange"> · due {formatMoney(s.total - s.paidTotal)}</span>
                      ) : (
                        <span className="text-kc-green"> · all paid</span>
                      )}
                      {dropped > 0 && <> · {dropped} cancelled since</>}
                    </span>
                    <button
                      onClick={() => setOpenBill(open ? null : bill.id)}
                      className="ml-auto text-kc-gold-light hover:underline"
                    >
                      {open ? "Close" : "↺ Reprint"}
                    </button>
                  </div>
                  <div className="text-kc-muted truncate">{bill.period}</div>
                  {open && (
                    <div className="mt-2">
                      {s.orders.length ? (
                        <PrintReceiptButtons statement={s} reprint compact />
                      ) : (
                        <span className="text-kc-muted">All orders on this bill were cancelled.</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
