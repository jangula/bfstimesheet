import { requireUser } from "@/lib/auth";
import { getVirtualTodayISO } from "@/lib/clock";
import {
  getWeekWithEntries,
  listActiveEngagements,
  mondayOf,
  weekDays,
} from "@/lib/timesheet";
import { redirect } from "next/navigation";
import TimesheetGrid from "./grid";
import { addDays, format, parseISO } from "date-fns";
import Link from "next/link";

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/");

  const sp = await searchParams;
  const today = await getVirtualTodayISO();
  const weekStart = mondayOf(sp.week ?? today);
  const { week, entries } = await getWeekWithEntries(user.id, weekStart);
  const engagements = await listActiveEngagements();
  const days = weekDays(weekStart);

  const prev = format(addDays(parseISO(weekStart), -7), "yyyy-MM-dd");
  const next = format(addDays(parseISO(weekStart), 7), "yyyy-MM-dd");

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My timesheet</h1>
          <p className="mt-1 text-sm text-slate-600">
            Week of <span className="font-medium">{weekStart}</span> · Target utilisation{" "}
            {Math.round(user.targetUtilisationPct * 100)}%
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/timesheet?week=${prev}`}
            className="rounded border bg-white px-3 py-1.5 hover:bg-slate-50"
          >
            ← Previous
          </Link>
          <Link
            href={`/timesheet?week=${next}`}
            className="rounded border bg-white px-3 py-1.5 hover:bg-slate-50"
          >
            Next →
          </Link>
        </div>
      </div>

      <TimesheetGrid
        week={{
          id: week.id,
          weekStart,
          status: week.status,
          rejectionNote: week.rejectionNote ?? null,
        }}
        engagements={engagements.map((e) => ({
          id: e.id,
          code: e.code,
          name: e.name,
          fund: e.fund,
          billable: e.billable,
        }))}
        days={days}
        entries={entries.map((e) => ({
          engagementId: e.engagementId,
          date: e.date,
          hours: e.hours,
          activityCode: e.activityCode ?? null,
        }))}
        targetUtilisation={user.targetUtilisationPct}
        contractedHours={user.contractedHoursPerWeek}
      />
    </div>
  );
}
