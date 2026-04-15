// Production configuration for Vercel deploy.
// Local development uses `npm run dev` and simulate-day button instead of real cron.
export default {
  buildCommand: "npm run build",
  framework: "nextjs",
  crons: [{ path: "/api/cron/escalate", schedule: "0 9 * * *" }],
};
