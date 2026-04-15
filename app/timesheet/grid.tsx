"use client";

import { useMemo, useState, useTransition } from "react";
import { saveDraft, submitWeek } from "./actions";
import { format, parseISO } from "date-fns";
import { cn, formatHours, formatPct } from "@/lib/utils";
import { ACTIVITY_CODES } from "@/lib/activity-codes";

type Engagement = {
  id: string;
  code: string;
  name: string;
  fund: string | null;
  billable: boolean;
};

type EntryLite = {
  engagementId: string;
  date: string;
  hours: number;
  activityCode?: string | null;
};

type Props = {
  week: { id: string; weekStart: string; status: string; rejectionNote: string | null };
  engagements: Engagement[];
  days: string[];
  entries: EntryLite[];
  targetUtilisation: number;
  contractedHours: number;
};

export default function TimesheetGrid({
  week,
  engagements,
  days,
  entries,
  targetUtilisation,
  contractedHours,
}: Props) {
  type Row = { rowId: string; engagementId: string; activityCode: string };

  const { initialRows, initialGrid } = useMemo(() => {
    const rowMap = new Map<string, Row>();
    const g: Record<string, Record<string, number>> = {};
    for (const e of entries) {
      const act = e.activityCode ?? "";
      const rowId = `${e.engagementId}::${act}`;
      if (!rowMap.has(rowId)) {
        rowMap.set(rowId, { rowId, engagementId: e.engagementId, activityCode: act });
      }
      g[rowId] ??= {};
      g[rowId][e.date] = e.hours;
    }
    return { initialRows: Array.from(rowMap.values()), initialGrid: g };
  }, [entries]);

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [grid, setGrid] = useState<Record<string, Record<string, number>>>(initialGrid);
  const [isDirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const makeRowId = (engagementId: string, activityCode: string) => {
    const base = `${engagementId}::${activityCode}`;
    if (!rows.some((r) => r.rowId === base)) return base;
    let i = 2;
    while (rows.some((r) => r.rowId === `${base}#${i}`)) i++;
    return `${base}#${i}`;
  };

  const addEngagement = (engagementId: string) => {
    const rowId = makeRowId(engagementId, "");
    setRows((r) => [...r, { rowId, engagementId, activityCode: "" }]);
    setDirty(true);
  };

  const addActivityToEngagement = (engagementId: string) => {
    const rowId = makeRowId(engagementId, "");
    setRows((r) => [...r, { rowId, engagementId, activityCode: "" }]);
    setDirty(true);
  };

  const removeRow = (rowId: string) => {
    setRows((r) => r.filter((x) => x.rowId !== rowId));
    setGrid((g) => {
      const next = { ...g };
      delete next[rowId];
      return next;
    });
    setDirty(true);
  };

  const setRowActivity = (rowId: string, code: string) => {
    setRows((r) => r.map((x) => (x.rowId === rowId ? { ...x, activityCode: code } : x)));
    setDirty(true);
  };

  const setCell = (rowId: string, date: string, raw: string) => {
    const hours = raw === "" ? 0 : parseFloat(raw);
    if (Number.isNaN(hours) || hours < 0 || hours > 24) return;
    setGrid((g) => {
      const next = { ...g };
      next[rowId] = { ...(next[rowId] ?? {}), [date]: hours };
      return next;
    });
    setDirty(true);
  };

  const totals = useMemo(() => {
    let total = 0;
    let billable = 0;
    const perDay: Record<string, number> = {};
    for (const row of rows) {
      const eng = engagements.find((e) => e.id === row.engagementId);
      if (!eng) continue;
      for (const d of days) {
        const v = grid[row.rowId]?.[d] ?? 0;
        total += v;
        perDay[d] = (perDay[d] ?? 0) + v;
        if (eng.billable) billable += v;
      }
    }
    return { total, billable, perDay, utilisation: total === 0 ? 0 : billable / total };
  }, [grid, rows, days, engagements]);

  const engagementIdsInUse = useMemo(
    () => new Set(rows.map((r) => r.engagementId)),
    [rows],
  );

  const saveAction = (andSubmit: boolean) => {
    const payload = {
      weekId: week.id,
      entries: rows.flatMap((row) =>
        days.map((date) => ({
          engagementId: row.engagementId,
          date,
          hours: grid[row.rowId]?.[date] ?? 0,
          activityCode: row.activityCode || null,
        })),
      ),
    };
    startTransition(async () => {
      const result = await saveDraft(payload);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setDirty(false);
      if (andSubmit) {
        const sub = await submitWeek(week.id);
        setMessage(sub.ok ? "Submitted for approval" : sub.error);
      } else {
        setMessage("Draft saved");
      }
    });
  };

  const readonly = week.status === "submitted" || week.status === "approved";

  return (
    <div>
      {week.status === "rejected" && week.rejectionNote && (
        <div className="mb-4 rounded border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <div className="font-semibold">Returned by your engagement lead</div>
          <div className="mt-1">{week.rejectionNote}</div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2 font-semibold">Engagement</th>
              {days.map((d) => (
                <th key={d} className="px-3 py-2 font-semibold">
                  <div>{format(parseISO(d), "EEE")}</div>
                  <div className="text-[11px] text-slate-400">{format(parseISO(d), "dd MMM")}</div>
                </th>
              ))}
              <th className="px-3 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const eng = engagements.find((e) => e.id === row.engagementId);
              if (!eng) return null;
              const rowTotal = days.reduce((s, d) => s + (grid[row.rowId]?.[d] ?? 0), 0);
              const sameEngCount = rows.filter((r) => r.engagementId === row.engagementId).length;
              return (
                <tr key={row.rowId} className="border-t align-top">
                  <td className="px-4 py-2">
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-1.5 inline-block h-2 w-2 rounded-full",
                          eng.billable ? "bg-emerald-500" : "bg-slate-300",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{eng.code}</div>
                          {!readonly && (
                            <button
                              type="button"
                              onClick={() => removeRow(row.rowId)}
                              className="text-[11px] text-slate-400 hover:text-rose-600"
                              aria-label="Remove row"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {eng.name}
                          {eng.fund ? ` · ${eng.fund}` : ""}
                        </div>
                        <select
                          disabled={readonly}
                          value={row.activityCode}
                          onChange={(e) => setRowActivity(row.rowId, e.target.value)}
                          className="mt-1 w-full rounded border bg-white px-1.5 py-0.5 text-[11px] text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="">Activity…</option>
                          {ACTIVITY_CODES.map((a) => (
                            <option key={a.code} value={a.code}>
                              {a.code} — {a.label}
                            </option>
                          ))}
                        </select>
                        {!readonly && (
                          <button
                            type="button"
                            onClick={() => addActivityToEngagement(row.engagementId)}
                            className="mt-1 text-[11px] text-brand-600 hover:underline"
                          >
                            + activity
                            {sameEngCount > 1 ? ` (${sameEngCount})` : ""}
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  {days.map((d) => {
                    const v = grid[row.rowId]?.[d];
                    return (
                      <td key={d} className="px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          max={24}
                          step={0.25}
                          disabled={readonly}
                          value={v === undefined || v === 0 ? "" : v}
                          onChange={(e) => setCell(row.rowId, d, e.target.value)}
                          className="w-16 rounded border bg-white px-2 py-1 text-right tabular-nums focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-1 text-right font-medium tabular-nums">
                    {formatHours(rowTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <td className="px-4 py-2 font-semibold">Daily total</td>
              {days.map((d) => (
                <td key={d} className="px-3 py-2 text-right font-semibold text-slate-700 tabular-nums">
                  {formatHours(totals.perDay[d] ?? 0)}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">
                {formatHours(totals.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!readonly && (
        <div className="mt-3">
          <details className="rounded border bg-white p-3 text-sm">
            <summary className="cursor-pointer font-medium text-slate-700">
              + Add engagement
            </summary>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {engagements
                .filter((e) => !engagementIdsInUse.has(e.id))
                .map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => addEngagement(e.id)}
                    className="rounded border px-3 py-2 text-left hover:border-brand-500 hover:bg-brand-50"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-block h-2 w-2 rounded-full",
                          e.billable ? "bg-emerald-500" : "bg-slate-300",
                        )}
                      />
                      <span className="font-medium">{e.code}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{e.name}</div>
                  </button>
                ))}
            </div>
          </details>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Total hours" value={formatHours(totals.total)} hint={`${contractedHours} contracted`} />
        <Stat label="Billable" value={formatHours(totals.billable)} hint={`${formatHours(totals.total - totals.billable)} non-billable`} />
        <Stat
          label="Utilisation"
          value={formatPct(totals.utilisation)}
          hint={`target ${formatPct(targetUtilisation)}`}
          tone={totals.utilisation >= targetUtilisation ? "good" : "warn"}
        />
        <Stat label="Status" value={week.status} tone={week.status === "approved" ? "good" : "neutral"} />
      </div>

      {message && (
        <div className="mt-4 text-sm text-slate-700">{message}</div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={readonly || pending}
          onClick={() => saveAction(false)}
          className="rounded border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:text-slate-400"
        >
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          disabled={readonly || pending || totals.total === 0}
          onClick={() => saveAction(true)}
          className="rounded bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
        >
          Submit for approval
        </button>
        {isDirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warn" | "neutral";
}) {
  const color =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : "text-slate-900";
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", color)}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
