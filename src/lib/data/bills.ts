import "server-only";
import { supabase } from "@/lib/supabase";
import type { ClientBill } from "@/lib/types";

/** sql/009_client_bills.sql not run yet — bill history is optional, so don't fail the page. */
const TABLE_MISSING_CODES = new Set(["PGRST205", "42P01"]);

export async function listClientBills(clientId: string, limit = 10): Promise<ClientBill[]> {
  const { data, error } = await supabase
    .from("client_bills")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (TABLE_MISSING_CODES.has(error.code)) return [];
    throw new Error(`Failed to load bills: ${error.message}`);
  }
  return data ?? [];
}

export async function saveClientBill(input: {
  clientId: string;
  orderIds: string[];
  period: string;
  total: number;
  printedBy: string;
}): Promise<void> {
  // Printing both copies, then the customer copy again, is still one bill:
  // skip if the latest bill (last 10 min) has exactly the same orders.
  const [latest] = await listClientBills(input.clientId, 1);
  const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
  if (latest && Date.now() - new Date(latest.created_at).getTime() < 10 * 60_000 && same(latest.order_ids, input.orderIds)) {
    return;
  }

  const { error } = await supabase.from("client_bills").insert({
    client_id: input.clientId,
    order_ids: input.orderIds,
    period: input.period,
    total: input.total,
    printed_by: input.printedBy,
  });
  if (error) {
    if (TABLE_MISSING_CODES.has(error.code)) return; // printing still worked; history just isn't kept
    throw new Error(`Failed to save bill: ${error.message}`);
  }
}
