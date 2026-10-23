import { listExpenses } from "@/lib/data/expenses";
import { daysAgoISO, todayISO } from "@/lib/date";
import ExpensesClient from "./ExpensesClient";

export default async function AdminExpensesPage() {
  const expenses = await listExpenses({ from: daysAgoISO(90), to: todayISO() });
  return <ExpensesClient expenses={expenses} />;
}
