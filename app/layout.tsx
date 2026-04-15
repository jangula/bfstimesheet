import "./globals.css";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { getVirtualTodayISO } from "@/lib/clock";

export const metadata: Metadata = {
  title: "BFS Timesheet — Demo",
  description: "Billable time tracking & utilisation for BFS",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const today = getVirtualTodayISO();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-brand-600" />
              <div>
                <div className="text-sm font-semibold">BFS Timesheet</div>
                <div className="text-[11px] text-slate-500">Business Financial Solutions · Demo</div>
              </div>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {user && (
                <>
                  <Link href="/timesheet" className="rounded px-3 py-1.5 hover:bg-slate-100">My timesheet</Link>
                  {(user.role === "lead" || user.role === "partner" || user.role === "admin") && (
                    <Link href="/approvals" className="rounded px-3 py-1.5 hover:bg-slate-100">Approvals</Link>
                  )}
                  {(user.role === "partner" || user.role === "admin") && (
                    <>
                      <Link href="/dashboard" className="rounded px-3 py-1.5 hover:bg-slate-100">Dashboard</Link>
                      <Link href="/reports" className="rounded px-3 py-1.5 hover:bg-slate-100">Reports</Link>
                      <Link href="/outbox" className="rounded px-3 py-1.5 hover:bg-slate-100">Outbox</Link>
                      <Link href="/audit" className="rounded px-3 py-1.5 hover:bg-slate-100">Audit</Link>
                    </>
                  )}
                </>
              )}
            </nav>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="rounded bg-amber-50 px-2 py-1 font-medium text-amber-900 ring-1 ring-amber-200">
                Virtual date: {today}
              </span>
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-medium text-slate-800">{user.name}</div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">{user.role}</div>
                  </div>
                  <form action="/api/auth/logout" method="post">
                    <button className="rounded border px-2 py-1 hover:bg-slate-50">Switch</button>
                  </form>
                </div>
              ) : (
                <Link href="/" className="rounded bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        <footer className="mx-auto max-w-7xl px-6 py-10 text-xs text-slate-500">
          Demo by Job Angula Technology Consulting · CISM · CISA · Windhoek
        </footer>
      </body>
    </html>
  );
}
