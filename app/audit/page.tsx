import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { format } from "date-fns";

export default async function AuditPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/");
  if (user.role !== "partner" && user.role !== "admin") redirect("/timesheet");

  const rows = db.select().from(auditLog).orderBy(desc(auditLog.at)).limit(500).all();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="mt-1 text-sm text-slate-600">
          Append-only record of every state change. Showing last {rows.length} events.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2 font-semibold">When</th>
              <th className="px-4 py-2 font-semibold">Actor</th>
              <th className="px-4 py-2 font-semibold">Action</th>
              <th className="px-4 py-2 font-semibold">Entity</th>
              <th className="px-4 py-2 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="whitespace-nowrap px-4 py-2 text-xs tabular-nums text-slate-500">
                  {format(r.at, "dd MMM HH:mm:ss")}
                </td>
                <td className="px-4 py-2 font-medium">{r.actorName ?? "system"}</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs">{r.action}</span>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">
                  {r.entity}
                  <div className="text-[10px] text-slate-400">{r.entityId.slice(0, 8)}</div>
                </td>
                <td className="px-4 py-2 text-xs text-slate-600">
                  {r.diff ? <pre className="whitespace-pre-wrap break-words">{r.diff}</pre> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
