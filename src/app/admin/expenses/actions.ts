"use server";

import { revalidatePath } from "next/cache";
import { createExpense, deleteExpense, updateExpense, type ExpenseInput } from "@/lib/data/expenses";
import { getStaffLabel } from "@/lib/session";

function validate(input: ExpenseInput) {
  if (!input.description.trim()) throw new Error("Description is required.");
  if (!input.category.trim()) throw new Error("Category is required.");
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error("Amount must be a positive number.");
  if (!input.expenseDate) throw new Error("Date is required.");
}

export async function createExpenseAction(input: Omit<ExpenseInput, "createdBy">) {
  validate({ ...input, createdBy: "" });
  const createdBy = await getStaffLabel();
  await createExpense({
    ...input,
    description: input.description.trim(),
    category: input.category.trim(),
    createdBy,
  });
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}

export async function updateExpenseAction(id: string, input: Omit<ExpenseInput, "createdBy">) {
  validate({ ...input, createdBy: "" });
  await updateExpense(id, {
    ...input,
    description: input.description.trim(),
    category: input.category.trim(),
    createdBy: "",
  });
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}

export async function deleteExpenseAction(id: string) {
  await deleteExpense(id);
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}
