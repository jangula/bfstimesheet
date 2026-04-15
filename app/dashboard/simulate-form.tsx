"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function SimulateDayForm() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const advance = (days: number) => {
    startTransition(async () => {
      await fetch("/api/simulate-day", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days }),
      });
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <span className="font-semibold uppercase tracking-wide">Demo clock</span>
      <button
        disabled={pending}
        onClick={() => advance(1)}
        className="rounded border border-amber-300 bg-white px-2 py-1 font-semibold hover:bg-amber-100 disabled:opacity-50"
      >
        +1 day
      </button>
      <button
        disabled={pending}
        onClick={() => advance(7)}
        className="rounded border border-amber-300 bg-white px-2 py-1 font-semibold hover:bg-amber-100 disabled:opacity-50"
      >
        +1 week
      </button>
      <button
        disabled={pending}
        onClick={() => advance(-999)}
        className="rounded border border-amber-300 bg-white px-2 py-1 font-semibold hover:bg-amber-100 disabled:opacity-50"
        title="Reset to 2026-04-13"
      >
        reset
      </button>
    </div>
  );
}
