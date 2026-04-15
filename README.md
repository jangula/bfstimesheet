# BFS Timesheet — Demo

A tailored time-tracking and billable-utilisation demo built for **Business Financial Solutions (BFS)** by Job Angula Technology Consulting.

This is a sales artifact for pitching a custom-built timesheet solution. It runs locally with zero external dependencies.

## Quick start

```bash
npm install
npm run db:reset   # creates local.db, migrates, seeds 20 users + 4 weeks of data
npm run dev        # http://localhost:3000
```

Open http://localhost:3000, pick any persona to sign in, and step through the flows.

## Demo script (10 minutes)

See `docs/demo-script.md` for the full narrated walkthrough.

The short version:

1. **Sign in as a consultant** (e.g. *Anna Shilongo*) — show the weekly grid, add an engagement, enter hours across billable (`NAMPRO-2026-015`) and non-billable (`INTERNAL-ADMIN`) codes, watch the live utilisation %. Submit.
2. **Switch to an engagement lead** (*Ndapewa Amukwa*) — open Approvals, review Anna's submission, approve one and return another with a reason.
3. **Switch to a partner** (*Tangeni Iipinge*) — open the Partner dashboard. Show firm-wide utilisation, hours by engagement, non-compliance list, top billers.
4. **Simulate the week going by** — click the `+1 week` button in the demo clock. Refresh the Outbox tab. Show the Monday reminders to consultants and the Wednesday digest to engagement leads.
5. **Export a CSV** from Reports — show the Sage Pastel / VIP Payroll-shaped export.
6. **Open the Audit log** — show that every submission, approval, rejection, export, and clock advance has an append-only trail with actor and timestamp.
7. **End on the architecture slide** — production deploy story (Vercel + managed Postgres + Microsoft Entra SSO + Resend via BFS domain) with honest risks (data residency, bus factor, hosting).

## What's real, what's stubbed

| Feature | Demo | Production plan |
|---|---|---|
| Authentication | Role picker (cookie) | Microsoft 365 SSO via Entra ID |
| Database | SQLite file (`local.db`) | Supabase Postgres (eu-west) or self-hosted on a Namibian/SA VPS |
| Email delivery | Mock `sent_emails` table + `/outbox` viewer | Resend from `notifications.bfs.com.na`, or Microsoft Graph |
| Cron | Manual `/api/cron/escalate` + simulate-day button | Vercel Cron, daily 09:00 Windhoek time |
| Audit log | Application-level `logAudit()` calls | Postgres triggers on every write + WORM offsite backup |
| Payroll integration | CSV download (Sage Pastel / VIP format) | Direct API or SFTP drop |

## Project structure

```
app/
  page.tsx                   – sign-in picker
  timesheet/                 – weekly grid UI
  approvals/                 – lead approval queue
  dashboard/                 – partner dashboard + simulate-day
  reports/                   – filters + CSV export
  outbox/                    – mock email viewer
  audit/                     – append-only audit log
  api/
    auth/logout/             – clear session cookie
    simulate-day/            – advance virtual clock + fire escalations
    cron/escalate/           – cron entry point (also wired as Vercel cron)
    reports/export/          – CSV stream

lib/
  db/schema.ts               – Drizzle schema (SQLite)
  db/seed.ts                 – 20 users, 8 engagements, 12 NA holidays, 4 weeks of data
  auth.ts                    – cookie-based session
  clock.ts                   – virtual clock for deterministic demos
  escalation.ts              – holiday-aware tier logic
  utilisation.ts             – billable/total/by-engagement math
  audit.ts                   – append-only audit writer
  timesheet.ts               – week + entry helpers
```

## Seed data

Users are 3 partners, 5 engagement leads, 12 consultants split across three departments
(Investment Management, Advisory, Energy). Engagements include real-sounding fund codes:
`NAMPRO-2026-015`, `NAMPRO-II-2026-004`, `ENERGY-ADV-003`, `SME-TRAINING-2026`, plus non-billable
`BD-PIPELINE`, `INTERNAL-ADMIN`, `LEAVE`, `TRAINING`.

The virtual clock pins "today" to **2026-04-13** (a Monday) and 4 weeks of history is seeded
so the partner dashboard and reports have realistic data on first load.

## Reset state

```bash
npm run db:reset
```

Wipes `local.db`, recreates the schema, and re-seeds. Use between rehearsals.
