import { db } from "./db";
import { timesheetWeeks, timesheetEntries, engagements, users } from "./db/schema";
import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { addDays, format, parseISO, startOfWeek } from "date-fns";

export function mondayOf(iso: string): string {
  return format(startOfWeek(parseISO(iso), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function weekDays(weekStart: string): string[] {
  const d = parseISO(weekStart);
  return Array.from({ length: 5 }, (_, i) => format(addDays(d, i), "yyyy-MM-dd"));
}

export function getOrCreateWeek(userId: string, weekStart: string) {
  const existing = db
    .select()
    .from(timesheetWeeks)
    .where(and(eq(timesheetWeeks.userId, userId), eq(timesheetWeeks.weekStart, weekStart)))
    .get();
  if (existing) return existing;
  const id = randomUUID();
  db.insert(timesheetWeeks)
    .values({ id, userId, weekStart, status: "draft" })
    .run();
  return db.select().from(timesheetWeeks).where(eq(timesheetWeeks.id, id)).get()!;
}

export function getWeekWithEntries(userId: string, weekStart: string) {
  const week = getOrCreateWeek(userId, weekStart);
  const entries = db
    .select()
    .from(timesheetEntries)
    .where(eq(timesheetEntries.weekId, week.id))
    .all();
  return { week, entries };
}

export function listActiveEngagements() {
  return db.select().from(engagements).where(eq(engagements.active, true)).all();
}

export function upsertEntry(
  weekId: string,
  engagementId: string,
  date: string,
  hours: number,
  activityCode: string | null = null,
) {
  const existing = db
    .select()
    .from(timesheetEntries)
    .where(
      and(
        eq(timesheetEntries.weekId, weekId),
        eq(timesheetEntries.engagementId, engagementId),
        eq(timesheetEntries.date, date),
      ),
    )
    .get();
  if (existing) {
    if (hours <= 0) {
      db.delete(timesheetEntries).where(eq(timesheetEntries.id, existing.id)).run();
      return;
    }
    db.update(timesheetEntries)
      .set({ hours, activityCode })
      .where(eq(timesheetEntries.id, existing.id))
      .run();
    return;
  }
  if (hours <= 0) return;
  db.insert(timesheetEntries)
    .values({ id: randomUUID(), weekId, engagementId, date, hours, activityCode })
    .run();
}

export function weeksForManager(managerId: string, status?: "submitted" | "approved" | "rejected" | "draft") {
  const reports = db.select().from(users).where(eq(users.managerId, managerId)).all();
  const reportIds = reports.map((u) => u.id);
  if (reportIds.length === 0) return [];
  const rows = db
    .select()
    .from(timesheetWeeks)
    .where(
      status
        ? and(inArray(timesheetWeeks.userId, reportIds), eq(timesheetWeeks.status, status))
        : inArray(timesheetWeeks.userId, reportIds),
    )
    .all();
  const userById = new Map(reports.map((r) => [r.id, r] as const));
  return rows.map((r) => ({ week: r, user: userById.get(r.userId)! }));
}

export function entriesForWeek(weekId: string) {
  return db.select().from(timesheetEntries).where(eq(timesheetEntries.weekId, weekId)).all();
}

export function weeksInRange(fromIso: string, toIso: string) {
  return db
    .select()
    .from(timesheetWeeks)
    .where(and(gte(timesheetWeeks.weekStart, fromIso), lte(timesheetWeeks.weekStart, toIso)))
    .all();
}
