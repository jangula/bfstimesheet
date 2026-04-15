import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, engagements, timesheetEntries, timesheetWeeks } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { format, parseISO, subMonths } from "date-fns";
import { formatHours, formatPct } from "@/lib/utils";
import { getVirtualTodayISO } from "@/lib/clock";
import { ACTIVITY_CODES, activityLabel } from "@/lib/activity-codes";

type View = "engagement" | "activity" | "engagement-activity" | "person" | "detail";

const VIEWS: { key: View; label: string }[] = [
  { key: "engagement", label: "By engagement" },
  { key: "activity", label: "By activity" },
  { key: "engagement-activity", label: "Engagement × activity" },
  { key: "person", label: "By person" },
  { key: "detail", label: "Detail" },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    user?: string;
    engagement?: string;
    activity?: string;
    view?: View;
  }>;
}) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/");
  if (user.role !== "partner" && user.role !== "admin") redirect("/timesheet");

  const sp = await searchParams;
  const today = await getVirtualTodayISO();
  const from = sp.from ?? format(subMonths(parseISO(today), 1), "yyyy-MM-dd");
  const to = sp.to ?? today;
  const userFilter = sp.user ?? "";
  const engFilter = sp.engagement ?? "";
  const actFilter = sp.activity ?? "";
  const view: View = sp.view ?? "engagement";

  const allUsers = await db.select().from(users);
  const allEng = await db.select().from(engagements);
  const userById = new Map(allUsers.map((u) => [u.id, u] as const));
  const engById = new Map(allEng.map((e) => [e.id, e] as const));

  const rows = await db
    .select({
      entryId: timesheetEntries.id,
      weekId: timesheetWeeks.id,
      userId: timesheetWeeks.userId,
      engagementId: timesheetEntries.engagementId,
      activityCode: timesheetEntries.activityCode,
      date: timesheetEntries.date,
      hours: timesheetEntries.hours,
      status: timesheetWeeks.status,
    })
    .from(timesheetEntries)
    .innerJoin(timesheetWeeks, eq(timesheetEntries.weekId, timesheetWeeks.id))
    .where(and(gte(timesheetWeeks.weekStart, from), lte(timesheetWeeks.weekStart, to)));

  const filtered = rows.filter(
    (r) =>
      (!userFilter || r.userId === userFilter) &&
      (!engFilter || r.engagementId === engFilter) &&
      (!actFilter || (r.activityCode ?? "") === actFilter),
  );

  const totalHours = filtered.reduce((s, r) => s + r.hours, 0);
  const billableHours = filtered.reduce((s, r) => {
    const e = engById.get(r.engagementId);
    return s + (e?.billable ? r.hours : 0);
  }, 0);

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ from, to });
    if (userFilter) p.set("user", userFilter);
    if (engFilter) p.set("engagement", engFilter);
    if (actFilter) p.set("activity", actFilter);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return p.toString();
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            {filtered.length} entries · {formatHours(totalHours)} total ·{" "}
            {formatHours(billableHours)} billable (
            {formatPct(totalHours === 0 ? 0 : billableHours / totalHours)})
          </p>
        </div>
        <a
          href={`/api/reports/export?${qs({})}`}
          className="rounded bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Export CSV (Sage / VIP format)
        </a>
      </div>

      <form className="mb-4 grid grid-cols-2 gap-3 rounded-lg border bg-white p-4 shadow-sm sm:grid-cols-5">
        <input type="hidden" name="view" value={view} />
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          From
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          To
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Person
          <select
            name="user"
            defaultValue={userFilter}
            className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Engagement
          <select
            name="engagement"
            defaultValue={engFilter}
            className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {allEng.map((e) => (
              <option key={e.id} value={e.id}>
                {e.code}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Activity
          <select
            name="activity"
            defaultValue={actFilter}
            className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {ACTIVITY_CODES.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.label}
              </option>
            ))}
          </select>
        </label>
        <div className="col-span-2 flex justify-end sm:col-span-5">
          <button className="rounded border bg-white px-4 py-1.5 text-sm font-semibold hover:bg-slate-50">
            Apply filters
          </button>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap gap-2 border-b">
        {VIEWS.map((v) => {
          const active = v.key === view;
          return (
            <a
              key={v.key}
              href={`/reports?${qs({ view: v.key })}`}
              className={`-mb-px rounded-t border-b-2 px-4 py-2 text-sm font-medium ${
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {v.label}
            </a>
          );
        })}
      </div>

      {view === "engagement" && (
        <EngagementBudgetTable
          groups={buildEngagementBudgetGroups(filtered, engById, totalHours)}
        />
      )}

      {view === "activity" && (
        <GroupedTable
          columns={["Activity", "Hours", "Billable hrs", "% of total", "Engagements"]}
          rows={buildActivityGroups(filtered, engById, totalHours)}
        />
      )}

      {view === "engagement-activity" && (
        <GroupedTable
          columns={["Engagement", "Activity", "Hours", "% of total"]}
          rows={buildEngagementActivityGroups(filtered, engById, totalHours)}
        />
      )}

      {view === "person" && (
        <GroupedTable
          columns={["Person", "Department", "Hours", "Billable hrs", "Utilisation"]}
          rows={buildPersonGroups(filtered, engById, userById)}
        />
      )}

      {view === "detail" && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 font-semibold">Person</th>
                <th className="px-4 py-2 font-semibold">Engagement</th>
                <th className="px-4 py-2 font-semibold">Activity</th>
                <th className="px-4 py-2 font-semibold">Fund / Client</th>
                <th className="px-4 py-2 text-right font-semibold">Hours</th>
                <th className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((r) => {
                const u = userById.get(r.userId);
                const e = engById.get(r.engagementId);
                return (
                  <tr key={r.entryId} className="border-t">
                    <td className="px-4 py-1.5 tabular-nums text-slate-600">{r.date}</td>
                    <td className="px-4 py-1.5 font-medium">{u?.name}</td>
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            e?.billable ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                        <span className="font-mono text-xs">{e?.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-xs">
                      {r.activityCode ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
                          {r.activityCode}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      <span className="ml-1.5 text-slate-500">
                        {activityLabel(r.activityCode)}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-xs text-slate-500">
                      {e?.fund ?? e?.client ?? "—"}
                    </td>
                    <td className="px-4 py-1.5 text-right tabular-nums">
                      {formatHours(r.hours)}
                    </td>
                    <td className="px-4 py-1.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <div className="border-t bg-slate-50 p-3 text-center text-xs text-slate-500">
              Showing first 200 of {filtered.length}. Export CSV to see everything.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type EntryRow = {
  userId: string;
  engagementId: string;
  activityCode: string | null;
  hours: number;
};

function GroupedTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number)[][];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        No data in this range.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            {columns.map((c, i) => (
              <th
                key={c}
                className={`px-4 py-2 font-semibold ${i >= columns.length - 2 ? "text-right" : ""}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-1.5 ${
                    j >= columns.length - 2 ? "text-right tabular-nums" : ""
                  } ${j === 0 ? "font-medium" : "text-slate-600"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type EngBudgetRow = {
  engId: string;
  label: string;
  fundClient: string;
  billable: boolean;
  hours: number;
  billableHours: number;
  people: number;
  pctOfTotal: number;
  budgetHours: number | null;
  budgetPct: number | null;
};

function buildEngagementBudgetGroups(
  entries: EntryRow[],
  engById: Map<
    string,
    {
      code: string;
      name: string;
      fund: string | null;
      client: string | null;
      billable: boolean;
      budgetHours: number | null;
    }
  >,
  totalHours: number,
): EngBudgetRow[] {
  const m = new Map<
    string,
    { hours: number; billable: number; people: Set<string> }
  >();
  for (const r of entries) {
    const g = m.get(r.engagementId) ?? {
      hours: 0,
      billable: 0,
      people: new Set<string>(),
    };
    g.hours += r.hours;
    if (engById.get(r.engagementId)?.billable) g.billable += r.hours;
    g.people.add(r.userId);
    m.set(r.engagementId, g);
  }
  return Array.from(m.entries())
    .map(([engId, g]) => {
      const eng = engById.get(engId);
      return {
        engId,
        label: eng ? `${eng.code} — ${eng.name}` : engId,
        fundClient: eng?.fund ?? eng?.client ?? "—",
        billable: !!eng?.billable,
        hours: g.hours,
        billableHours: g.billable,
        people: g.people.size,
        pctOfTotal: totalHours === 0 ? 0 : g.hours / totalHours,
        budgetHours: eng?.budgetHours ?? null,
        budgetPct:
          eng?.budgetHours && eng.budgetHours > 0 ? g.hours / eng.budgetHours : null,
      };
    })
    .sort((a, b) => b.hours - a.hours);
}

function EngagementBudgetTable({ groups }: { groups: EngBudgetRow[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        No data in this range.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2 font-semibold">Engagement</th>
            <th className="px-4 py-2 font-semibold">Fund / Client</th>
            <th className="px-4 py-2 text-right font-semibold">Hours</th>
            <th className="px-4 py-2 text-right font-semibold">Billable</th>
            <th className="px-4 py-2 text-right font-semibold">People</th>
            <th className="px-4 py-2 font-semibold">Budget burn</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const pct = g.budgetPct ?? 0;
            const pctClamped = Math.min(pct, 1);
            const over = pct > 1;
            const color =
              pct < 0.75
                ? "bg-emerald-500"
                : pct < 1
                  ? "bg-amber-500"
                  : "bg-rose-600";
            return (
              <tr key={g.engId} className="border-t">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        g.billable ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <span className="font-medium">{g.label}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-xs text-slate-500">{g.fundClient}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatHours(g.hours)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-emerald-700">
                  {formatHours(g.billableHours)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{g.people}</td>
                <td className="px-4 py-2">
                  {g.budgetHours == null ? (
                    <span className="text-xs text-slate-400">no budget</span>
                  ) : (
                    <div>
                      <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
                        <div
                          className={`h-full ${color}`}
                          style={{ width: `${pctClamped * 100}%` }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-slate-500 tabular-nums">
                        <span>
                          {formatHours(g.hours)} / {formatHours(g.budgetHours)} h
                        </span>
                        <span className={over ? "font-semibold text-rose-700" : ""}>
                          {formatPct(pct)}
                          {over ? " over" : ""}
                        </span>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildActivityGroups(
  entries: EntryRow[],
  engById: Map<string, { billable: boolean }>,
  totalHours: number,
) {
  const m = new Map<string, { hours: number; billable: number; engs: Set<string> }>();
  for (const r of entries) {
    const key = r.activityCode ?? "";
    const g = m.get(key) ?? { hours: 0, billable: 0, engs: new Set<string>() };
    g.hours += r.hours;
    if (engById.get(r.engagementId)?.billable) g.billable += r.hours;
    g.engs.add(r.engagementId);
    m.set(key, g);
  }
  return Array.from(m.entries())
    .map(([code, g]) => [
      code ? `${code} — ${activityLabel(code)}` : "— Unspecified",
      formatHours(g.hours),
      formatHours(g.billable),
      formatPct(totalHours === 0 ? 0 : g.hours / totalHours),
      g.engs.size,
    ] as (string | number)[])
    .sort((a, b) => Number(b[1]) - Number(a[1]));
}

function buildEngagementActivityGroups(
  entries: EntryRow[],
  engById: Map<string, { code: string; name: string }>,
  totalHours: number,
) {
  const m = new Map<string, { engId: string; code: string; hours: number }>();
  for (const r of entries) {
    const code = r.activityCode ?? "";
    const key = `${r.engagementId}::${code}`;
    const g = m.get(key) ?? { engId: r.engagementId, code, hours: 0 };
    g.hours += r.hours;
    m.set(key, g);
  }
  return Array.from(m.values())
    .sort((a, b) => b.hours - a.hours)
    .map((g) => {
      const eng = engById.get(g.engId);
      return [
        eng ? `${eng.code} — ${eng.name}` : g.engId,
        g.code ? `${g.code} — ${activityLabel(g.code)}` : "— Unspecified",
        formatHours(g.hours),
        formatPct(totalHours === 0 ? 0 : g.hours / totalHours),
      ] as (string | number)[];
    });
}

function buildPersonGroups(
  entries: EntryRow[],
  engById: Map<string, { billable: boolean }>,
  userById: Map<string, { name: string; department: string }>,
) {
  const m = new Map<string, { hours: number; billable: number }>();
  for (const r of entries) {
    const g = m.get(r.userId) ?? { hours: 0, billable: 0 };
    g.hours += r.hours;
    if (engById.get(r.engagementId)?.billable) g.billable += r.hours;
    m.set(r.userId, g);
  }
  return Array.from(m.entries())
    .map(([uid, g]) => {
      const u = userById.get(uid);
      return [
        u?.name ?? uid,
        u?.department ?? "—",
        formatHours(g.hours),
        formatHours(g.billable),
        formatPct(g.hours === 0 ? 0 : g.billable / g.hours),
      ] as (string | number)[];
    })
    .sort((a, b) => Number(b[2]) - Number(a[2]));
}
