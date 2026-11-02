import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient, listClients } from "@/lib/data/clients";
import { listOrdersWithItems } from "@/lib/data/orders";
import { listItems } from "@/lib/data/items";
import { daysAgoISO, formatDate, formatMoney, todayISO } from "@/lib/date";
import { statementFromOrders } from "@/lib/receipt";
import PrintReceiptButtons from "@/components/PrintReceiptButtons";
import OrdersClient from "../../orders/OrdersClient";

const RANGES = [
  { key: "today", label: "Today", daysBack: 0 },
  { key: "7d", label: "7 days", daysBack: 6 },
  { key: "30d", label: "30 days", daysBack: 29 },
  { key: "all", label: "All time", daysBack: null },
] as const;

const STATUSES = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid" },
  { key: "paid", label: "Paid" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];
type StatusKey = (typeof STATUSES)[number]["key"];

/** Every order tagged to one client — reached by tapping a client tag. */
export default async function ClientOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string; status?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const range = RANGES.find((r) => r.key === sp.range) ?? RANGES[3];
  const status = STATUSES.find((s) => s.key === sp.status) ?? STATUSES[0];

  const client = await getClient(id);
  if (!client) notFound();

  const from = range.daysBack !== null ? daysAgoISO(range.daysBack) : null;
  const to = todayISO();
  const [orders, items, clients] = await Promise.all([
    listOrdersWithItems({ clientId: id, ...(from && { from, to }) }),
    listItems(),
    listClients(),
  ]);

  const shown =
    status.key === "paid"
      ? orders.filter((o) => o.status === "completed")
      : status.key === "unpaid"
        ? orders.filter((o) => o.status === "pending")
        : orders;

  // One bill covering every order currently shown (respects the range + paid/unpaid filters).
  const period =
    (from === null ? "All time" : from === to ? `Today (${formatDate(to)})` : `${formatDate(from)} - ${formatDate(to)}`) +
    (status.key === "all" ? "" : ` - ${status.label.toLowerCase()} only`);
  const statement = statementFromOrders(shown, client.name, period);

  const href = (r: RangeKey, s: StatusKey) => `/pos/clients/${id}?range=${r}&status=${s}`;
  const chip = (active: boolean) =>
    `shrink-0 px-4 py-2 rounded-full text-xs font-medium transition ${
      active ? "bg-kc-orange text-white" : "bg-kc-charcoal-2 text-kc-muted hover:text-kc-cream"
    }`;

  const toolbar = (
    <div className="-mt-4 mb-7 space-y-3">
      <div className="text-xs text-kc-muted">
        <Link href="/pos/orders" className="hover:text-kc-cream">
          ‹ Today&apos;s Orders
        </Link>
        {client.phone && <> · {client.phone}</>}
        {client.notes && <> · {client.notes}</>}
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {RANGES.map((r) => (
          <Link key={r.key} href={href(r.key, status.key)} className={chip(r.key === range.key)}>
            {r.label}
          </Link>
        ))}
      </div>
      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <Link key={s.key} href={href(range.key, s.key)} className={chip(s.key === status.key)}>
            {s.label}
          </Link>
        ))}
      </div>
      {statement.orders.length > 0 && (
        <div className="rounded-2xl bg-kc-charcoal-2 px-5 py-4 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-kc-cream">🧾 Collective bill</span>
            <span className="text-xs text-kc-muted">
              {statement.orders.length} orders · {statement.lines.reduce((s, l) => s + l.quantity, 0)} items · Total{" "}
              <span className="text-kc-gold-light">{formatMoney(statement.total)}</span> · Due{" "}
              <span className="text-kc-orange font-semibold">{formatMoney(statement.total - statement.paidTotal)}</span>
            </span>
          </div>
          <PrintReceiptButtons statement={statement} compact />
        </div>
      )}
    </div>
  );

  return (
    <OrdersClient
      orders={shown}
      items={items}
      clients={clients}
      title={client.name}
      toolbar={toolbar}
      emptyText={`No ${status.key === "all" ? "" : status.label.toLowerCase() + " "}orders for ${client.name} (${range.label.toLowerCase()}).`}
      linkClients={false}
    />
  );
}
