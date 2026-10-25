import "server-only";
import { supabase } from "@/lib/supabase";
import type { CartLine, Order, OrderWithItems, PaymentMethod } from "@/lib/types";

export type CreateOrderInput = {
  lines: CartLine[];
  paymentMethod: PaymentMethod;
  note?: string;
  createdBy: string;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (input.lines.length === 0) {
    throw new Error("Cannot create an order with no items.");
  }

  const subtotal = input.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      subtotal,
      total: subtotal,
      payment_method: input.paymentMethod,
      note: input.note || null,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

  const { error: itemsError } = await supabase.from("order_items").insert(
    input.lines.map((l) => ({
      order_id: order.id,
      item_id: l.itemId,
      item_name: l.name,
      unit_price: l.unitPrice,
      quantity: l.quantity,
      line_total: l.unitPrice * l.quantity,
    }))
  );

  if (itemsError) {
    // best-effort cleanup so we don't leave an empty order behind
    await supabase.from("orders").delete().eq("id", order.id);
    throw new Error(`Failed to save order items: ${itemsError.message}`);
  }

  return order;
}

export async function listOrders(opts: {
  from?: string; // ISO date (inclusive)
  to?: string; // ISO date (inclusive)
  limit?: number;
} = {}): Promise<Order[]> {
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (opts.from) query = query.gte("created_at", `${opts.from}T00:00:00`);
  if (opts.to) query = query.lte("created_at", `${opts.to}T23:59:59.999`);
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return data ?? [];
}

export async function getOrderWithItems(id: string): Promise<OrderWithItems | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load order: ${error.message}`);
  return data as OrderWithItems | null;
}

export async function voidOrder(id: string): Promise<void> {
  const { error } = await supabase.from("orders").update({ status: "voided" }).eq("id", id);
  if (error) throw new Error(`Failed to void order: ${error.message}`);
}

/** Marks a completed order as returned (e.g. customer refund after serving) — distinct
 * from voiding, which is for orders that should never have counted in the first place. */
export async function returnOrder(id: string): Promise<void> {
  const { error } = await supabase.from("orders").update({ status: "returned" }).eq("id", id);
  if (error) throw new Error(`Failed to mark order as returned: ${error.message}`);
}

export async function listOrdersWithItems(opts: {
  from?: string;
  to?: string;
} = {}): Promise<OrderWithItems[]> {
  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (opts.from) query = query.gte("created_at", `${opts.from}T00:00:00`);
  if (opts.to) query = query.lte("created_at", `${opts.to}T23:59:59.999`);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return (data as OrderWithItems[]) ?? [];
}
