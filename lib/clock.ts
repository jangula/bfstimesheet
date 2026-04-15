import { db } from "./db";
import { clock } from "./db/schema";
import { eq } from "drizzle-orm";
import { addDays, format, parseISO } from "date-fns";

export async function getVirtualToday(): Promise<Date> {
  const rows = await db.select().from(clock).where(eq(clock.id, 1)).limit(1);
  const row = rows[0];
  return row ? parseISO(row.today) : new Date();
}

export async function getVirtualTodayISO(): Promise<string> {
  return format(await getVirtualToday(), "yyyy-MM-dd");
}

export async function advanceVirtualClock(days = 1) {
  const today = await getVirtualToday();
  const next = addDays(today, days);
  await db
    .update(clock)
    .set({ today: format(next, "yyyy-MM-dd") })
    .where(eq(clock.id, 1));
  return format(next, "yyyy-MM-dd");
}

export async function resetVirtualClock(iso: string) {
  await db.update(clock).set({ today: iso }).where(eq(clock.id, 1));
}
