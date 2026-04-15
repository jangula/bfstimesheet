// Must come first — imports are hoisted, so env loading must be a side-effect
// import that precedes `./index` which reads DATABASE_URL.
import "./load-env";
import { db } from "./index";
import * as s from "./schema";
import { addDays, format, startOfWeek } from "date-fns";
import { randomUUID } from "node:crypto";

const NAMIBIAN_HOLIDAYS_2026: Array<[string, string]> = [
  ["2026-01-01", "New Year's Day"],
  ["2026-03-21", "Independence Day"],
  ["2026-04-03", "Good Friday"],
  ["2026-04-06", "Easter Monday"],
  ["2026-05-01", "Workers' Day"],
  ["2026-05-04", "Cassinga Day"],
  ["2026-05-14", "Ascension Day"],
  ["2026-05-25", "Africa Day"],
  ["2026-08-26", "Heroes' Day"],
  ["2026-12-10", "Human Rights Day"],
  ["2026-12-25", "Christmas Day"],
  ["2026-12-26", "Family Day"],
];

const PEOPLE: Array<{ name: string; role: s.User["role"]; dept: string; managerIdx?: number }> = [
  // Partners (0-2)
  { name: "Tangeni Iipinge", role: "partner", dept: "Investment Management" },
  { name: "Selma Nghidinwa", role: "partner", dept: "Advisory" },
  { name: "Johannes Shikongo", role: "partner", dept: "Energy" },
  // Engagement leads (3-7)
  { name: "Ndapewa Amukwa", role: "lead", dept: "Investment Management", managerIdx: 0 },
  { name: "Petrus Haufiku", role: "lead", dept: "Investment Management", managerIdx: 0 },
  { name: "Loide Hamunyela", role: "lead", dept: "Advisory", managerIdx: 1 },
  { name: "Martin Kauluma", role: "lead", dept: "Advisory", managerIdx: 1 },
  { name: "Immanuel Gowaseb", role: "lead", dept: "Energy", managerIdx: 2 },
  // Consultants (8-19)
  { name: "Anna Shilongo", role: "consultant", dept: "Investment Management", managerIdx: 3 },
  { name: "Kaleb Nambahu", role: "consultant", dept: "Investment Management", managerIdx: 3 },
  { name: "Rachel Uugwanga", role: "consultant", dept: "Investment Management", managerIdx: 4 },
  { name: "David Kapofi", role: "consultant", dept: "Investment Management", managerIdx: 4 },
  { name: "Beata Nakale", role: "consultant", dept: "Advisory", managerIdx: 5 },
  { name: "Frans Mwetupunga", role: "consultant", dept: "Advisory", managerIdx: 5 },
  { name: "Helena Iitula", role: "consultant", dept: "Advisory", managerIdx: 6 },
  { name: "Jason Awaseb", role: "consultant", dept: "Advisory", managerIdx: 6 },
  { name: "Paulina Shaetonhodi", role: "consultant", dept: "Energy", managerIdx: 7 },
  { name: "Lazarus Ndjaba", role: "consultant", dept: "Energy", managerIdx: 7 },
  { name: "Maria Nuuyoma", role: "consultant", dept: "Energy", managerIdx: 7 },
  { name: "Simon Kashindi", role: "consultant", dept: "Energy", managerIdx: 7 },
];

const ENGAGEMENTS: Array<{
  code: string;
  name: string;
  client?: string;
  fund?: string;
  billable: boolean;
  budgetHours?: number;
}> = [
  { code: "NAMPRO-2026-015", name: "NamPro Fund deal origination", fund: "NamPro Fund", billable: true, budgetHours: 480 },
  { code: "NAMPRO-II-2026-004", name: "NamPro II portfolio review", fund: "NamPro II", billable: true, budgetHours: 320 },
  { code: "ENERGY-ADV-003", name: "Renewable IPP advisory", client: "Confidential IPP", billable: true, budgetHours: 600 },
  { code: "SME-TRAINING-2026", name: "SME capacity building programme", client: "DBN", billable: true, budgetHours: 240 },
  { code: "BD-PIPELINE", name: "Business development — pipeline", billable: false },
  { code: "INTERNAL-ADMIN", name: "Internal admin & management", billable: false },
  { code: "LEAVE", name: "Annual / sick leave", billable: false },
  { code: "TRAINING", name: "Professional development", billable: false },
];

function email(name: string) {
  return (
    name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "") + "@bfs.com.na"
  );
}

