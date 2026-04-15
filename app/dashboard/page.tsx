import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getVirtualTodayISO } from "@/lib/clock";
import {
  firmWideUtilisation,
  hoursByEngagement,
  hoursByUser,
  weeklyUtilisationTrend,
} from "@/lib/utilisation";
import { nonComplianceForWeek } from "@/lib/escalation";
import { format, parseISO, startOfWeek, subDays, subMonths } from "date-fns";
import { formatHours, formatPct } from "@/lib/utils";
import { SimulateDayForm } from "./simulate-form";
import EngagementChart from "./engagement-chart";
import TrendChart from "./trend-chart";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/");
  if (user.role !== "partner" && user.role !== "admin") redirect("/timesheet");

  const todayIso = await getVirtualTodayISO();
  const today = parseISO(todayIso);
  const monthStart = format(subMonths(today, 1), "yyyy-MM-dd");
  const monthEnd = todayIso;

  const firm = await firmWideUtilisation(monthStart, monthEnd);
  const engagements = await hoursByEngagement(monthStart, monthEnd);
  const users = await hoursByUser(monthStart, monthEnd);
  const trendStart = format(subMonths(today, 3), "yyyy-MM-dd");
  const trend = await weeklyUtilisationTrend(trendStart, todayIso);

  const lastMonday = format(
    subDays(startOfWeek(today, { weekStartsOn: 1 }), 7),
    "yyyy-MM-dd",
  );
  const nonCompliant = await nonComplianceForWeek(lastMonday);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Partner dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Period: {monthStart} → {monthEnd} · Virtual today {todayIso}
          </p>
        </div>
        <SimulateDayForm />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <KPI
          label="Firm utilisation"
          value={formatPct(firm.utilisation)}
          hint={`${formatHours(firm.billable)} billable of ${formatHours(firm.total)}`}
          tone={firm.utilisation >= 0.7 ? "good" : "warn"}
        />
        <KPI
          label="Total hours"
          value={formatHours(firm.total)}
          hint="past ~30 days"
          tone="neutral"
        />
        <KPI
          label="Billable hours"
          value={formatHours(firm.billable)}
          tone="good"
        />
        <KPI
          label="Non-compliant"
          value={String(nonCompliant.length)}
          hint={`for week ${lastMonday}`}
          tone={nonCompliant.length === 0 ? "good" : "warn"}
        />
      </div>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Weekly utilisation trend · last 12 weeks
        </h2>
        <TrendChart data={trend} target={0.7} />
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="rounded-lg border bg-white p-5 shadow-sm lg:col-span-3">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Hours by engagement
          </h2>
          <EngagementChart
            data={engagements.slice(0, 10).map((e) => ({
              name: e.code,
              hours: Math.round(e.hours),
              billable: e.billable,
            }))}
          />
        </section>

        <section className="rounded-lg border bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Non-compliant · week {lastMonday}
          </h2>
          {nonCompliant.length === 0 ? (
            <div className="rounded border border-dashed p-4 text-center text-xs text-slate-500">
              Everyone submitted. Nicely done.
            </div>
          ) : (
            <ul className="divide-y text-sm">
              {nonCompliant.map(({ user, status }) => (
                <li key={user.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.department}</div>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      status === "missing"
                        ? "bg-rose-100 text-rose-700"
                        : status === "draft"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Top billers
          </h2>
          <Link href="/reports" className="text-xs text-brand-600 hover:underline">
            Detailed reports →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 text-right font-medium">Total</th>
              <th className="pb-2 text-right font-medium">Billable</th>
              <th className="pb-2 text-right font-medium">Utilisation</th>
            </tr>
          </thead>
          <tbody>
            {users.slice(0, 10).map((u) => {
              const util = u.total === 0 ? 0 : u.billable / u.total;
              return (
                <tr key={u.user.id} className="border-t">
                  <td className="py-2">
                    <div className="font-medium">{u.user.name}</div>
                    <div className="text-xs text-slate-500">{u.user.department}</div>
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatHours(u.total)}</td>
                  <td className="py-2 text-right tabular-nums text-emerald-700">
                    {formatHours(u.billable)}
                  </td>
                  <td className={`py-2 text-right tabular-nums ${util >= 0.7 ? "text-emerald-700" : "text-amber-700"}`}>
                    {formatPct(util)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function KPI({
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
    tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
