import { db } from "./db";
import {
  users,
  timesheetWeeks,
  holidays,
  sentEmails,
  policy,
} from "./db/schema";
import { and, eq } from "drizzle-orm";
import { format, parseISO, isWeekend, startOfWeek, subDays } from "date-fns";
import { randomUUID } from "node:crypto";

export type EscalationRun = {
  runDate: string;
  actions: Array<{
    type: "monday_reminder" | "lead_digest" | "month_end_flag";
    to: string;
    toName: string;
    subject: string;
    outstanding?: number;
  }>;
};

function isHoliday(iso: string): boolean {
  return db.select().from(holidays).where(eq(holidays.date, iso)).get() !== undefined;
}

function isWorkingDay(d: Date): boolean {
  if (isWeekend(d)) return false;
  if (isHoliday(format(d, "yyyy-MM-dd"))) return false;
  return true;
}

/** Monday of last completed work week relative to runDate. */
function lastCompletedWeekMonday(runDate: string): string {
  const d = parseISO(runDate);
  // "Last week's Monday" = this week's Monday minus 7
  const thisMonday = startOfWeek(d, { weekStartsOn: 1 });
  const lastMonday = subDays(thisMonday, 7);
  return format(lastMonday, "yyyy-MM-dd");
}

/** Core reusable logic; called by cron and by simulate-day. */
export function runEscalation(runDate: string): EscalationRun {
  const actions: EscalationRun["actions"] = [];
  const d = parseISO(runDate);

  // Skip non-working days entirely
  if (!isWorkingDay(d)) return { runDate, actions };

  const weekMonday = lastCompletedWeekMonday(runDate);
  const allUsers = db.select().from(users).all();
  const policyRow = db.select().from(policy).where(eq(policy.key, "escalation")).get();
  const p = policyRow ? (JSON.parse(policyRow.value) as {
    mondayReminderDow?: number;
    leadDigestDow?: number;
    monthEndDom?: number;
  }) : {};
  const mondayDow = p.mondayReminderDow ?? 1; // Monday
  const leadDow = p.leadDigestDow ?? 3; // Wednesday
  const monthEndDom = p.monthEndDom ?? 28;

  // Determine who still hasn't submitted for weekMonday
  const outstandingByUser = new Map<string, string>(); // userId -> userName
  const outstandingByManager = new Map<string, Array<{ userId: string; userName: string }>>();

  for (const u of allUsers) {
    const w = db
      .select()
      .from(timesheetWeeks)
      .where(and(eq(timesheetWeeks.userId, u.id), eq(timesheetWeeks.weekStart, weekMonday)))
      .get();
    const submitted =
      w && (w.status === "submitted" || w.status === "approved");
    if (!submitted) {
      outstandingByUser.set(u.id, u.name);
      if (u.managerId) {
        const arr = outstandingByManager.get(u.managerId) ?? [];
        arr.push({ userId: u.id, userName: u.name });
        outstandingByManager.set(u.managerId, arr);
      }
    }
  }

  // Day-of-week: JS 0=Sun, 1=Mon, …
  const dow = d.getDay();

  // Monday: gentle reminder to consultants
  if (dow === mondayDow) {
    for (const u of allUsers) {
      if (!outstandingByUser.has(u.id)) continue;
      if (u.role !== "consultant" && u.role !== "lead") continue;
      const subject = `Timesheet reminder · week of ${weekMonday}`;
      const body = `Hi ${u.name},\n\nFriendly reminder to submit your timesheet for the week of ${weekMonday}.\n\nIt takes about two minutes — open the timesheet page, fill in any remaining hours, and click Submit.\n\nThanks,\nBFS Finance`;
      db.insert(sentEmails)
        .values({
          id: randomUUID(),
          toEmail: u.email,
          toName: u.name,
          subject,
          body,
          tier: 1,
          kind: "monday_reminder",
        })
        .run();
      actions.push({ type: "monday_reminder", to: u.email, toName: u.name, subject });
    }
  }

  // Wednesday: digest to engagement leads
  if (dow === leadDow) {
    for (const [managerId, list] of outstandingByManager) {
      const mgr = allUsers.find((u) => u.id === managerId);
      if (!mgr) continue;
      if (mgr.role !== "lead" && mgr.role !== "partner") continue;
      const names = list.map((x) => `  · ${x.userName}`).join("\n");
      const subject = `Outstanding timesheets from your team · ${weekMonday}`;
      const body = `Hi ${mgr.name},\n\nThe following team members still haven't submitted their timesheet for the week of ${weekMonday}:\n\n${names}\n\nA gentle nudge would help us close the books on time.\n\nThanks,\nBFS Finance`;
      db.insert(sentEmails)
        .values({
          id: randomUUID(),
          toEmail: mgr.email,
          toName: mgr.name,
          subject,
          body,
          tier: 2,
          kind: "lead_digest",
        })
        .run();
      actions.push({
        type: "lead_digest",
        to: mgr.email,
        toName: mgr.name,
        subject,
        outstanding: list.length,
      });
    }
  }

  // Month-end: summary flag to partners (always the 28th of the month by default)
  if (d.getDate() === monthEndDom) {
    const partners = allUsers.filter((u) => u.role === "partner");
    for (const partner of partners) {
      const subject = `Month-end compliance summary · ${format(d, "MMMM yyyy")}`;
      const body = `Hi ${partner.name},\n\n${outstandingByUser.size} timesheet${
        outstandingByUser.size === 1 ? "" : "s"
      } remained outstanding for ${weekMonday}.\n\nSee the partner dashboard for the compliance heat map.\n\nBFS Finance`;
      db.insert(sentEmails)
        .values({
          id: randomUUID(),
          toEmail: partner.email,
          toName: partner.name,
          subject,
          body,
          tier: 3,
          kind: "month_end_flag",
        })
        .run();
      actions.push({ type: "month_end_flag", to: partner.email, toName: partner.name, subject });
    }
  }

  return { runDate, actions };
}

export function nonComplianceForWeek(weekStart: string) {
  const all = db.select().from(users).all();
  const out: Array<{ user: (typeof all)[number]; status: string }> = [];
  for (const u of all) {
    const w = db
      .select()
      .from(timesheetWeeks)
      .where(and(eq(timesheetWeeks.userId, u.id), eq(timesheetWeeks.weekStart, weekStart)))
      .get();
    const status = w?.status ?? "missing";
    if (status !== "approved" && status !== "submitted") {
      out.push({ user: u, status });
    }
  }
  return out;
}
