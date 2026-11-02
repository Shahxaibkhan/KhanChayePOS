import "server-only";
import { supabase } from "@/lib/supabase";
import { karachiDayEndUTC, karachiDayStartUTC } from "@/lib/date";

export type DashboardStats = {
  salesTotal: number;
  orderCount: number;
  voidedCount: number;
  returnedCount: number;
  expenseTotal: number;
  wastageTotal: number;
  net: number;
  pendingCount: number;
  pendingTotal: number;
  chaiCups: number; // everything sold from the Chaye category
  parcelCups: number;
  itemsSold: number;
  categories: CategorySales[];
};

export type ItemSales = { name: string; quantity: number; parcelQty: number; revenue: number };
export type CategorySales = { category: string; quantity: number; revenue: number; items: ItemSales[] };

// Category whose quantity is reported as "cups of chai".
const CHAI_CATEGORY = "Chaye";

export async function getDashboardStats(from: string, to: string): Promise<DashboardStats> {
  const dayStart = karachiDayStartUTC(from);
  const dayEnd = karachiDayEndUTC(to);

  const [
    { data: orders, error: ordersError },
    { data: statusRows, error: statusError },
    { data: expenses, error: expensesError },
    { data: wastage, error: wastageError },
    { data: lines, error: linesError },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total")
      .eq("status", "completed")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd),
    supabase
      .from("orders")
      .select("status, total")
      .neq("status", "completed")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd),
    supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", from)
      .lte("expense_date", to),
    supabase
      .from("wastage")
      .select("estimated_cost")
      .gte("wastage_date", from)
      .lte("wastage_date", to),
    supabase
      .from("order_items")
      .select("item_name, quantity, parcel_qty, line_total, items(category, sort_order), orders!inner(status, created_at)")
      .eq("orders.status", "completed")
      .gte("orders.created_at", dayStart)
      .lte("orders.created_at", dayEnd),
  ]);

  if (ordersError) throw new Error(`Failed to load sales: ${ordersError.message}`);
  if (statusError) throw new Error(`Failed to load order statuses: ${statusError.message}`);
  if (expensesError) throw new Error(`Failed to load expenses: ${expensesError.message}`);
  if (wastageError) throw new Error(`Failed to load wastage: ${wastageError.message}`);
  if (linesError) throw new Error(`Failed to load top items: ${linesError.message}`);

  const salesTotal = (orders ?? []).reduce((sum, o) => sum + Number(o.total), 0);
  const expenseTotal = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
  const wastageTotal = (wastage ?? []).reduce((sum, w) => sum + Number(w.estimated_cost), 0);
  const voidedCount = (statusRows ?? []).filter((o) => o.status === "voided").length;
  const returnedCount = (statusRows ?? []).filter((o) => o.status === "returned").length;

  const pending = (statusRows ?? []).filter((o) => o.status === "pending");

  // Group every sold line by category, then by item. Lines whose menu item
  // has since been deleted fall under "Other".
  type Row = { item_name: string; quantity: number; parcel_qty: number; line_total: number; items: unknown };
  const byCategory = new Map<string, { order: number; items: Map<string, ItemSales> }>();
  for (const line of (lines ?? []) as Row[]) {
    const item = (Array.isArray(line.items) ? line.items[0] : line.items) as
      | { category: string; sort_order: number }
      | null;
    const category = item?.category ?? "Other";
    const cat = byCategory.get(category) ?? { order: item?.sort_order ?? 9999, items: new Map() };
    cat.order = Math.min(cat.order, item?.sort_order ?? 9999);
    const entry = cat.items.get(line.item_name) ?? { name: line.item_name, quantity: 0, parcelQty: 0, revenue: 0 };
    entry.quantity += line.quantity;
    entry.parcelQty += line.parcel_qty ?? 0;
    entry.revenue += Number(line.line_total);
    cat.items.set(line.item_name, entry);
    byCategory.set(category, cat);
  }
  const categories: CategorySales[] = [...byCategory.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([category, { items }]) => {
      const list = [...items.values()].sort((a, b) => b.quantity - a.quantity);
      return {
        category,
        quantity: list.reduce((s, i) => s + i.quantity, 0),
        revenue: list.reduce((s, i) => s + i.revenue, 0),
        items: list,
      };
    });

  return {
    salesTotal,
    orderCount: (orders ?? []).length,
    voidedCount,
    returnedCount,
    expenseTotal,
    wastageTotal,
    net: salesTotal - expenseTotal - wastageTotal,
    pendingCount: pending.length,
    pendingTotal: pending.reduce((sum, o) => sum + Number(o.total), 0),
    chaiCups: categories.find((c) => c.category === CHAI_CATEGORY)?.quantity ?? 0,
    parcelCups: categories.reduce((s, c) => s + c.items.reduce((t, i) => t + i.parcelQty, 0), 0),
    itemsSold: categories.reduce((s, c) => s + c.quantity, 0),
    categories,
  };
}
