"use server";

import { revalidatePath } from "next/cache";
import { returnOrder, voidOrder } from "@/lib/data/orders";

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
