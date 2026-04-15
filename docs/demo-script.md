# BFS Timesheet — Demo script

**Audience:** BFS management / steering committee
**Duration:** 10 minutes live + 5 min Q&A
**Goal:** win the decision to proceed with the 2-month pilot and a custom-build path

---

## Setup (before the meeting)

1. `npm run db:reset && npm run dev`
2. Open http://localhost:3000 — keep the sign-in picker ready
3. Have four browser tabs standing by:
   - Tab A: sign-in picker
   - Tab B: /timesheet (Anna Shilongo's view)
   - Tab C: /approvals (Ndapewa Amukwa's view)
   - Tab D: /dashboard (Tangeni Iipinge's view)
4. Record a 3-minute screen capture as a fallback in case the venue Wi-Fi dies

---

## 1. Why this, why now (60s — slide, no demo)

> "Today BFS tracks time in spreadsheets. That works when you are 15 people. At 30 people,
> across NamPro, NamPro II, and the energy advisory book, it stops giving you three things
> partners actually need: **billable utilisation visibility, audit defensibility, and
> month-end speed.**"

One sentence per pain point. Don't linger.

## 2. Consultant view — the 2-minute timesheet (90s)

Tab B · sign in as **Anna Shilongo**.

> "A consultant's week should take two minutes, not twenty."

- Show the weekly grid. Point at the engagement codes: `NAMPRO-2026-015`, `NAMPRO-II-2026-004`,
  `ENERGY-ADV-003`. **"These are your fund codes, not generic 'Project A'."**
- Add `INTERNAL-ADMIN`, fill some hours.
- Watch the live utilisation % update at the bottom. **"Consultants see their own number in real
  time — it drives the right behaviour without partners having to nag."**
- Click Submit.

## 3. Engagement-lead approval — 30 seconds per team member (90s)

Tab C · switch to **Ndapewa Amukwa**.

- Open Approvals. Show the queue grouped by direct report.
- Click into one week — point at the hours-by-engagement breakdown and the utilisation % at
  the top right. **"Leads approve on the same axis partners measure on."**
- Approve one week. Return another with a reason ("please re-tag 2 hours from INTERNAL-ADMIN to
  BD-PIPELINE"). **"Rejections are first-class — no emails, no Slack threads, the consultant
  sees exactly what to fix."**

## 4. Partner dashboard — the money screen (120s)

Tab D · switch to **Tangeni Iipinge**.

- Open Dashboard. Big numbers first: **firm utilisation, total hours, billable hours,
  non-compliance count.**
- Point at the hours-by-engagement chart. **"You can see NamPro II is consuming 40% of
  capacity this month."**
- Point at the non-compliant list. **"Here's who hasn't submitted for last week — one click to
  drill in."**
- Scroll to Top billers. **"Utilisation per person, sortable, exportable."**

## 5. Escalation automation — the unsexy hero (90s)

Still on Dashboard, demo clock visible in the top right.

- Click **+1 week** on the demo clock. Pause. **"Imagine I'm fast-forwarding a week in real
  time. Behind the scenes, the system is running our escalation policy day by day."**
- Switch to **Outbox** (top nav).
- Show the stack of reminders: Monday gentle reminders to consultants, Wednesday digests to
  engagement leads. **"No nagging from HR. Tiered and culturally appropriate for a senior
  advisory firm."**
- Mention: **"The policy lives in a config table. We can tune the tiers with BFS during the
  pilot — no code changes."**

## 6. Reports and CSV export (60s)

Top nav → Reports.

- Filter by engagement → **NAMPRO-II-2026-004**. Show the filtered rows.
- Click **Export CSV (Sage / VIP format)**.
- Open the downloaded CSV in Excel on screen. Show the columns: Employee Code, Name,
  Department, Engagement, Fund, Billable Y/N, Hours, Status, Note.
- **"This is the format your payroll team already reads. No manual retyping. No Excel
  gymnastics."**

## 7. The audit trail — the CISM/CISA angle (60s)

Top nav → Audit.

> "BFS manages public money. Every hour booked against the NamPro Fund needs to be
> defensible if a trustee, auditor, or DPC walks in and asks 'how did this hour get
> recorded, who approved it, and when?'"

- Show the append-only log. Point at the timestamps, actor names, and the `diff` JSON.
- **"Draft save, submit, approve, reject, export, clock advance — every event is
  unforgeable. This is hard to buy off the shelf."**

## 8. What the pilot proves (30s — slide)

- Adoption rate ≥ 85% by week 3
- Billable hours captured → utilisation visibility partners trust
- Audit trail accepted by BFS internal audit as evidence-grade
- CSV export accepted by Finance without rework

## 9. Honest risks (60s — slide)

1. **Data residency.** Supabase's closest region is EU. For production we will either
   negotiate a DPA or self-host Postgres on a Namibian/SA VPS. Flagging early — this is a
   decision we make together in Phase 1.
2. **Bus factor.** Custom build means one-person maintenance window if BFS doesn't have a
   dev team. Mitigation: thorough handover doc, open-source stack, escrow of source code.
3. **Running cost.** ~N$500/month hosting + domain + email. Cheaper than per-seat SaaS
   above ~25 users.

## 10. The ask (20s)

> "Sign the quotation today. We start Phase 1 Monday. First thing we'll validate with your
> team is the engagement taxonomy and approval hierarchy — everything else follows from
> that."

---

## Q&A cheat sheet

**"Why not Clockify or Harvest?"**
SaaS is cheaper on paper, but none of them do: BFS-specific engagement codes, fund-level
billable tagging, NA holiday-aware escalation, audit trail designed for fund management,
and local data residency. You'd pay for features you don't use and fight for features you
need.

**"What about mobile?"**
The demo is responsive — it works on a phone browser. A proper PWA is on the roadmap; we'd
build it in Phase 2 if BFS needs field staff access. Based on your profile — senior office
staff on laptops — we're recommending desktop-first for v1.

**"How long to production-ready?"**
After the 2-month pilot validates the model, roughly 4–6 weeks to harden: real SSO, real
email via your domain, payroll API (not CSV), proper hosting with DR, and handover docs.

**"Who owns the code?"**
BFS. Source lives in a BFS GitHub repo, Job's contract is a deliverable-and-handover,
not a SaaS subscription.

**"What if we want to walk away?"**
At any time: the data is in Postgres, the export is CSV, the app is a standard Next.js
codebase with no proprietary lock-in.
