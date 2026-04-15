import { db } from "./db";
import { timesheetEntries, engagements, timesheetWeeks, users } from "./db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

export type WeekTotals = {
  total: number;
  billable: number;
  nonBillable: number;
  utilisation: number; // 0..1
  byEngagement: Record<string, number>;
};

export async function totalsForWeek(weekId: string): Promise<WeekTotals> {
  const rows = await db
    .select({
      hours: timesheetEntries.hours,
      billable: engagements.billable,
      engagementCode: engagements.code,
    })
    .from(timesheetEntries)
    .innerJoin(engagements, eq(timesheetEntries.engagementId, engagements.id))
    .where(eq(timesheetEntries.weekId, weekId));

  let total = 0;
  let billable = 0;
  const byEngagement: Record<string, number> = {};
  for (const r of rows) {
    total += r.hours;
    if (r.billable) billable += r.hours;
    byEngagement[r.engagementCode] = (byEngagement[r.engagementCode] ?? 0) + r.hours;
  }
  return {
    total,
    billable,
    nonBillable: total - billable,
    utilisation: total === 0 ? 0 : billable / total,
    byEngagement,
  };
}

export async function firmWideUtilisation(fromIso: string, toIso: string) {
  const rows = await db
    .select({
      hours: timesheetEntries.hours,
      billable: engagements.billable,
    })
    .from(timesheetEntries)
    .innerJoin(engagements, eq(timesheetEntries.engagementId, engagements.id))
    .innerJoin(timesheetWeeks, eq(timesheetEntries.weekId, timesheetWeeks.id))
    .where(and(gte(timesheetWeeks.weekStart, fromIso), lte(timesheetWeeks.weekStart, toIso)));
  let total = 0;
  let billable = 0;
  for (const r of rows) {
    total += r.hours;
    if (r.billable) billable += r.hours;
  }
  return { total, billable, nonBillable: total - billable, utilisation: total === 0 ? 0 : billable / total };
}

export async function hoursByEngagement(fromIso: string, toIso: string) {
  const rows = await db
    .select({
      code: engagements.code,
      name: engagements.name,
      billable: engagements.billable,
      hours: timesheetEntries.hours,
    })
    .from(timesheetEntries)
    .innerJoin(engagements, eq(timesheetEntries.engagementId, engagements.id))
    .innerJoin(timesheetWeeks, eq(timesheetEntries.weekId, timesheetWeeks.id))
    .where(and(gte(timesheetWeeks.weekStart, fromIso), lte(timesheetWeeks.weekStart, toIso)));
  const agg = new Map<string, { code: string; name: string; billable: boolean; hours: number }>();
  for (const r of rows) {
    const prev = agg.get(r.code);
    if (prev) prev.hours += r.hours;
    else agg.set(r.code, { code: r.code, name: r.name, billable: r.billable, hours: r.hours });
  }
  return [...agg.values()].sort((a, b) => b.hours - a.hours);
}

export async function weeklyUtilisationTrend(fromIso: string, toIso: string) {
  const rows = await db
    .select({
      weekStart: timesheetWeeks.weekStart,
      hours: timesheetEntries.hours,
      billable: engagements.billable,
    })
    .from(timesheetEntries)
    .innerJoin(engagements, eq(timesheetEntries.engagementId, engagements.id))
    .innerJoin(timesheetWeeks, eq(timesheetEntries.weekId, timesheetWeeks.id))
    .where(and(gte(timesheetWeeks.weekStart, fromIso), lte(timesheetWeeks.weekStart, toIso)));
  const byWeek = new Map<string, { total: number; billable: number }>();
  for (const r of rows) {
    const cur = byWeek.get(r.weekStart) ?? { total: 0, billable: 0 };
    cur.total += r.hours;
    if (r.billable) cur.billable += r.hours;
    byWeek.set(r.weekStart, cur);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({
      week,
      total: Math.round(v.total),
      billable: Math.round(v.billable),
      utilisation: v.total === 0 ? 0 : Math.round((v.billable / v.total) * 100),
    }));
}

export async function hoursByUser(fromIso: string, toIso: string) {
  const rows = await db
    .select({
      userId: timesheetWeeks.userId,
      hours: timesheetEntries.hours,
      billable: engagements.billable,
    })
    .from(timesheetEntries)
    .innerJoin(engagements, eq(timesheetEntries.engagementId, engagements.id))
    .innerJoin(timesheetWeeks, eq(timesheetEntries.weekId, timesheetWeeks.id))
    .where(and(gte(timesheetWeeks.weekStart, fromIso), lte(timesheetWeeks.weekStart, toIso)));
  const all = await db.select().from(users);
  const byId = new Map(all.map((u) => [u.id, u] as const));
  const agg = new Map<string, { user: (typeof all)[number]; total: number; billable: number }>();
  for (const r of rows) {
    const u = byId.get(r.userId);
    if (!u) continue;
    const cur = agg.get(r.userId) ?? { user: u, total: 0, billable: 0 };
    cur.total += r.hours;
    if (r.billable) cur.billable += r.hours;
    agg.set(r.userId, cur);
  }
  return [...agg.values()].sort((a, b) => b.total - a.total);
}
