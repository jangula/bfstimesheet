import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { timesheetWeeks, timesheetEntries, engagements, users } from "@/lib/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { totalsForWeek } from "@/lib/utilisation";
import { approveWeek, rejectWeek } from "./actions";
import { format, parseISO } from "date-fns";
import { formatHours, formatPct } from "@/lib/utils";

export default async function ApprovalsPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/");
  if (user.role === "consultant") redirect("/timesheet");

  // Partners/admin see everyone submitted; leads see their direct reports.
  let weeks: Array<{ id: string; userId: string; weekStart: string; submittedAt: Date | null }> = [];

  if (user.role === "partner" || user.role === "admin") {
    const rows = await db
      .select()
      .from(timesheetWeeks)
      .where(eq(timesheetWeeks.status, "submitted"))
      .orderBy(desc(timesheetWeeks.submittedAt));
    weeks = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      weekStart: r.weekStart,
      submittedAt: r.submittedAt ?? null,
    }));
  } else {
    const directReports = await db.select().from(users).where(eq(users.managerId, user.id));
    const ids = directReports.map((u) => u.id);
    if (ids.length) {
      const rows = await db
        .select()
        .from(timesheetWeeks)
        .where(and(eq(timesheetWeeks.status, "submitted"), inArray(timesheetWeeks.userId, ids)))
        .orderBy(desc(timesheetWeeks.submittedAt));
      weeks = rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        weekStart: r.weekStart,
        submittedAt: r.submittedAt ?? null,
      }));
    }
  }

  const allUsers = await db.select().from(users);
  const userById = new Map(allUsers.map((u) => [u.id, u] as const));
  const allEng = await db.select().from(engagements);
  const engById = new Map(allEng.map((e) => [e.id, e] as const));

  const cards = await Promise.all(
    weeks.map(async (w) => {
      const u = userById.get(w.userId)!;
      const totals = await totalsForWeek(w.id);
      const entries = await db
        .select()
        .from(timesheetEntries)
        .where(eq(timesheetEntries.weekId, w.id));
      return { week: w, u, totals, entries };
    }),
  );

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Approval queue</h1>
          <p className="mt-1 text-sm text-slate-600">
            {cards.length} submitted {cards.length === 1 ? "week" : "weeks"} awaiting review
          </p>
        </div>
      </div>

      {cards.length === 0 && (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center text-sm text-slate-500">
          Nothing to approve right now.
        </div>
      )}

      <div className="space-y-4">
        {cards.map(({ week, u, totals, entries }) => (
          <div key={week.id} className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{u.name}</div>
                <div className="text-xs text-slate-500">
                  {u.department} · Week of {week.weekStart}
                  {week.submittedAt && ` · submitted ${format(week.submittedAt, "dd MMM HH:mm")}`}
                </div>
              </div>
              <div className="flex gap-3 text-right text-xs">
                <div>
                  <div className="uppercase tracking-wide text-slate-500">Total</div>
                  <div className="font-semibold tabular-nums">{formatHours(totals.total)}h</div>
                </div>
                <div>
                  <div className="uppercase tracking-wide text-slate-500">Billable</div>
                  <div className="font-semibold tabular-nums text-emerald-600">
                    {formatHours(totals.billable)}h
                  </div>
                </div>
                <div>
                  <div className="uppercase tracking-wide text-slate-500">Utilisation</div>
                  <div
                    className={`font-semibold tabular-nums ${
                      totals.utilisation >= u.targetUtilisationPct ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {formatPct(totals.utilisation)}
                  </div>
                </div>
              </div>
            </div>

            <table className="mt-4 w-full text-xs">
              <thead className="text-slate-500">
                <tr className="border-b">
                  <th className="py-1 text-left font-medium">Engagement</th>
                  <th className="py-1 text-right font-medium">Hours</th>
                  <th className="py-1 text-right font-medium">Billable</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  entries.reduce<Record<string, number>>((acc, e) => {
                    acc[e.engagementId] = (acc[e.engagementId] ?? 0) + e.hours;
                    return acc;
                  }, {}),
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([engId, hours]) => {
                    const eng = engById.get(engId);
                    return (
                      <tr key={engId} className="border-b last:border-0">
                        <td className="py-1">
                          <span className="font-medium">{eng?.code}</span>
                          <span className="ml-2 text-slate-500">{eng?.name}</span>
                        </td>
                        <td className="py-1 text-right tabular-nums">{formatHours(hours)}</td>
                        <td className="py-1 text-right">{eng?.billable ? "●" : "○"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <form action={approveWeek}>
                <input type="hidden" name="weekId" value={week.id} />
                <button
                  type="submit"
                  className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Approve
                </button>
              </form>
              <form action={rejectWeek} className="flex items-center gap-2">
                <input type="hidden" name="weekId" value={week.id} />
                <input
                  name="note"
                  placeholder="Reason (returned to consultant)"
                  required
                  className="w-80 rounded border px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  className="rounded border border-rose-300 bg-white px-4 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Return
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
