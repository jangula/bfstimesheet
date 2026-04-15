// Apply the generated SQL migration(s) directly.
// Workaround for drizzle-kit push bug against Supabase (check-constraint
// introspection crashes). We use `drizzle-kit generate` + this script instead.
import "./load-env";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const dir = resolve(process.cwd(), "drizzle");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  console.log(`Applying ${files.length} migration file(s) to public schema…`);

  // Drop existing tables first (idempotent reset)
  const tables = [
    "audit_log",
    "sent_emails",
    "escalations",
    "timesheet_entries",
    "timesheet_weeks",
    "engagements",
    "users",
    "holidays",
    "policy",
    "clock",
  ];
  for (const t of tables) {
    await sql.unsafe(`drop table if exists "${t}" cascade`);
  }

  for (const f of files) {
    const body = readFileSync(join(dir, f), "utf8");
    // drizzle uses --> statement-breakpoint
    const stmts = body
      .split(/-->\s*statement-breakpoint/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of stmts) {
      await sql.unsafe(stmt);
    }
    console.log(`  applied ${f}`);
  }

  await sql.end();
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
