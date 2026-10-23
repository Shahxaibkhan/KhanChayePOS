import "server-only";
import { supabase } from "@/lib/supabase";
import type { Expense } from "@/lib/types";

export type ExpenseInput = {
  description: string;
  category: string;
  amount: number;
  expenseDate: string; // YYYY-MM-DD
  createdBy: string;
};

export async function listExpenses(opts: { from?: string; to?: string } = {}): Promise<Expense[]> {
  let query = supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (opts.from) query = query.gte("expense_date", opts.from);
  if (opts.to) query = query.lte("expense_date", opts.to);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load expenses: ${error.message}`);
  return data ?? [];
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      description: input.description,
      category: input.category,
      amount: input.amount,
      expense_date: input.expenseDate,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create expense: ${error.message}`);
  return data;
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase
    .from("expenses")
    .update({
      description: input.description,
      category: input.category,
      amount: input.amount,
      expense_date: input.expenseDate,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update expense: ${error.message}`);
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete expense: ${error.message}`);
}
