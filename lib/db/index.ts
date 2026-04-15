import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { sqlite?: Database.Database };

const sqlite =
  globalForDb.sqlite ??
  (() => {
    const db = new Database("./local.db");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    return db;
  })();

if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };
