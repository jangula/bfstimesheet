import { cookies } from "next/headers";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import type { User } from "./db/schema";

const COOKIE = "bfs_demo_user";

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) throw new Error("Not signed in");
  return u;
}

export async function setCurrentUser(id: string) {
  const jar = await cookies();
  jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function clearCurrentUser() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
