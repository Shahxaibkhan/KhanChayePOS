"use server";

import { revalidatePath } from "next/cache";
import { createItem, deleteItem, updateItem, type ItemInput } from "@/lib/data/items";

function validate(input: ItemInput) {
  if (!input.name.trim()) throw new Error("Name is required.");
  if (!input.category.trim()) throw new Error("Category is required.");
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error("Price must be a positive number.");
  if (!Number.isFinite(input.cost) || input.cost < 0) throw new Error("Cost must be a positive number.");
}

export async function createItemAction(input: ItemInput) {
  validate(input);
  await createItem({ ...input, name: input.name.trim(), category: input.category.trim() });
  revalidatePath("/admin/items");
  revalidatePath("/pos");
}

export async function updateItemAction(id: string, input: ItemInput) {
  validate(input);
  await updateItem(id, { ...input, name: input.name.trim(), category: input.category.trim() });
  revalidatePath("/admin/items");
  revalidatePath("/pos");
}

export async function deleteItemAction(id: string) {
  await deleteItem(id);
  revalidatePath("/admin/items");
  revalidatePath("/pos");
}
