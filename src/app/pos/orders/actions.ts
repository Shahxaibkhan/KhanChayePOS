"use server";

import { revalidatePath } from "next/cache";
import { editOrder, markOrderPaid, voidOrder } from "@/lib/data/orders";
import { getStaffLabel } from "@/lib/session";
import type { CartLine, PaymentMethod } from "@/lib/types";
import type { EditResult } from "@/components/OrderEditor";

export async function cancelOrderAction(id: string) {
  await voidOrder(id);
  revalidatePath("/pos", "layout"); // pending badge lives in the POS layout
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function markPaidAction(
  id: string,
  paymentMethod: PaymentMethod
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await markOrderPaid(id, paymentMethod, await getStaffLabel());
    revalidatePath("/pos", "layout"); // pending badge lives in the POS layout
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    revalidatePath("/admin/clients");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function editOrderAction(
  orderId: string,
  lines: CartLine[],
  paymentMethod: PaymentMethod,
  note: string,
  clientName: string
): Promise<EditResult> {
  try {
    const editedBy = await getStaffLabel();
    await editOrder({ orderId, lines, paymentMethod, note, editedBy, clientName });
    revalidatePath("/pos", "layout"); // pending badge lives in the POS layout
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    revalidatePath("/admin/clients");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
