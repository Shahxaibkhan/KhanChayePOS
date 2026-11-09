"use server";

import { revalidatePath } from "next/cache";
import { saveClientBill } from "@/lib/data/bills";
import { getStaffLabel } from "@/lib/session";

/** Remembers a printed collective bill so it can be reprinted later. */
export async function saveBillAction(
  clientId: string,
  orderIds: string[],
  period: string,
  total: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!orderIds.length) return { ok: true };
    await saveClientBill({ clientId, orderIds, period, total, printedBy: await getStaffLabel() });
    revalidatePath(`/pos/clients/${clientId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
