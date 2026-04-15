CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_name" text,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"diff" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clock" (
	"id" integer PRIMARY KEY NOT NULL,
	"today" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "engagements" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"client" text,
	"fund" text,
	"billable" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"budget_hours" double precision,
	CONSTRAINT "engagements_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "escalations" (
	"id" text PRIMARY KEY NOT NULL,
	"week_id" text NOT NULL,
	"tier" integer NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipient_email" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "holidays" (
	"date" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text DEFAULT 'NA' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sent_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"to_email" text NOT NULL,
	"to_name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"tier" integer,
	"kind" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "timesheet_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"week_id" text NOT NULL,
	"engagement_id" text NOT NULL,
	"date" text NOT NULL,
	"hours" double precision NOT NULL,
	"note" text,
	"activity_code" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "timesheet_weeks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week_start" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejection_note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"manager_id" text,
	"department" text NOT NULL,
	"contracted_hours_per_week" double precision DEFAULT 40 NOT NULL,
	"target_utilisation_pct" double precision DEFAULT 0.7 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escalations" ADD CONSTRAINT "escalations_week_id_timesheet_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."timesheet_weeks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_week_id_timesheet_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."timesheet_weeks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timesheet_weeks" ADD CONSTRAINT "timesheet_weeks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
