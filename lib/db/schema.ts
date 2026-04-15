import { pgTable, text, integer, doublePrecision, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").$type<"consultant" | "lead" | "partner" | "admin">().notNull(),
  managerId: text("manager_id"),
  department: text("department").notNull(),
  contractedHoursPerWeek: doublePrecision("contracted_hours_per_week").notNull().default(40),
  targetUtilisationPct: doublePrecision("target_utilisation_pct").notNull().default(0.7),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const engagements = pgTable("engagements", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  client: text("client"),
  fund: text("fund"),
  billable: boolean("billable").notNull().default(true),
  active: boolean("active").notNull().default(true),
  budgetHours: doublePrecision("budget_hours"),
});

export const timesheetWeeks = pgTable("timesheet_weeks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  weekStart: text("week_start").notNull(), // ISO date, always Monday
  status: text("status").$type<"draft" | "submitted" | "approved" | "rejected">().notNull().default("draft"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionNote: text("rejection_note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const timesheetEntries = pgTable("timesheet_entries", {
  id: text("id").primaryKey(),
  weekId: text("week_id").notNull().references(() => timesheetWeeks.id, { onDelete: "cascade" }),
  engagementId: text("engagement_id").notNull().references(() => engagements.id),
  date: text("date").notNull(), // ISO date
  hours: doublePrecision("hours").notNull(),
  note: text("note"),
  activityCode: text("activity_code"),
});

export const escalations = pgTable("escalations", {
  id: text("id").primaryKey(),
  weekId: text("week_id").notNull().references(() => timesheetWeeks.id),
  tier: integer("tier").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().default(sql`now()`),
  recipientEmail: text("recipient_email").notNull(),
  channel: text("channel").notNull().default("email"),
});

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  actorName: text("actor_name"),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  diff: text("diff"), // JSON string
  at: timestamp("at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const holidays = pgTable("holidays", {
  date: text("date").primaryKey(), // ISO date
  name: text("name").notNull(),
  country: text("country").notNull().default("NA"),
});

export const policy = pgTable("policy", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON string
});

// Virtual clock — lets the demo fast-forward "today" without waiting real days
export const clock = pgTable("clock", {
  id: integer("id").primaryKey(),
  today: text("today").notNull(), // ISO date override
});

// Mock email outbox — escalation engine "sends" into this table so the demo
// can show the exact body without needing Resend + domain warm-up.
export const sentEmails = pgTable("sent_emails", {
  id: text("id").primaryKey(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().default(sql`now()`),
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
