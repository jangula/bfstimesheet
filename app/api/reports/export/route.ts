import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, engagements, timesheetEntries, timesheetWeeks } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { activityLabel } from "@/lib/activity-codes";

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "partner" && user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "2000-01-01";
  const to = url.searchParams.get("to") ?? "2099-12-31";
  const userFilter = url.searchParams.get("user") ?? "";
  const engFilter = url.searchParams.get("engagement") ?? "";
  const actFilter = url.searchParams.get("activity") ?? "";

  const allUsers = await db.select().from(users);
  const allEng = await db.select().from(engagements);
  const userById = new Map(allUsers.map((u) => [u.id, u] as const));
  const engById = new Map(allEng.map((e) => [e.id, e] as const));

  const rows = await db
    .select({
      entryId: timesheetEntries.id,
      userId: timesheetWeeks.userId,
      engagementId: timesheetEntries.engagementId,
      activityCode: timesheetEntries.activityCode,
      date: timesheetEntries.date,
      hours: timesheetEntries.hours,
      note: timesheetEntries.note,
      status: timesheetWeeks.status,
    })
    .from(timesheetEntries)
    .innerJoin(timesheetWeeks, eq(timesheetEntries.weekId, timesheetWeeks.id))
    .where(and(gte(timesheetWeeks.weekStart, from), lte(timesheetWeeks.weekStart, to)));

  const filtered = rows.filter(
    (r) =>
      (!userFilter || r.userId === userFilter) &&
      (!engFilter || r.engagementId === engFilter) &&
      (!actFilter || (r.activityCode ?? "") === actFilter),
  );

  // Sage Pastel / VIP-friendly header: one row per hour-entry, with payroll-style columns
  const header = [
    "Date",
    "Employee Code",
    "Employee Name",
    "Department",
    "Engagement Code",
    "Engagement Name",
    "Fund / Client",
    "Billable",
    "Activity Code",
    "Activity",
    "Hours",
    "Status",
    "Note",
  ];

  const lines: string[] = [header.join(",")];
  for (const r of filtered) {
    const u = userById.get(r.userId);
    const e = engById.get(r.engagementId);
    const dateFormatted = r.date; // ISO — Excel handles it, Pastel prefers yyyy-mm-dd
    lines.push(
      [
        dateFormatted,
        u?.email.split("@")[0] ?? "",
        u?.name ?? "",
        u?.department ?? "",
        e?.code ?? "",
        e?.name ?? "",
        e?.fund ?? e?.client ?? "",
        e?.billable ? "Y" : "N",
        r.activityCode ?? "",
        activityLabel(r.activityCode),
        r.hours.toFixed(2),
        r.status,
        r.note ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  const body = lines.join("\n") + "\n";

  await logAudit(user, "report", "csv_export", "export", {
    rows: filtered.length,
    from,
    to,
    userFilter: userFilter || null,
    engFilter: engFilter || null,
    actFilter: actFilter || null,
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="bfs-timesheet-${from}-to-${to}.csv"`,
    },
  });
}
