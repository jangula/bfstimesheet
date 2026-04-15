import { clearCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await clearCurrentUser();
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
