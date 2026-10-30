import "server-only";
import { supabase } from "@/lib/supabase";
import { normalizeClientName } from "@/lib/clientName";
import type { Client } from "@/lib/types";

/** Codes Postgres/PostgREST return when the `clients` table doesn't exist yet
 * (e.g. sql/006_clients.sql hasn't been run). Page loads shouldn't go down
 * app-wide just because one optional feature's migration is pending. */
const TABLE_MISSING_CODES = new Set(["PGRST205", "42P01"]);

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("name", { ascending: true });
  if (error) {
    if (TABLE_MISSING_CODES.has(error.code)) {
      console.error(
        "clients table not found — run sql/006_clients.sql in Supabase. Client tagging disabled for now."
      );
      return [];
    }
    throw new Error(`Failed to load clients: ${error.message}`);
  }
  return data ?? [];
}

export type ClientInput = {
  name: string;
  phone: string | null;
  notes: string | null;
};

export async function createClient(input: ClientInput): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert({ name: input.name, phone: input.phone, notes: input.notes })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to create client: ${error.message}`);
  return data;
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update({ name: input.name, phone: input.phone, notes: input.notes })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Failed to update client: ${error.message}`);
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete client: ${error.message}`);
}

/**
 * Looks up a client by name — ignoring case, spacing and punctuation, so
 * "Dollar Shop" / "dollarshop" / "DOLLAR-SHOP" all resolve to the same
 * client — and creates it if nothing matches. This is what lets staff just
 * type/pick a client name on an order with no separate "add client" step.
 *
 * Returns null (rather than throwing) if the `clients` table doesn't exist
 * yet — a missing migration for this optional tag shouldn't block placing
 * an order at all.
 */
export async function findOrCreateClient(rawName: string): Promise<Client | null> {
  const name = rawName.trim();
  const target = normalizeClientName(name);

  const { data: all, error: findError } = await supabase.from("clients").select("*");
  if (findError) {
    if (TABLE_MISSING_CODES.has(findError.code)) {
      console.error("clients table not found — run sql/006_clients.sql in Supabase. Order placed without a client tag.");
      return null;
    }
    throw new Error(`Failed to look up client: ${findError.message}`);
  }

  const existing = (all ?? []).find((c) => normalizeClientName(c.name) === target);
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("clients")
    .insert({ name })
    .select("*")
    .single();

  if (createError) {
    // Unique violation — someone else created the same (or a normalized-
    // equivalent) client between our lookup and insert. Re-fetch instead of
    // erroring out.
    if (createError.code === "23505") {
      const { data: all2, error: retryError } = await supabase.from("clients").select("*");
      const retry = (all2 ?? []).find((c) => normalizeClientName(c.name) === target);
      if (retryError || !retry) throw new Error(`Failed to resolve client "${name}".`);
      return retry;
    }
    throw new Error(`Failed to create client: ${createError.message}`);
  }

  return created;
}
