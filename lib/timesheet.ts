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

export async function getOrCreateWeek(userId: string, weekStart: string) {
  const existingRows = await db
    .select()
    .from(timesheetWeeks)
    .where(and(eq(timesheetWeeks.userId, userId), eq(timesheetWeeks.weekStart, weekStart)))
    .limit(1);
  if (existingRows[0]) return existingRows[0];
  const id = randomUUID();
  await db.insert(timesheetWeeks).values({ id, userId, weekStart, status: "draft" });
  const rows = await db.select().from(timesheetWeeks).where(eq(timesheetWeeks.id, id)).limit(1);
  return rows[0]!;
}

export async function getWeekWithEntries(userId: string, weekStart: string) {
  const week = await getOrCreateWeek(userId, weekStart);
  const entries = await db
    .select()
    .from(timesheetEntries)
    .where(eq(timesheetEntries.weekId, week.id));
  return { week, entries };
}

export async function listActiveEngagements() {
  return await db.select().from(engagements).where(eq(engagements.active, true));
}

export async function upsertEntry(
  weekId: string,
  engagementId: string,
  date: string,
  hours: number,
  activityCode: string | null = null,
) {
  const existingRows = await db
    .select()
    .from(timesheetEntries)
    .where(
      and(
        eq(timesheetEntries.weekId, weekId),
        eq(timesheetEntries.engagementId, engagementId),
        eq(timesheetEntries.date, date),
      ),
    )
    .limit(1);
  const existing = existingRows[0];
  if (existing) {
    if (hours <= 0) {
      await db.delete(timesheetEntries).where(eq(timesheetEntries.id, existing.id));
      return;
    }
    await db
      .update(timesheetEntries)
      .set({ hours, activityCode })
      .where(eq(timesheetEntries.id, existing.id));
    return;
  }
  if (hours <= 0) return;
  await db
    .insert(timesheetEntries)
    .values({ id: randomUUID(), weekId, engagementId, date, hours, activityCode });
}

export async function weeksForManager(
  managerId: string,
  status?: "submitted" | "approved" | "rejected" | "draft",
) {
  const reports = await db.select().from(users).where(eq(users.managerId, managerId));
  const reportIds = reports.map((u) => u.id);
  if (reportIds.length === 0) return [];
  const rows = await db
    .select()
    .from(timesheetWeeks)
    .where(
      status
        ? and(inArray(timesheetWeeks.userId, reportIds), eq(timesheetWeeks.status, status))
        : inArray(timesheetWeeks.userId, reportIds),
    );
  const userById = new Map(reports.map((r) => [r.id, r] as const));
  return rows.map((r) => ({ week: r, user: userById.get(r.userId)! }));
}

export async function entriesForWeek(weekId: string) {
  return await db.select().from(timesheetEntries).where(eq(timesheetEntries.weekId, weekId));
}

export async function weeksInRange(fromIso: string, toIso: string) {
  return await db
    .select()
    .from(timesheetWeeks)
    .where(and(gte(timesheetWeeks.weekStart, fromIso), lte(timesheetWeeks.weekStart, toIso)));
}
