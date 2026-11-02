"use server";

import { revalidatePath } from "next/cache";
import { createOrder } from "@/lib/data/orders";
import { getStaffLabel } from "@/lib/session";
import type { CartLine } from "@/lib/types";

export type SubmitOrderResult =
  | { ok: true; orderNumber: number; total: number; createdAt: string; createdBy: string; clientName: string | null }
  | { ok: false; error: string };

export async function submitOrderAction(
  lines: CartLine[],
  note: string,
  clientName?: string
): Promise<SubmitOrderResult> {
  try {
    if (!lines.length) return { ok: false, error: "Cart is empty." };
    const createdBy = await getStaffLabel();
    // Saved as pending; the real payment method is chosen when it's marked paid.
    const order = await createOrder({ lines, paymentMethod: "cash", note, createdBy, clientName });
    revalidatePath("/pos/orders");
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/clients");
    return {
      ok: true,
      orderNumber: order.order_number,
      total: Number(order.total),
      createdAt: order.created_at,
      createdBy,
      clientName: order.client_name,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
