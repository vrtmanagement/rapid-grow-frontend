# Rapid Grow — Implementation status (P1–P4)

This document lists what is **implemented and working**, what still needs **manual configuration** (env, Stripe, links), and **how the system works**. Production Mongo data is **not** wiped by these features: exports are read-only downloads; account closure only schedules deletion; no `tenant:backfill` was run as part of P4.

---

## Completed (working in code)

### P1 — Foundation
- Multi-tenant `companyId` on auth and user services (`LEGACY_COMPANY_ID` for existing data).
- Workspace signup, invites, RBAC, password reset and login lockout.
- Frontend signup/invite flows and mobile-friendly layout.

### P2 — Sellable MVP
- 2FA (TOTP) on auth-service; security settings UI.
- Audit logs API (`GET /api/audit-logs`); no dedicated admin audit UI yet.
- Stripe billing: checkout, portal, webhook handlers (backend).
- AI usage logging and internal ingest from ai-agent-service.
- Task analytics, workload heatmap, employee skills, onboarding tour, global search.
- Playwright smoke config (`e2e/smoke.spec.ts`).

### P3 — Product value
- Task dependencies, recurrence cron, time entries, goal links.
- Strengths dashboard, skill gaps, AI usage/settings, org chart.
- Lead → project conversion, global search API.

### P4 — Scale and polish
| Feature | Backend | Frontend |
|---------|---------|----------|
| Plan limits | `GET /api/plan/usage`; enforce users (invite/create employee), AI calls | `PlanLimitsBanner` on admin pages |
| Super Admin | `GET/PATCH /api/super-admin/tenants/*` | `/super-admin` |
| Data export | `POST/GET /api/data-export` (JSON payload) | Data & privacy → download |
| Account closure | `POST/GET /api/account/closure` (scheduled, retention) | Data & privacy |
| Rate limiting | Gateway IP limit; user-service per company/user; AI limit middleware | — |
| Upload security | MIME, extension, size; optional virus stub | Avatar upload path |
| Advanced project | Gantt tasks, budget, client portal token | `/projects/gantt`, `#/client-portal/:token` |


---

## Pending manual setup (env, APIs, links)

Copy from each service `.env.example` and fill **values** (keys are already listed in repo).

### Required for local dev
| Variable | Service | Purpose |
|----------|---------|---------|
| `MONGO_URI` | auth, user | Same database; do not change DB name casually on prod |
| `JWT_SECRET` | auth, user, gateway | Must match across services |
| `LEGACY_COMPANY_ID` | auth, user | Default `legacy-company` — must match existing documents |
| `VITE_API_URL` | frontend | e.g. `http://localhost:5000/api` |
| `AUTH_SERVICE_URL`, `USER_SERVICE_URL` | api-gateway | Proxy targets |

