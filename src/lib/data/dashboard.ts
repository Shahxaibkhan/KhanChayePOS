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
  topItems: { name: string; quantity: number; revenue: number }[];
};

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
      .select("status")
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
      .select("item_name, quantity, line_total, orders!inner(status, created_at)")
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

  const byItem = new Map<string, { quantity: number; revenue: number }>();
  for (const line of lines ?? []) {
    const entry = byItem.get(line.item_name) ?? { quantity: 0, revenue: 0 };
    entry.quantity += line.quantity;
    entry.revenue += Number(line.line_total);
    byItem.set(line.item_name, entry);
  }
  const topItems = [...byItem.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);

  return {
    salesTotal,
    orderCount: (orders ?? []).length,
    voidedCount,
    returnedCount,
    expenseTotal,
    wastageTotal,
    net: salesTotal - expenseTotal - wastageTotal,
    topItems,
  };
}
