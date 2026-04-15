"use server";

import { db } from "@/lib/db";
import { timesheetWeeks, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function canApprove(
  approver: { id: string; role: string },
  weekOwnerManagerId: string | null,
): boolean {
  if (approver.role === "partner" || approver.role === "admin") return true;
  if (approver.role === "lead" && weekOwnerManagerId === approver.id) return true;
  return false;
}

export async function approveWeek(formData: FormData) {
  const user = await requireUser();
  const weekId = formData.get("weekId") as string;
  const week = db.select().from(timesheetWeeks).where(eq(timesheetWeeks.id, weekId)).get();
  if (!week) return;
  const owner = db.select().from(users).where(eq(users.id, week.userId)).get();
  if (!owner) return;
  if (!canApprove(user, owner.managerId)) return;
  if (week.status !== "submitted") return;

  db.update(timesheetWeeks)
    .set({
      status: "approved",
      approvedBy: user.id,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(timesheetWeeks.id, weekId))
    .run();

  logAudit(user, "timesheet_week", weekId, "approved", { owner: owner.name });
  revalidatePath("/approvals");
  revalidatePath("/dashboard");
}

export async function rejectWeek(formData: FormData) {
  const user = await requireUser();
  const weekId = formData.get("weekId") as string;
  const note = ((formData.get("note") as string) || "").trim();
  if (!note) return;
  const week = db.select().from(timesheetWeeks).where(eq(timesheetWeeks.id, weekId)).get();
  if (!week) return;
  const owner = db.select().from(users).where(eq(users.id, week.userId)).get();
  if (!owner) return;
  if (!canApprove(user, owner.managerId)) return;
  if (week.status !== "submitted") return;

  db.update(timesheetWeeks)
    .set({ status: "rejected", rejectionNote: note, updatedAt: new Date() })
    .where(eq(timesheetWeeks.id, weekId))
    .run();

  logAudit(user, "timesheet_week", weekId, "rejected", { note, owner: owner.name });
  revalidatePath("/approvals");
}
