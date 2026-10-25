"use server";

import { revalidatePath } from "next/cache";
import { createWastage, deleteWastage, updateWastage, type WastageInput } from "@/lib/data/wastage";
import { getStaffLabel } from "@/lib/session";

function validate(input: WastageInput) {
  if (!input.description.trim()) throw new Error("Description is required.");
  if (!input.category.trim()) throw new Error("Category is required.");
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("Quantity must be at least 1.");
  if (!Number.isFinite(input.estimatedCost) || input.estimatedCost < 0)
    throw new Error("Estimated cost must be a positive number.");
  if (!input.wastageDate) throw new Error("Date is required.");
}

export async function createWastageAction(input: Omit<WastageInput, "createdBy">) {
  validate({ ...input, createdBy: "" });
  const createdBy = await getStaffLabel();
  await createWastage({ ...input, description: input.description.trim(), category: input.category.trim(), createdBy });
  revalidatePath("/admin/wastage");
  revalidatePath("/admin");
}

export async function updateWastageAction(id: string, input: Omit<WastageInput, "createdBy">) {
  validate({ ...input, createdBy: "" });
  await updateWastage(id, {
    ...input,
    description: input.description.trim(),
    category: input.category.trim(),
    createdBy: "",
  });
  revalidatePath("/admin/wastage");
  revalidatePath("/admin");
}

export async function deleteWastageAction(id: string) {
  await deleteWastage(id);
  revalidatePath("/admin/wastage");
  revalidatePath("/admin");
}
