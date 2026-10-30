"use server";

import { revalidatePath } from "next/cache";
import { createClient, deleteClient, updateClient, type ClientInput } from "@/lib/data/clients";

function validate(input: ClientInput) {
  if (!input.name.trim()) throw new Error("Name is required.");
}

export async function createClientAction(input: ClientInput) {
  validate(input);
  await createClient({
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  revalidatePath("/admin/clients");
  revalidatePath("/pos");
  revalidatePath("/pos/orders");
}

export async function updateClientAction(id: string, input: ClientInput) {
  validate(input);
  await updateClient(id, {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  revalidatePath("/admin/clients");
  revalidatePath("/pos");
  revalidatePath("/pos/orders");
}

export async function deleteClientAction(id: string) {
  await deleteClient(id);
  revalidatePath("/admin/clients");
  revalidatePath("/pos");
  revalidatePath("/pos/orders");
}