### Stripe (billing + plan upgrades)
| Variable | Notes |
|----------|--------|
| `STRIPE_SECRET_KEY` | [Stripe API keys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | From webhook endpoint |
| `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_BUSINESS` | Price IDs from Products |
| `STRIPE_CHECKOUT_SUCCESS_URL`, `STRIPE_CHECKOUT_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL` | Your app URLs (hash routes OK) |
| Webhook URL | `POST https://<your-gateway-host>/api/billing/webhook` |

### P4 optional tuning
| Variable | Service | Default behavior |
|----------|---------|------------------|
| `GATEWAY_RATE_LIMIT_MAX` | api-gateway | 300 / minute / IP |
| `API_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_MAX` | user-service | 120 / 30 per company+user |
| `UPLOAD_MAX_FILE_BYTES`, `UPLOAD_VIRUS_SCAN_ENABLED` | user-service | Size + optional eicar stub |
| `ACCOUNT_RETENTION_DAYS` | user-service | 30 days before scheduled deletion date |
| `AI_AGENT_INTERNAL_KEY` | user + ai-agent | Internal AI usage POST |
| `AI_DEFAULT_COST_PER_CALL` | user-service | Usage cost estimate |

### Email (invites / password reset)
| Variable | Service |
|----------|---------|
| `EMAIL_USER`, `EMAIL_PASS` | user-service (or your mail integration) |
| `APP_BASE_URL` | auth, user | Links in emails |

### Super Admin access
- Set an employee’s email to match `SUPER_ADMIN_EMAIL` in `appSeedConstants.ts` (or your deployed equivalent).
- Log in → open **Super Admin** in sidebar.

### Client portal link
1. Admin: `PATCH /api/projects/:projectId/advanced` with `{ "clientPortalEnabled": true }`.
2. Response includes `clientPortal.token`.
3. Share: `https://<your-app>/#/client-portal/<token>` (read-only task list).

### Not run automatically (data safety)
- `user-service/scripts/backfillCompanyId.js` — only run with a migration plan.
- Account closure **does not** delete Mongo collections in this release; it records a scheduled request only.

---

## How it works

### 1. Signup and tenant isolation
1. User completes **workspace signup** → `Company` + owner `Employee` created with a new `companyId`.
2. Every API request carries JWT with `companyId`; user-service **tenant middleware** scopes queries.
3. Existing production data without migration stays under **`LEGACY_COMPANY_ID`** (default `legacy-company`).

### 2. Auth and roles
1. Login → auth-service issues JWT.
2. Optional **2FA** step if enabled on user or required for admins.
3. Roles: Super Admin (platform), Admin, Team Lead, Employee — enforced on routes via `requireRoles`.

### 3. TaskHub / Spaces
1. Tasks, projects (charters), CRM, goals live in user-service.
2. P3 adds dependencies, time entries, recurring cron (when `RECURRING_TASKS_CRON_ENABLED=true`).
3. P4 adds project **budget**, **Gantt** task list API, and **client portal** token.

### 4. AI usage and plan limits
1. ai-agent-service calls user-service `POST /internal/ai-usage` after AI calls.
2. `recordAiUsage` checks plan AI limit, increments `companies.usageSnapshot.aiCallsThisMonth`.
3. Frontend **Plan usage** banner calls `GET /api/plan/usage`; invites/employees blocked at user cap.

### 5. Billing (Stripe)
1. Admin starts checkout → Stripe session → webhook updates `Company.plan` and Stripe customer ids.
2. Plan limits map: trial / starter / growth / business (`planLimits.js`).

### 6. Super Admin
1. Super Admin lists all companies, views usage snapshot, suspends or reactivates tenants.
2. Suspended companies get 403 on invite, employee create, and AI usage.

### 7. Data export and closure
1. **Export**: builds JSON in-process and returns download; does not delete rows.
2. **Closure**: creates `AccountClosureRequest` with `scheduledDeletionAt` = now + retention days; no automatic purge in current code.

### 8. Request path
```
Browser → api-gateway (:5000/api/*)
  → auth-service (auth, billing, plan, super-admin)
  → user-service (employees, spaces, CRM, P3/P4)
  → ai-agent-service (AI extract/tasks)
```

---

## Quick API map (P4)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/plan/usage` | Admin+ |
| GET | `/api/super-admin/tenants` | Super Admin |
| PATCH | `/api/super-admin/tenants/:id/status` | Super Admin |
| POST/GET | `/api/data-export` | Admin |
| POST/GET | `/api/account/closure` | Admin |
| GET | `/api/projects/:projectId/gantt` | Admin, Team Lead |
| PATCH | `/api/projects/:projectId/advanced` | Admin |
| GET | `/api/client-portal/:token` | Public (no auth) |

---

## Repo pointers

| Doc / path | Content |
|------------|---------|
| `features.md` | Full P1–P4 checklist + P4 setup table |
| `rapid-grow-backend-admin/DEPLOYMENT.md` | Service deploy notes |
| `*/.env.example` | Keys to copy per service |

Last updated: P4 completion (scale, polish, docs).
