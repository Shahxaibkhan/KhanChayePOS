"use client";

import { useMemo, useRef, useState } from "react";
import type { Client } from "@/lib/types";

export default function ClientPicker({
  clients,
  value,
  onChange,
}: {
  clients: Client[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    const pool = query ? clients.filter((c) => c.name.toLowerCase().includes(query)) : clients;
    return pool.slice(0, 6);
  }, [clients, value]);

  const exactMatch = clients.some((c) => c.name.toLowerCase() === value.trim().toLowerCase());
  const willCreateNew = value.trim().length > 0 && !exactMatch;

  function select(name: string) {
    onChange(name);
    setOpen(false);
  }

  function handleBlur() {
    // delay so a click on a suggestion registers before the list unmounts
    blurTimeout.current = setTimeout(() => setOpen(false), 150);
  }

  function handleFocus() {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setOpen(true);
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Client (optional) — e.g. Dollar Shop"
        className="w-full h-11 rounded-xl bg-kc-charcoal-2 px-4 text-sm placeholder:text-kc-muted focus:outline-none focus:ring-2 focus:ring-kc-orange/50"
      />
      {value && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-kc-muted hover:text-kc-red text-xs"
          title="Clear"
        >
          ✕
        </button>
      )}

      {open && (suggestions.length > 0 || willCreateNew) && (
        <div className="absolute z-10 mt-1.5 w-full rounded-xl bg-kc-charcoal-3 shadow-xl overflow-hidden">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(c.name)}
              className="w-full text-left px-4 py-2.5 text-sm text-kc-cream hover:bg-kc-charcoal-2 transition"
            >
              {c.name}
            </button>
          ))}
          {willCreateNew && (
            <div
              className={`px-4 py-2.5 text-xs text-kc-gold-light ${suggestions.length > 0 ? "border-t border-kc-charcoal-2" : ""}`}
            >
              ↵ will add “{value.trim()}” as a new client
            </div>
          )}
        </div>
      )}
    </div>
  );
}
