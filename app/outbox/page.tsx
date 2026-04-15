import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sentEmails } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { format } from "date-fns";

export default async function OutboxPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/");
  if (user.role !== "partner" && user.role !== "admin") redirect("/timesheet");

  const rows = await db.select().from(sentEmails).orderBy(desc(sentEmails.sentAt)).limit(200);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Email outbox</h1>
        <p className="mt-1 text-sm text-slate-600">
          Reminders and digests the escalation engine has sent. In production these would go via Resend + Microsoft Graph.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center text-sm text-slate-500">
          No emails yet. Advance the demo clock from the partner dashboard to trigger escalations.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((m) => (
            <article key={m.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div>
                  <span
                    className={`mr-2 rounded px-2 py-0.5 font-semibold uppercase tracking-wide ${
                      m.kind === "monday_reminder"
                        ? "bg-amber-100 text-amber-800"
                        : m.kind === "lead_digest"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {m.kind.replace("_", " ")}
                  </span>
                  to <span className="font-medium text-slate-700">{m.toName}</span>{" "}
                  &lt;{m.toEmail}&gt;
                </div>
                <div>{format(m.sentAt, "dd MMM yyyy HH:mm")}</div>
              </div>
              <div className="mt-2 text-sm font-semibold">{m.subject}</div>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-slate-700">{m.body}</pre>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
