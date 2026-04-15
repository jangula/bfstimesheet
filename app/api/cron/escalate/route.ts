import { NextResponse } from "next/server";
import { runEscalation } from "@/lib/escalation";
import { getVirtualTodayISO } from "@/lib/clock";

// Wired up as a Vercel Cron in vercel.ts — schedule: daily 09:00
// For local demo, hit /api/cron/escalate manually or use the simulate-day button.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? (await getVirtualTodayISO());
  const result = await runEscalation(date);
  return NextResponse.json(result);
}
