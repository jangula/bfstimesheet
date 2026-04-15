import type { Config } from "drizzle-kit";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local manually (drizzle-kit 0.28 doesn't read .env.local)
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    const [, k, rawV] = m;
    if (process.env[k]) continue;
    const v = rawV.replace(/^["']|["']$/g, "");
    process.env[k] = v;
  }
} catch {
  // ignore
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ["public"],
} satisfies Config;
