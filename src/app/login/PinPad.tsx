"use client";

import { useState, useTransition } from "react";

export default function PinPad({
  action,
  next,
}: {
  action: (formData: FormData) => void;
  next: string;
}) {
  const [pin, setPin] = useState("");
  const [pending, startTransition] = useTransition();
  const maxLen = 8;

  function press(digit: string) {
    if (pin.length >= maxLen) return;
    setPin((p) => p + digit);
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  function submit() {
    if (!pin || pending) return;
    const fd = new FormData();
    fd.set("pin", pin);
    fd.set("next", next);
    startTransition(() => action(fd));
  }

  return (
    <div className="w-full max-w-xs">
      <div className="flex items-center justify-center gap-3 mb-8">
        {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full transition-colors ${
              i < pin.length ? "bg-kc-orange" : "bg-kc-charcoal-3"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => press(d)}
            className="h-16 rounded-2xl bg-kc-charcoal-2 text-xl font-semibold text-kc-cream hover:bg-kc-charcoal-3 active:scale-95 transition"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={backspace}
          className="h-16 rounded-2xl bg-kc-charcoal-2 text-sm text-kc-muted hover:text-kc-red active:scale-95 transition"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={() => press("0")}
          className="h-16 rounded-2xl bg-kc-charcoal-2 text-xl font-semibold text-kc-cream hover:bg-kc-charcoal-3 active:scale-95 transition"
        >
          0
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!pin || pending}
          className="h-16 rounded-2xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white font-semibold disabled:opacity-40 active:scale-95 transition"
        >
          {pending ? "…" : "Go"}
        </button>
      </div>
    </div>
  );
}
