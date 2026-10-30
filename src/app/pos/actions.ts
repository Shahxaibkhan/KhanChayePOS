"use server";

import { revalidatePath } from "next/cache";
import { createOrder } from "@/lib/data/orders";
import { getStaffLabel } from "@/lib/session";
import type { CartLine, PaymentMethod } from "@/lib/types";

export type SubmitOrderResult =
  | { ok: true; orderNumber: number; total: number }
  | { ok: false; error: string };

export async function submitOrderAction(
  lines: CartLine[],
  paymentMethod: PaymentMethod,
  note: string,
  clientName?: string
): Promise<SubmitOrderResult> {
  try {
    if (!lines.length) return { ok: false, error: "Cart is empty." };
    const createdBy = await getStaffLabel();
    const order = await createOrder({ lines, paymentMethod, note, createdBy, clientName });
    revalidatePath("/pos/orders");
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/clients");
    return { ok: true, orderNumber: order.order_number, total: Number(order.total) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
