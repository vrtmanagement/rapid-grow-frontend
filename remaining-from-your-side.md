# Rapid Grow - Remaining Items From Your Side

Checked against `features.md`, frontend routes, service API wrappers, and backend route files on May 20, 2026.

## Safe Data Notes

- I did not run any database migration, seed, delete, backfill, or tenant script.
- Keep `LEGACY_COMPANY_ID=legacy-company` unless you intentionally migrate old Mongo data.
- Do not run `user-service/scripts/backfillCompanyId.js` on production without a backup and migration plan.
- Account closure is a scheduled request flow; it should not delete existing data unless the deletion job is explicitly enabled.

## Completed In Code

These P1-P4 items exist in the codebase:

- Workspace signup, invite accept, password reset, 2FA, billing, plan usage, super admin, audit logs.
- Multi-tenant API routing and `companyId` scoped service areas.
- Task analytics, workload heatmap, employee skills, strengths dashboard, skill gap analysis, org chart.
- AI Agent tabs for extract, approvals, capacity, project plan, summaries, follow-ups, and performance.
- AI usage and AI settings screens.
- Task dependencies, recurrence, time tracking, goal-task links, Gantt/timeline, client portal.
- Data export, account closure request, rate limiting, upload validation, storage plan limits.
- Dark mode and Hindi language settings.

## Fixed In This Pass

- Added missing sidebar links for completed screens that existed but were hard to find:
  - Task analytics
  - Workload
  - Strengths
  - Skill gaps
  - Org chart
  - AI usage
  - AI settings
  - Security
- Fixed the AI Agent Capacity tab so it no longer appears empty before loading data.

## Configuration You Still Need To Finish

These require real environment values and service restarts:

| Area | Needed |
| --- | --- |
| Database | `MONGO_URI` must point to the one correct production database. |
| Tenant safety | `LEGACY_COMPANY_ID=legacy-company` must match old records. |
| JWT | `JWT_SECRET` must match auth-service, user-service, and api-gateway. |
| Frontend API | `VITE_API_URL` should point to the gateway, for example `http://localhost:5000/api`. |
| Email | `EMAIL_USER`, `EMAIL_PASS`, and `APP_BASE_URL` for invites and password reset. |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs, checkout URLs, portal URL. |
| AI Agent | AI provider keys plus matching `AI_AGENT_INTERNAL_KEY` between user-service and ai-agent-service. |
| Recurring tasks | Set `RECURRING_TASKS_CRON_ENABLED=true` only when ready for automatic recurrence. |
| Account deletion | Keep `ACCOUNT_DELETION_JOB_ENABLED=false` unless you are intentionally enabling deletion processing. |

## Product Roadmap Still Not Fully Done

These are still product-level roadmap items from the larger `features.md` document, not the P1-P4 checklist:

- Legal pages: Terms, Privacy, DPA, cookie consent.
- Mobile PWA install/offline behavior.
- Session management: logout all devices / token revocation.
- PDF exports: proposal/quote PDF and performance report PDF.
- Full unified company health dashboard combining goals, tasks, attendance, CRM, and AI.
- Task templates by industry/project type.
- Holiday calendar, shift rules, employee document vault.
- Slack/Teams webhooks, non-AI email digests, announcement channel.
- Client portal polish beyond read-only project progress.
- Load testing and complete production runbook validation.

## Final Check Before Production

- Run frontend build.
- Run backend syntax checks/tests for touched services.
- Confirm all `.env` files point to the same intended database.
- Take a Mongo backup before enabling any cron that creates or deletes records.
