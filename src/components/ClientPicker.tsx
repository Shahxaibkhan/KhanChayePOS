"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Client } from "@/lib/types";
import { normalizeClientName } from "@/lib/clientName";

export default function ClientPicker({
  clients,
  value,
  onChange,
}: {
  clients: Client[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const suggestions = useMemo(() => {
    const q = normalizeClientName(query);
    const pool = q ? clients.filter((c) => normalizeClientName(c.name).includes(q)) : clients;
    return pool.slice(0, 6);
  }, [clients, query]);

  const exactMatch = clients.some((c) => normalizeClientName(c.name) === normalizeClientName(query));
  const canCreate = query.trim().length > 0 && !exactMatch;

  function selectExisting(name: string) {
    onChange(name);
    setEditing(false);
    setQuery("");
  }

  function createNew() {
    if (!canCreate) return;
    onChange(query.trim());
    setEditing(false);
    setQuery("");
  }

  function startEditing() {
    setQuery("");
    setEditing(true);
  }

  // Already tagged — show it as a pill, not an open text field, so it reads
  // like a chosen tag rather than something still being typed.
  if (!editing && value) {
    return (
      <div className="flex items-center justify-between bg-kc-charcoal-2 rounded-xl pl-4 pr-2 h-11">
        <span className="text-sm text-kc-gold-light truncate">🏷️ {value}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={startEditing}
            className="px-2.5 py-1 text-xs text-kc-muted hover:text-kc-cream"
          >
            Change
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            className="px-2.5 py-1 text-xs text-kc-muted hover:text-kc-red"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className="w-full h-11 rounded-xl bg-kc-charcoal-2 px-4 text-sm text-kc-muted text-left hover:text-kc-cream transition"
      >
        + Add client (optional)
      </button>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setEditing(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (suggestions.length > 0 && normalizeClientName(suggestions[0].name) === normalizeClientName(query)) {
              selectExisting(suggestions[0].name);
            } else if (canCreate) {
              createNew();
            }
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
        placeholder="Search or add a client…"
        className="w-full h-11 rounded-xl bg-kc-charcoal-2 px-4 text-sm placeholder:text-kc-muted focus:outline-none focus:ring-2 focus:ring-kc-orange/50"
      />

      <div className="absolute z-10 mt-1.5 w-full rounded-xl bg-kc-charcoal-3 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
        {suggestions.map((c) => (
          <button
            key={c.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => selectExisting(c.name)}
            className="w-full text-left px-4 py-2.5 text-sm text-kc-cream hover:bg-kc-charcoal-2 transition"
          >
            {c.name}
          </button>
        ))}

        {canCreate && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={createNew}
            className={`w-full text-left px-4 py-2.5 text-sm text-kc-gold-light hover:bg-kc-charcoal-2 transition ${
              suggestions.length > 0 ? "border-t border-kc-charcoal-2" : ""
            }`}
          >
            + Add “{query.trim()}” as a new client
          </button>
        )}

        {suggestions.length === 0 && !canCreate && (
          <div className="px-4 py-2.5 text-xs text-kc-muted">Type a name to search or add a client.</div>
        )}
      </div>
    </div>
  );
}
