"use client";

import { useState } from "react";
import type { Client } from "@/lib/types";
import type { ClientInput } from "@/lib/data/clients";
import { createClientAction, deleteClientAction, updateClientAction } from "./actions";

const emptyForm: ClientInput = { name: "", phone: null, notes: null };

export default function ClientsClient({ clients }: { clients: Client[] }) {
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="px-5 sm:px-8 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-xl tracking-wide">Clients</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white text-sm font-semibold"
        >
          + Add Client
        </button>
      </div>
      <p className="text-kc-muted text-sm mb-7">
        Regular buyers (shops, offices) staff can tag an order to — also created automatically
        the first time staff types a new name on an order.
      </p>

      <div className="rounded-2xl bg-kc-charcoal-2 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-kc-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-4">Name</th>
              <th className="text-left px-5 py-4">Phone</th>
              <th className="text-left px-5 py-4">Notes</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-kc-charcoal-3">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-kc-muted py-12">
                  No clients yet. Add one, or they'll be created automatically from the POS.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="hover:bg-kc-charcoal-3/50 transition">
                  <td className="px-5 py-4 text-kc-cream">{c.name}</td>
                  <td className="px-5 py-4 text-kc-muted">{c.phone || "—"}</td>
                  <td className="px-5 py-4 text-kc-muted truncate max-w-xs">{c.notes || "—"}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-4">
                      <button onClick={() => setEditing(c)} className="text-xs text-kc-gold-light hover:underline">
                        Edit
                      </button>
                      <button onClick={() => setDeletingId(c.id)} className="text-xs text-kc-red hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <ClientModal
          initial={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {deletingId && (
        <ConfirmDeleteModal
          onCancel={() => setDeletingId(null)}
          onConfirm={async () => {
            await deleteClientAction(deletingId);
            setDeletingId(null);
          }}
        />
      )}
    </div>
  );
}

function ClientModal({ initial, onClose }: { initial?: Client; onClose: () => void }) {
  const [form, setForm] = useState<ClientInput>(
    initial ? { name: initial.name, phone: initial.phone, notes: initial.notes } : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await updateClientAction(initial.id, form);
      } else {
        await createClientAction(form);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-kc-charcoal rounded-3xl p-7 w-full max-w-sm shadow-2xl">
        <h3 className="font-display text-lg mb-5">{initial ? "Edit Client" : "Add Client"}</h3>

        <div className="space-y-4">
          <Field label="Name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              autoFocus
              placeholder="e.g. Dollar Shop"
            />
          </Field>
          <Field label="Phone (optional)">
            <input
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
              placeholder="03xx-xxxxxxx"
            />
          </Field>
          <Field label="Notes (optional)">
            <input
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={inputClass}
              placeholder="e.g. usually pays on account"
            />
          </Field>
        </div>

        {error && <p className="text-xs text-kc-red mt-4">{error}</p>}

        <div className="flex gap-3 mt-7">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-kc-charcoal-2 text-kc-muted hover:text-kc-cream text-sm"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white font-semibold text-sm disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-kc-charcoal rounded-3xl p-7 w-full max-w-sm text-center shadow-2xl">
        <h3 className="font-display text-lg mb-2">Delete this client?</h3>
        <p className="text-kc-muted text-sm mb-7">
          Past orders tagged with them keep showing their name — they just won't be
          suggested anymore.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl bg-kc-charcoal-2 text-kc-muted hover:text-kc-cream text-sm"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setBusy(true);
              await onConfirm();
            }}
            disabled={busy}
            className="flex-1 h-11 rounded-xl bg-kc-red text-white font-semibold text-sm disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full h-11 rounded-xl bg-kc-charcoal-2 px-3.5 text-sm text-kc-cream placeholder:text-kc-muted focus:outline-none focus:ring-2 focus:ring-kc-orange/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-kc-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}
