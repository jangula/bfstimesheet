import { NextResponse } from "next/server";
import { advanceVirtualClock, resetVirtualClock, getVirtualTodayISO } from "@/lib/clock";
import { runEscalation } from "@/lib/escalation";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "partner" && user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { days } = (await req.json().catch(() => ({ days: 1 }))) as { days?: number };

  if (days === -999) {
    await resetVirtualClock("2026-04-13");
    await logAudit(user, "clock", "virtual", "reset", { to: "2026-04-13" });
    return NextResponse.json({ today: "2026-04-13" });
  }

  // Step through each day so weekly/monthly cron windows don't get skipped
  const steps = Math.max(1, Math.min(30, days ?? 1));
  const allActions: unknown[] = [];
  let newDate = await getVirtualTodayISO();
  for (let i = 0; i < steps; i++) {
    newDate = await advanceVirtualClock(1);
    const result = await runEscalation(newDate);
    allActions.push(...result.actions);
  }
  await logAudit(user, "clock", "virtual", "advance", {
    to: newDate,
    steps,
    actions: allActions.length,
  });
  return NextResponse.json({ today: newDate, actions: allActions });
}

export async function GET() {
  return NextResponse.json({ today: await getVirtualTodayISO() });
}
