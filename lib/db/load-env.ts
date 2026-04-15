// Imported for its side effect: populates process.env from .env.local
// *before* any module that reads DATABASE_URL (like ./index.ts) is evaluated.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

try {
  const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    const [, k, rawV] = m;
    if (process.env[k]) continue;
    process.env[k] = rawV.replace(/^["']|["']$/g, "");
  }
} catch {
  // ignore
}
