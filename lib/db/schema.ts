import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["consultant", "lead", "partner", "admin"] }).notNull(),
  managerId: text("manager_id"),
  department: text("department").notNull(),
  contractedHoursPerWeek: real("contracted_hours_per_week").notNull().default(40),
  targetUtilisationPct: real("target_utilisation_pct").notNull().default(0.7),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const engagements = sqliteTable("engagements", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  client: text("client"),
  fund: text("fund"),
  billable: integer("billable", { mode: "boolean" }).notNull().default(true),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  budgetHours: real("budget_hours"),
});

export const timesheetWeeks = sqliteTable("timesheet_weeks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  weekStart: text("week_start").notNull(), // ISO date, always Monday
  status: text("status", {
    enum: ["draft", "submitted", "approved", "rejected"],
  }).notNull().default("draft"),
  submittedAt: integer("submitted_at", { mode: "timestamp" }),
  approvedBy: text("approved_by"),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  rejectionNote: text("rejection_note"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const timesheetEntries = sqliteTable("timesheet_entries", {
  id: text("id").primaryKey(),
  weekId: text("week_id").notNull().references(() => timesheetWeeks.id, { onDelete: "cascade" }),
  engagementId: text("engagement_id").notNull().references(() => engagements.id),
  date: text("date").notNull(), // ISO date
  hours: real("hours").notNull(),
  note: text("note"),
  activityCode: text("activity_code"),
});

export const escalations = sqliteTable("escalations", {
  id: text("id").primaryKey(),
  weekId: text("week_id").notNull().references(() => timesheetWeeks.id),
  tier: integer("tier").notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  recipientEmail: text("recipient_email").notNull(),
  channel: text("channel").notNull().default("email"),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  actorName: text("actor_name"),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  diff: text("diff"), // JSON string
  at: integer("at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const holidays = sqliteTable("holidays", {
  date: text("date").primaryKey(), // ISO date
  name: text("name").notNull(),
  country: text("country").notNull().default("NA"),
});

export const policy = sqliteTable("policy", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON string
});

// Virtual clock — lets the demo fast-forward "today" without waiting real days
export const clock = sqliteTable("clock", {
  id: integer("id").primaryKey(),
  today: text("today").notNull(), // ISO date override
});

// Mock email outbox — escalation engine "sends" into this table so the demo
// can show the exact body without needing Resend + domain warm-up.
export const sentEmails = sqliteTable("sent_emails", {
  id: text("id").primaryKey(),
  sentAt: integer("sent_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  toEmail: text("to_email").notNull(),
  toName: text("to_name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  tier: integer("tier"),
  kind: text("kind").notNull(),
});

export type User = typeof users.$inferSelect;
export type Engagement = typeof engagements.$inferSelect;
export type TimesheetWeek = typeof timesheetWeeks.$inferSelect;
export type TimesheetEntry = typeof timesheetEntries.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
