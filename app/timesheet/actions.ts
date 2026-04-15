"use server";

import { db } from "@/lib/db";
import { timesheetWeeks, timesheetEntries } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ACTIVITY_CODE_SET } from "@/lib/activity-codes";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

type SavePayload = {
  weekId: string;
  entries: Array<{
    engagementId: string;
    date: string;
    hours: number;
    activityCode?: string | null;
  }>;
};

type Result = { ok: true } | { ok: false; error: string };

export async function saveDraft(payload: SavePayload): Promise<Result> {
  const user = await requireUser();
  const week = db.select().from(timesheetWeeks).where(eq(timesheetWeeks.id, payload.weekId)).get();
  if (!week) return { ok: false, error: "Week not found" };
  if (week.userId !== user.id) return { ok: false, error: "Not your timesheet" };
  if (week.status === "submitted" || week.status === "approved") {
    return { ok: false, error: "Already submitted — can't edit" };
  }

  db.delete(timesheetEntries).where(eq(timesheetEntries.weekId, week.id)).run();
  for (const e of payload.entries) {
    if (!(e.hours > 0)) continue;
    const code = e.activityCode && ACTIVITY_CODE_SET.has(e.activityCode) ? e.activityCode : null;
    db.insert(timesheetEntries)
      .values({
        id: randomUUID(),
        weekId: week.id,
        engagementId: e.engagementId,
        date: e.date,
        hours: e.hours,
        activityCode: code,
      })
      .run();
  }
  db.update(timesheetWeeks)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(timesheetWeeks.id, week.id))
    .run();

  logAudit(user, "timesheet_week", week.id, "draft_saved", {
    entries: payload.entries.filter((e) => e.hours > 0).length,
  });
  revalidatePath("/timesheet");
  return { ok: true };
}

export async function submitWeek(weekId: string): Promise<Result> {
  const user = await requireUser();
  const week = db.select().from(timesheetWeeks).where(eq(timesheetWeeks.id, weekId)).get();
  if (!week) return { ok: false, error: "Week not found" };
  if (week.userId !== user.id) return { ok: false, error: "Not your timesheet" };

  db.update(timesheetWeeks)
    .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(timesheetWeeks.id, weekId))
    .run();

  logAudit(user, "timesheet_week", weekId, "submitted");
  revalidatePath("/timesheet");
  revalidatePath("/approvals");
  return { ok: true };
}
