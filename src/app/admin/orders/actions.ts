"use server";

import { revalidatePath } from "next/cache";
import { editOrder, returnOrder, voidOrder } from "@/lib/data/orders";
import { getStaffLabel } from "@/lib/session";
import type { CartLine, PaymentMethod } from "@/lib/types";
import type { EditResult } from "@/components/OrderEditor";

export async function voidOrderAction(id: string) {
  await voidOrder(id);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/pos/orders");
}

export async function returnOrderAction(id: string) {
  await returnOrder(id);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/pos/orders");
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
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    revalidatePath("/pos/orders");
    revalidatePath("/admin/clients");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
