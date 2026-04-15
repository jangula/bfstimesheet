import { db } from "./db";
import { clock } from "./db/schema";
import { eq } from "drizzle-orm";
import { addDays, format, parseISO } from "date-fns";

export function getVirtualToday(): Date {
  const row = db.select().from(clock).where(eq(clock.id, 1)).get();
  return row ? parseISO(row.today) : new Date();
}

export function getVirtualTodayISO(): string {
  return format(getVirtualToday(), "yyyy-MM-dd");
}

export function advanceVirtualClock(days = 1) {
  const today = getVirtualToday();
  const next = addDays(today, days);
  db.update(clock)
    .set({ today: format(next, "yyyy-MM-dd") })
    .where(eq(clock.id, 1))
    .run();
  return format(next, "yyyy-MM-dd");
}

export function resetVirtualClock(iso: string) {
  db.update(clock).set({ today: iso }).where(eq(clock.id, 1)).run();
}
