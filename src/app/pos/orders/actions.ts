"use server";

import { revalidatePath } from "next/cache";
import { editOrder, voidOrder } from "@/lib/data/orders";
import { getStaffLabel } from "@/lib/session";
import type { CartLine, PaymentMethod } from "@/lib/types";
import type { EditResult } from "@/components/OrderEditor";

export async function cancelOrderAction(id: string) {
  await voidOrder(id);
  revalidatePath("/pos/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function editOrderAction(
  orderId: string,
  lines: CartLine[],
  paymentMethod: PaymentMethod,
  note: string
): Promise<EditResult> {
  try {
    const editedBy = await getStaffLabel();
    await editOrder({ orderId, lines, paymentMethod, note, editedBy });
    revalidatePath("/pos/orders");
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
