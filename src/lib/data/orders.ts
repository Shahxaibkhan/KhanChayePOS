import "server-only";
import { supabase } from "@/lib/supabase";
import { PARCEL_FEE_PER_CUP } from "@/lib/constants";
import { karachiDayEndUTC, karachiDayStartUTC } from "@/lib/date";
import { findOrCreateClient } from "@/lib/data/clients";
import type { CartLine, Order, OrderWithItems, PaymentMethod } from "@/lib/types";

function lineTotal(line: CartLine): number {
  return line.unitPrice * line.quantity + line.parcelQty * PARCEL_FEE_PER_CUP;
}

export type CreateOrderInput = {
  lines: CartLine[];
  paymentMethod: PaymentMethod;
  note?: string;
  createdBy: string;
  clientName?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (input.lines.length === 0) {
    throw new Error("Cannot create an order with no items.");
  }
  for (const line of input.lines) {
    if (line.parcelQty < 0 || line.parcelQty > line.quantity) {
      throw new Error(`Invalid parcel quantity for ${line.name}.`);
    }
  }

  const subtotal = input.lines.reduce((sum, l) => sum + lineTotal(l), 0);

  const client = input.clientName?.trim() ? await findOrCreateClient(input.clientName) : null;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      subtotal,
      total: subtotal,
      payment_method: input.paymentMethod,
      note: input.note || null,
      created_by: input.createdBy,
      client_id: client?.id ?? null,
      client_name: client?.name ?? null,
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
      parcel_qty: l.parcelQty,
      parcel_fee: l.parcelQty > 0 ? PARCEL_FEE_PER_CUP : 0,
      line_total: lineTotal(l),
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

  if (opts.from) query = query.gte("created_at", karachiDayStartUTC(opts.from));
  if (opts.to) query = query.lte("created_at", karachiDayEndUTC(opts.to));
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

export type EditOrderInput = {
  orderId: string;
  lines: CartLine[];
  paymentMethod: PaymentMethod;
  note: string;
  editedBy: string;
  clientName?: string;
};

/** Replaces an order's line items and recalculates its total in one DB
 * transaction (see edit_order() in sql/005_order_editing.sql) — never leaves
 * an order with its old items deleted but new ones missing. */
export async function editOrder(input: EditOrderInput): Promise<void> {
  if (input.lines.length === 0) {
    throw new Error("Cannot save an order with no items — cancel it instead.");
  }
  for (const line of input.lines) {
    if (line.parcelQty < 0 || line.parcelQty > line.quantity) {
      throw new Error(`Invalid parcel quantity for ${line.name}.`);
    }
  }

  const items = input.lines.map((l) => ({
    item_id: l.itemId,
    item_name: l.name,
    unit_price: l.unitPrice,
    quantity: l.quantity,
    parcel_qty: l.parcelQty,
    parcel_fee: l.parcelQty > 0 ? PARCEL_FEE_PER_CUP : 0,
    line_total: lineTotal(l),
  }));

  const client = input.clientName?.trim() ? await findOrCreateClient(input.clientName) : null;

  const { error } = await supabase.rpc("edit_order", {
    p_order_id: input.orderId,
    p_items: items,
    p_payment_method: input.paymentMethod,
    p_note: input.note,
    p_editor: input.editedBy,
    p_client_id: client?.id ?? null,
    p_client_name: client?.name ?? null,
  });

  if (error) throw new Error(`Failed to save order changes: ${error.message}`);
}

export async function listOrdersWithItems(opts: {
  from?: string;
  to?: string;
} = {}): Promise<OrderWithItems[]> {
  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (opts.from) query = query.gte("created_at", karachiDayStartUTC(opts.from));
  if (opts.to) query = query.lte("created_at", karachiDayEndUTC(opts.to));

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return (data as OrderWithItems[]) ?? [];
}
