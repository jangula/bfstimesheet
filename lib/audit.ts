import { db } from "./db";
import { auditLog } from "./db/schema";
import { randomUUID } from "node:crypto";
import type { User } from "./db/schema";

export function logAudit(
  actor: User | null,
  entity: string,
  entityId: string,
  action: string,
  diff?: unknown
) {
  db.insert(auditLog)
    .values({
      id: randomUUID(),
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? "system",
      entity,
      entityId,
      action,
      diff: diff ? JSON.stringify(diff) : null,
    })
    .run();
}
