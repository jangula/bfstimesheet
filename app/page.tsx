import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

async function signIn(formData: FormData) {
  "use server";
  const id = formData.get("userId") as string;
  await setCurrentUser(id);
  redirect("/timesheet");
}

export default async function Home() {
  const current = await getCurrentUser();
  if (current) redirect("/timesheet");

  const all = db.select().from(users).orderBy(asc(users.role), asc(users.name)).all();
  const byRole = {
    partner: all.filter((u) => u.role === "partner"),
    lead: all.filter((u) => u.role === "lead"),
    consultant: all.filter((u) => u.role === "consultant"),
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600">Demo mode</div>
        <h1 className="text-2xl font-semibold">Sign in as a BFS user</h1>
        <p className="mt-2 text-sm text-slate-600">
          Production would use Microsoft 365 single sign-on. For this demo, pick any persona below to step through
          the flow end-to-end.
        </p>
        <button
          disabled
          className="mt-4 flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-400"
          title="Wired up in production"
        >
          <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden>
            <rect width="10" height="10" fill="#F35325" />
            <rect x="12" width="10" height="10" fill="#81BC06" />
            <rect y="12" width="10" height="10" fill="#05A6F0" />
            <rect x="12" y="12" width="10" height="10" fill="#FFBA08" />
          </svg>
          Sign in with Microsoft (production)
        </button>
      </div>

      <form action={signIn}>
        {(["partner", "lead", "consultant"] as const).map((role) => (
          <section key={role} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {role === "lead" ? "Engagement leads" : role + "s"}
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {byRole[role].map((u) => (
                <button
                  key={u.id}
                  name="userId"
                  value={u.id}
                  className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-left text-sm shadow-sm transition hover:border-brand-500 hover:shadow"
                >
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.department}</div>
                  </div>
                  <span className="text-xs text-slate-400">→</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </form>
    </div>
  );
}