async function main() {
  console.log("Seeding…");

  // Clear (idempotent) — order matters for FK constraints
  await db.delete(s.auditLog);
  await db.delete(s.sentEmails);
  await db.delete(s.escalations);
  await db.delete(s.timesheetEntries);
  await db.delete(s.timesheetWeeks);
  await db.delete(s.users);
  await db.delete(s.engagements);
  await db.delete(s.holidays);
  await db.delete(s.policy);
  await db.delete(s.clock);

  // Users
  const userIds: string[] = PEOPLE.map(() => randomUUID());
  for (let i = 0; i < PEOPLE.length; i++) {
    const p = PEOPLE[i];
    await db.insert(s.users).values({
      id: userIds[i],
      email: email(p.name),
      name: p.name,
      role: p.role,
      managerId: p.managerIdx !== undefined ? userIds[p.managerIdx] : null,
      department: p.dept,
      contractedHoursPerWeek: 40,
      targetUtilisationPct: 0.7,
    });
  }

  // Engagements
  const engIds = new Map<string, string>();
  for (const e of ENGAGEMENTS) {
    const id = randomUUID();
    engIds.set(e.code, id);
    await db.insert(s.engagements).values({
      id,
      code: e.code,
      name: e.name,
      client: e.client ?? null,
      fund: e.fund ?? null,
      billable: e.billable,
      active: true,
      budgetHours: e.budgetHours ?? null,
    });
  }

  // Holidays
  for (const [date, name] of NAMIBIAN_HOLIDAYS_2026) {
    await db.insert(s.holidays).values({ date, name, country: "NA" });
  }

  // Policy defaults
  await db.insert(s.policy).values({
    key: "escalation",
    value: JSON.stringify({
      mondayReminderHour: 9,
      leadDigestDay: 3, // Wednesday
      targetUtilisation: 0.7,
      deadlineDay: 5, // Friday
    }),
  });

  // Virtual clock — pin to a Monday in mid-April 2026 for deterministic demos
  const today = "2026-04-13"; // Monday
  await db.insert(s.clock).values({ id: 1, today });

  // Historical timesheets for past 4 weeks (so the dashboard is alive)
  const anchor = new Date("2026-04-13T00:00:00Z");
  const billableCodes = ENGAGEMENTS.filter((e) => e.billable).map((e) => e.code);
  const nonBillableCodes = ENGAGEMENTS.filter((e) => !e.billable).map((e) => e.code);

  for (let w = 4; w >= 1; w--) {
    const weekStart = startOfWeek(addDays(anchor, -7 * w), { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, "yyyy-MM-dd");

    for (let i = 0; i < PEOPLE.length; i++) {
      // 85% submission rate in history — leave some non-submitters for compliance story
      if (Math.random() < 0.15) continue;

      const weekId = randomUUID();
      const userRole = PEOPLE[i].role;
      // Partners submit later / less often
      const status = userRole === "partner" && Math.random() < 0.3 ? "submitted" : "approved";

      await db.insert(s.timesheetWeeks).values({
        id: weekId,
        userId: userIds[i],
        weekStart: weekStartStr,
        status,
        submittedAt: new Date(weekStart.getTime() + 5 * 86400_000),
        approvedBy: status === "approved" ? userIds[PEOPLE[i].managerIdx ?? 0] : null,
        approvedAt: status === "approved" ? new Date(weekStart.getTime() + 6 * 86400_000) : null,
      });

      // 5 working days of entries
      for (let d = 0; d < 5; d++) {
        const day = format(addDays(weekStart, d), "yyyy-MM-dd");
        // 1-3 engagements per day
        const n = 1 + Math.floor(Math.random() * 3);
        let remaining = 8;
        const picked = new Set<string>();
        for (let k = 0; k < n && remaining > 0; k++) {
          const useBillable = Math.random() < 0.75;
          const pool = useBillable ? billableCodes : nonBillableCodes;
          let code = pool[Math.floor(Math.random() * pool.length)];
          while (picked.has(code) && picked.size < pool.length) {
            code = pool[Math.floor(Math.random() * pool.length)];
          }
          picked.add(code);
          const hrs = k === n - 1 ? remaining : Math.min(remaining, 1 + Math.floor(Math.random() * 5));
          remaining -= hrs;
          if (hrs <= 0) continue;
          await db.insert(s.timesheetEntries).values({
            id: randomUUID(),
            weekId,
            engagementId: engIds.get(code)!,
            date: day,
            hours: hrs,
            note: null,
          });
        }
      }
    }
  }

  console.log("Seed complete.");
  console.log(`  users:       ${PEOPLE.length}`);
  console.log(`  engagements: ${ENGAGEMENTS.length}`);
  console.log(`  holidays:    ${NAMIBIAN_HOLIDAYS_2026.length}`);
  console.log(`  virtual today: ${today}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
