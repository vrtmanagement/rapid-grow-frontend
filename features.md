# Rapid Grow OS
## Product Completion & High-Value Market Roadmap

**Document version:** 1.0  
**Date:** May 2026  
**Purpose:** Complete feature checklist to finish the product and position it as a high-value SMB operations platform.

---

## Executive Summary

Rapid Grow is an all-in-one operations platform for small and mid-size businesses: task execution (TaskHub), goals (Vision), projects (Charters), HR (attendance/leave), sales (CRM), communication, content, and AI-assisted management (AI Agent).

**Current state (estimate):**
- Feature breadth built: **65–70%**
- Ready for paying companies (SaaS-grade): **35–45%**
- Vision-aligned (strengths + progress + company-ready): **40–50%**

This document lists **everything required** to reach **100% market-ready, high-value product** status.

---

## Part 1 — What Exists Today (Baseline)

### Core modules already integrated

| Module | Status | Primary value |
|--------|--------|----------------|
| Auth & RBAC (4 roles) | Built | Super Admin, Admin, Team Lead, Employee |
| Dashboard / Command Matrix | Built | Manager & employee home |
| Project Charters | Built | Project setup, charter tasks |
| TaskHub (Spaces) | Built | Kanban tasks, review workflow, bulk ops |
| AI Agent (7 tabs) | Built | Extract, assign, plan, capacity, follow-ups, standups, performance |
| Vision (goals cascade) | Built | Year → day goal hierarchy |
| Reflection / Review Matrix | Built | Daily debrief, team visibility |
| Attendance & Leave | Built | Clock in/out, leave approvals |
| Staff / Add Employee | Built | Directory, role management |
| CRM | Built | Leads, pipeline, import/export |
| Communication | Built | DM + team channels (real-time) |
| Content calendar | Built | Marketing/content scheduling |
| Permissions matrix | Built | Feature toggles per role |
| Admin: Analysis, Memory, Feedback | Built | DISC upload, DB stats, internal feedback |

### AI Agent — integrated features (7 areas)

1. **Extract & Assign** — Text/file → tasks → AI assignment → TaskHub sync  
2. **Approvals** — Manager gate before TaskHub publish  
3. **Capacity planning** — Utilization, can-absorb, recommendations  
4. **Project plan & estimate** — Days, people, price from documents  
5. **Manager summary** — Daily/weekly AI narrative  
6. **Delay follow-ups** — Overdue detection + email (manual + cron)  
7. **Performance insight** — Per-employee score + AI paragraph  

**Backend (partial UI):** Skill learning on task completion (used for assignment, no strengths dashboard yet).

---

## Part 2 — Must-Have Features for Project Completion

### A. Platform & SaaS Foundation (Critical)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| A1 | **Company / workspace signup** | Self-serve: create organization, name, industry, size | P0 |
| A2 | **Email invite flow** | Invite employees; accept link; set password | P0 |
| A3 | **True multi-tenancy** | `companyId` on all data; strict isolation between orgs | P0 |
| A4 | **Subscription billing** | Stripe: trial, monthly/annual, per-seat pricing | P0 |
| A5 | **Plan limits** | Max users, AI calls/month, storage per tier | P0 |
| A6 | **Super Admin console** | Manage all tenants, usage, support, suspend accounts | P0 |
| A7 | **Environment & deployment** | Production/staging, CI/CD, secrets management | P0 |
| A8 | **Database reliability** | Backups, restore, connection pooling, monitoring | P0 |
| A9 | **Health & uptime** | `/health`, status page, alerting (PagerDuty/email) | P0 |
| A10 | **Legal pages** | Terms, Privacy, DPA template, cookie consent | P0 |

### B. Security & Trust (Critical)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| B1 | **Two-factor authentication (2FA)** | TOTP for admins and optional for all | P0 |
| B2 | **Password policy** | Strength rules, reset flow, lockout | P0 |
| B3 | **Audit log** | Who changed what: tasks, permissions, employees, CRM | P0 |
| B4 | **Session management** | Logout all devices, token expiry, refresh | P1 |
| B5 | **Role-based API hardening** | Consistent checks on every endpoint | P0 |
| B6 | **Data export** | Company can export tasks, employees, CRM (GDPR-style) | P1 |
| B7 | **Data deletion** | Account closure + retention policy | P1 |
| B8 | **Rate limiting** | API and AI endpoints anti-abuse | P1 |
| B9 | **File upload security** | Virus scan, size limits, type validation | P1 |
| B10 | **SOC2-ready logging** | Structured logs, no secrets in logs | P2 |

### C. Employee Strengths & Performance (Your core differentiator)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| C1 | **Employee Skills Profile UI** | Show learned skills, proficiency, last used | P0 |
| C2 | **Strengths dashboard** | Top strengths per person and per team | P0 |
| C3 | **Skill gap analysis** | Required vs available skills for projects | P1 |
| C4 | **Task completion analytics** | On-time %, overdue trend, by person/project | P0 |  
| C5 | **Team workload heatmap** | Hours assigned vs capacity per week | P0 |
| C6 | **Unified company health screen** | One view: goals + tasks + attendance + CRM | P0 |
| C7 | **Performance reviews (lightweight)** | Quarterly templates, manager notes, goals link | P1 |
| C8 | **Employee self-view** | Own progress, skills growth, upcoming tasks | P1 |
| C9 | **AI “best fit” explainer** | Why person X got task Y (skills + workload) | P1 |
| C10 | **Export performance report** | PDF for 1:1s and client reviews | P1 |

### D. Task & Project Excellence

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| D1 | **Task dependencies** | Blocked-by / blocks relationships | P1 |
| D2 | **Recurring tasks** | Daily/weekly/monthly automation | P1 |
| D3 | **Task templates** | Per industry or per project type | P1 |
| D4 | **Time tracking on tasks** | Actual hours vs estimated | P1 |
| D5 | **Project budget vs actual** | Link AI estimate to real spend | P2 |
| D6 | **Gantt / timeline view** | Visual project schedule | P2 |
| D7 | **Client portal (read-only)** | External stakeholder sees progress | P2 |
| D8 | **Proposal / quote PDF** | From AI project plan → branded PDF | P1 |
| D9 | **Milestone alerts** | Notify when milestone at risk | P1 |
| D10 | **Mobile PWA** | Task update + attendance from phone | P0 |

### E. AI Agent — Completion Items

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| E1 | **AI usage dashboard** | Calls, cost, limits per company | P1 |
| E2 | **Prompt templates** | Industry-specific extract/plan prompts | P1 |
| E3 | **Batch document processing** | Multiple SOWs in one run | P2 |
| E4 | **AI assignment preview** | Edit all assignments before confirm | P1 |
| E5 | **Skills-aware UI** | Show matched skills on assign screen | P0 |
| E6 | **Company-wide AI settings** | Default rate, currency, approval rules | P1 |
| E7 | **Fallback when AI down** | Clear UX + rule-based mode | P0 |
| E8 | **AI audit trail** | What was generated, who approved | P1 |

### F. HR & People (SMB-ready)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| F1 | **Org chart** | Visual hierarchy under Admin/Branch | P1 |
| F2 | **Departments & teams** | Filter all modules by team | P1 |
| F3 | **Holiday calendar** | Company holidays affect leave/attendance | P1 |
| F4 | **Shift / work hours rules** | Late mark, overtime flags | P2 |
| F5 | **Document vault per employee** | Contracts, IDs (encrypted storage) | P2 |
| F6 | **Onboarding checklist** | New hire tasks auto-created | P1 |
| F7 | **Offboarding** | Deactivate, reassign tasks, archive | P1 |

### G. CRM & Revenue (for SMBs that sell)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| G1 | **Lead → Project conversion** | Won lead creates charter + tasks | P1 |
| G2 | **Pipeline forecasting** | Weighted revenue by stage | P2 |
| G3 | **Email sync (optional)** | Gmail/Outlook lead capture | P2 |
| G4 | **Activity timeline on lead** | Calls, emails, tasks linked | P1 |
| G5 | **Simple invoicing link** | Export deal value to invoice tool | P2 |

### H. Communication & Collaboration

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| H1 | **@mentions in tasks** | Notify assignee in TaskHub | P1 |
| H2 | **Slack / Teams webhooks** | Task assigned, overdue, standup | P1 |
| H3 | **Email digests** | Daily/weekly summary (non-AI option) | P1 |
| H4 | **Announcement channel** | Company-wide broadcast | P2 |

### I. Vision & Goals

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| I1 | **Link goals to tasks** | OKR progress from TaskHub completion | P0 |
| I2 | **Goal progress auto-calc** | % from linked task statuses | P0 |
| I3 | **Remove dead legacy views** | Clean Yearly/Quarterly orphan files | P2 |
| I4 | **Goal templates by industry** | Quick start for new companies | P1 |

### J. Quality, Testing & Documentation

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| J1 | **Unit & API tests** | Auth, tasks, AI extract, assign | P0 |
| J2 | **E2E tests** | Login → create task → complete flow | P0 |
| J3 | **Load testing** | 50–200 users per company simulation | P1 |
| J4 | **User documentation** | Help center, videos, onboarding | P0 |
| J5 | **API documentation** | Swagger complete + examples | P1 |
| J6 | **Admin runbook** | Deploy, backup, incident response | P0 |
| J7 | **In-app onboarding tour** | First login wizard for owner + employee | P0 |

### K. UX & Polish (High perceived value)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| K1 | **Consistent design system** | Buttons, forms, empty states | P1 |
| K2 | **Dark mode (optional)** | User preference | P2 |
| K3 | **Global search** | Tasks, people, leads, projects | P1 |
| K4 | **Keyboard shortcuts** | Power users in TaskHub | P2 |
| K5 | **Empty states with actions** | “Create first project” CTAs | P1 |
| K6 | **Error messages human-readable** | No raw API errors | P0 |
| K7 | **Loading & offline states** | PWA cache for critical screens | P1 |
| K8 | **Localization (i18n)** | English + Hindi (India SMB) | P2 |

---

## Part 3 — High-Value Market Positioning

### Target customer

- **Size:** 10–200 employees  
- **Types:** IT services, agencies, consulting, retail ops, professional services  
- **Pain:** Scattered tools (WhatsApp + Excel + Trello); no visibility on who is strong at what; missed deadlines  

### Unique value proposition (UVP)

> **“The only SMB ops OS that turns documents into assigned work, tracks who is best for each job, and shows real completion progress — in one place.”**

### Pricing model (recommended)

| Plan | Price (indicative) | Includes |
|------|-------------------|----------|
| **Starter** | $49/mo | Up to 10 users, TaskHub + Vision + Attendance |
| **Growth** | $149/mo | Up to 50 users, + CRM + AI (500 calls/mo) |
| **Business** | $399/mo | Up to 200 users, unlimited AI tier, API, priority support |

Add-ons: extra AI calls, white-label PDF reports, dedicated onboarding.

### Competitive advantages to build

1. **Document → plan → assign → track** in one flow (AI Agent + TaskHub)  
2. **Skills-based assignment** with visible strengths (not black-box AI)  
3. **Manager automation** — standups, follow-ups, capacity without extra tools  
4. **India + global SMB** — attendance, leave, INR/USD estimates, Hindi UI option  
5. **No enterprise complexity** — faster setup than Jira + BambooHR + HubSpot  

---

## Part 4 — Phased Delivery Plan

### Phase 1 — “Sellable MVP” (8–10 weeks)

**Goal:** First paying company can onboard and run daily ops.

- A1–A4, A7–A10 (signup, invites, billing basics, deploy, legal)  
- B1–B3, B5 (2FA, password, audit, API hardening)  
- C1, C4, C5, C6 (skills UI, completion analytics, company health)  
- E5, E7 (skills on assign, AI fallback)  
- I1, I2 (goals linked to tasks)  
- J1, J2, J4, J7 (tests, docs, onboarding tour)  
- K6 (readable errors)  
- D10 (mobile PWA basics)  

**Exit criteria:** 3 pilot companies, 30+ daily active users, zero critical security gaps.

### Phase 2 — “Differentiated SMB OS” (8–12 weeks)

**Goal:** Stand out vs generic task tools.

- C2, C3, C7, C8, C10 (strengths, gaps, reviews, self-view, PDF reports)  
- D1, D2, D4, D8, D9 (dependencies, recurring, time track, quote PDF)  
- E1, E2, E4, E6, E8 (AI dashboard, templates, preview, settings)  
- F1, F2, F6, F7 (org chart, teams, onboarding/offboarding)  
- G1, G4 (lead → project, activity timeline)  
- H1, H2, H3 (mentions, Slack, digests)  
- K1, K3, K5 (design polish, search, empty states)  

**Exit criteria:** NPS > 40 from pilots; demo closes in < 30 minutes.

### Phase 3 — “Scale & Enterprise-lite” (12+ weeks)

**Goal:** 100+ companies, partners, integrations.

- A5–A6, B4, B6–B10 (plan limits, super admin, export, SOC prep)  
- D5–D7, G2–G5, H4 (budget, Gantt, client portal, forecasting)  
- F3–F5, K2, K8 (shifts, documents, dark mode, i18n)  
- Industry templates, partner API, white-label  

---

## Part 5 — Completion Checklist Summary

| Category | Items | Est. effort |
|----------|-------|-------------|
| SaaS foundation | 10 | 6–8 weeks |
| Security & trust | 10 | 4–6 weeks |
| Strengths & performance | 10 | 6–8 weeks |
| Tasks & projects | 10 | 6–8 weeks |
| AI Agent completion | 8 | 3–4 weeks |
| HR & people | 7 | 4–5 weeks |
| CRM & revenue | 5 | 3–4 weeks |
| Communication | 4 | 2–3 weeks |
| Vision & goals | 4 | 2 weeks |
| Quality & docs | 7 | 4–6 weeks |
| UX polish | 8 | 3–4 weeks |
| **Total** | **~83 features** | **~9–12 months** (parallel team) |

With a **focused team of 3–4** (1 backend, 1 frontend, 1 full-stack/AI, 1 QA/product): realistic **full high-value completion in 9–12 months**.

With **current pace (solo/small team)**: prioritize **Phase 1 (33 items)** first → product becomes sellable in **~3 months**.

---

## Part 6 — Success Metrics (Definition of “Done”)

| Metric | Target |
|--------|--------|
| Company onboarding time | < 15 minutes to first task assigned |
| Task completion visibility | 100% managers see team dashboard |
| AI assign acceptance rate | > 80% assignments accepted without change |
| Uptime | 99.5% monthly |
| Support tickets per company | < 2/month after onboarding |
| Churn (monthly) | < 5% |
| Time to value | First AI plan + assign within 1 day of signup |

---

## Appendix — Current AI Agent Feature List (Reference)

| Tab | Capability |
|-----|------------|
| Extract & Assign | Text/file extract, workflow, project link, approval gate, TaskHub sync |
| Approvals | Approve/reject before publish |
| Capacity | Utilization and recommendations |
| Project Plan | Milestones, tasks, days, people, price |
| Manager Summary | Daily/weekly narrative + standup email |
| Delay Follow-ups | Overdue list + email + weekday cron |
| Performance | Score, completion %, AI insight |

**Automations:** Weekly standup PDF (Mon 9:00 IST), follow-up emails (weekdays 10:00 IST).

---

*Rapid Grow OS — Product Completion Roadmap v1.0*  
*Confidential — for internal planning and investor/partner discussions.*


---

## Appendix B - Simple Developer Task Plan

**Developers:** Michael and Kabir  
**Role:** Both are full-stack developers  
**Rule:** Michael starts first with the foundation work. Kabir starts at the same time on independent frontend/product work that does not depend on Michael's backend changes.

### Priority Meaning

| Priority | Meaning |
|----------|---------|
| P1 | Must do first. Required for product to work safely. |
| P2 | Do after P1. Required for sellable MVP. |
| P3 | Do after MVP is stable. Improves product value. |
| P4 | [x] Polish, scale, and advanced features (see setup table below P4 tasks). |

---

## P1 - Foundation Tasks

| Order | Owner | Task | Description | Dependency |
|-------|-------|------|-------------|------------|
| 1 | Michael | [x] Multi-tenancy setup | Add `companyId` to main backend data and make sure one company cannot access another company's data. | None |
| 2 | Michael | [x] Workspace signup backend | Create backend APIs for company signup, owner account creation, and default company setup. | Multi-tenancy setup |
| 3 | Michael | [x] Invite employee backend | Create invite link, accept invite, set password, and invite expiry APIs. | Workspace signup backend |
| 4 | Michael | [x] Role and permission API checks | Check every important API so Admin, Team Lead, Employee, and Super Admin only access allowed data. | Multi-tenancy setup |
| 5 | Michael | [x] Password reset and security backend | Add password reset, password rules, token expiry, and account lock protection. | Workspace signup backend |
| 6 | Kabir | [x] Frontend audit and cleanup | Review current pages, routes, API calls, components, mobile issues, and make a cleanup list. This does not depend on Michael. | None |
| 7 | Kabir | [x] Common UI and error components | Create or clean shared buttons, forms, loading states, empty states, and readable error messages. | Frontend audit |
| 8 | Kabir | [x] Workspace signup UI | Build company signup screens and connect them to the workspace signup API. | Common UI components |
| 9 | Kabir | [x] Invite accept UI | Build invite accept and password setup screens and connect them to invite APIs. | Common UI components |
| 10 | Kabir | [x] Mobile layout cleanup | Improve responsive layout for TaskHub, attendance, dashboard, and navigation. | Frontend audit |


---

## P2 - Sellable MVP Tasks

| Order | Owner | Task | Description | Dependency |
|-------|-------|------|-------------|------------|
| 1 | Michael | [x] Two-factor authentication backend | Add TOTP setup, verify, disable, and admin 2FA enforcement. | Password reset and security backend |
| 2 | Michael | [x] Audit logs backend | Track who changed tasks, employees, permissions, CRM records, goals, and AI approvals. | Role and permission API checks |
| 3 | Michael | [x] Billing backend | Add Stripe customer, trial, subscription, checkout, and webhook handling. | Workspace signup backend |
| 4 | Michael | [x] Health check and deployment setup | Add `/health`, staging/production env setup, deployment checklist, and secrets handling. | Core backend stable |
| 5 | Michael | [x] Backend tests | Add API tests for signup, invite, tenant isolation, permissions, password reset, and billing webhooks. | P1 and P2 backend tasks |
| 6 | Kabir | [x] Connect signup UI to backend | Connect workspace signup screens to Michael's live APIs. | Workspace signup backend |
| 7 | Kabir | [x] Connect invite UI to backend | Connect invite accept flow to Michael's live APIs. | Invite employee backend |
| 8 | Kabir | [x] Security screens | Build password reset and 2FA setup/verify screens. | Password reset backend, 2FA backend |
| 9 | Kabir | [x] Employee skills profile UI | Show employee skills, proficiency, last used date, and related tasks. | Existing skills data or API contract |
| 10 | Kabir | [x] Task analytics dashboard | Show on-time percentage, overdue trend, and task completion by person/project. | Tenant-safe task APIs |
| 11 | Kabir | [x] Workload heatmap | Show weekly assigned hours vs employee capacity. | Capacity/task APIs |
| 12 | Kabir | [x] Skills-aware AI assignment UI | Show matched skills and workload while assigning AI-generated tasks. | Skills data and AI assignment contract |
| 13 | Kabir | [x] Goal-task linking UI | Allow goals to connect with TaskHub tasks and show progress from task completion. | Goal/task API contract |
| 14 | Kabir | [x] Onboarding tour | Add first-login guidance for owner and employee users. | Signup and invite UI complete |
| 15 | Kabir | [x] E2E tests | Test signup, invite accept, login, create task, complete task, and goal progress flow. | Main MVP screens complete |

---

## P3 - Product Value Tasks

| Order | Owner | Task | Description | Dependency |
|-------|-------|------|-------------|------------|
| 1 | Michael | [x] Task dependencies backend | Add blocked-by and blocks relationships between tasks, with circular dependency checks. | TaskHub backend stable |
| 2 | Michael | [x] Recurring tasks backend | Add daily, weekly, and monthly recurring task generation. | TaskHub backend stable |
| 3 | Michael | [x] Time tracking backend | Add estimated hours, actual hours, and manual time entries. | TaskHub backend stable |
| 4 | Michael | [x] AI usage tracking backend | Track AI calls, cost, and usage per company. | Billing backend |
| 5 | Michael | [x] AI settings backend | Add company-level AI defaults like rate, currency, and approval rules. | Multi-tenancy setup |
| 6 | Michael | [x] Departments and teams backend | Add departments/teams and filters for employees, tasks, and analytics. | Employee backend stable |
| 7 | Michael | [x] Lead to project backend | Convert won CRM lead into project charter and starter tasks. | CRM and project backend stable |
| 8 | Kabir | [x] Strengths dashboard | Show top strengths by employee and team. | Employee skills profile UI |
| 9 | Kabir | [x] Skill gap analysis UI | Show required vs available skills for a project or team. | Strengths dashboard |
| 10 | Kabir | [x] Task dependency UI | Show blocked task badges and dependency selector. | Task dependencies backend |
| 11 | Kabir | [x] Recurring task UI | Add recurrence controls to task creation/editing. | Recurring tasks backend |
| 12 | Kabir | [x] Time tracking UI | Add timer/manual entry and actual vs estimated hours display. | Time tracking backend |
| 13 | Kabir | [x] AI usage dashboard UI | Show calls, cost, and usage limits per company. | AI usage tracking backend |
| 14 | Kabir | [x] AI settings UI | Build company settings for AI defaults and approval rules. | AI settings backend |
| 15 | Kabir | [x] Org chart UI | Show company hierarchy using employees, managers, departments, and teams. | Departments and teams backend |
| 16 | Kabir | [x] Lead to project UI | Add button and flow to convert a won lead into a project. | Lead to project backend |
| 17 | Kabir | [x] Global search | Search tasks, people, leads, and projects. | Search API or existing module APIs |

---

## P4 - Scale and Polish Tasks

| Order | Owner | Task | Description | Dependency |
|-------|-------|------|-------------|------------|
| 1 | Michael | [x] Plan limits backend | Enforce max users, AI calls, and storage based on subscription plan. | Billing and AI usage tracking |
| 2 | Michael | [x] Super Admin backend | Add tenant list, usage view, suspend/reactivate company, and support audit. | Multi-tenancy and billing |
| 3 | Michael | [x] Data export backend | Export company tasks, employees, CRM, and goals. | Multi-tenancy setup |
| 4 | Michael | [x] Data deletion backend | Add account closure, retention rules, and deletion queue. | Data export backend |
| 5 | Michael | [x] Rate limiting | Add API and AI endpoint rate limits by company/user/IP. | Auth and tenant setup |
| 6 | Michael | [x] File upload security | Add file type validation, size limits, and virus scanning. | Existing upload flow |
| 7 | Michael | [x] Advanced project backend | Add budget vs actual, Gantt data, and client portal APIs. | Task dependencies and time tracking |
| 8 | Kabir | [x] Super Admin UI | Build tenant management, usage, suspend/reactivate, and support screens. | Super Admin backend |
| 9 | Kabir | [x] Plan limit UI | Show usage limits, upgrade prompts, and blocked action messages. | Plan limits backend |
| 10 | Kabir | [x] Data export/delete UI | Build export request and account closure screens. | Data export/delete backend |
| 11 | Kabir | [x] Gantt/timeline UI | Show visual project timeline using task dependencies. | Advanced project backend |
| 12 | Kabir | [x] Client portal UI | Build read-only project progress view for external clients. | Client portal backend |
| 13 | Kabir | [x] Dark mode | Add user theme preference and clean color tokens. | Design system stable |
| 14 | Kabir | [x] Hindi localization | Add English/Hindi text structure for main screens. | UI text cleanup |

---

### P4 setup and configuration (manual steps)

Add these after deploying P4. **Do not run `tenant:backfill` or destructive migrations** on production unless you have a planned migration — existing data stays under `LEGACY_COMPANY_ID` (default `legacy-company`).

| Area | Variable / link | Where | Notes |
|------|-----------------|-------|-------|
| Multi-tenant legacy | `LEGACY_COMPANY_ID=legacy-company` | auth-service, user-service `.env` | Must match existing Mongo `companyId` on employees/tasks. |
| Stripe billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | auth-service | From [Stripe Dashboard](https://dashboard.stripe.com/apikeys). |
| Stripe prices | `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_BUSINESS` | auth-service | Create Products/Prices in Stripe; paste Price IDs. |
| Checkout URLs | `STRIPE_CHECKOUT_SUCCESS_URL`, `STRIPE_CHECKOUT_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL` | auth-service | e.g. `https://your-app/#/profile` success/cancel/portal return. |
| Stripe webhook | `POST https://<gateway>/api/billing/webhook` | Stripe → Developers → Webhooks | Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. |
| Plan limits | (no extra keys) | auth + user-service | Limits in `auth-service/src/config/planLimits.js`; enforced on invite, employee create, AI usage. |
| Rate limits | `GATEWAY_RATE_LIMIT_MAX`, `GATEWAY_RATE_LIMIT_WINDOW_MS` | api-gateway | Default 300 req/min per IP. |
| User-service limits | `API_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_MAX` | user-service | In-memory per company/user (optional env in middleware). |
| Upload security | `UPLOAD_MAX_SIZE_MB`, `UPLOAD_VIRUS_SCAN_ENABLED` | user-service | MIME/size checks on avatars; virus scan stub (eicar test filename). |
| Account closure | `ACCOUNT_RETENTION_DAYS` | user-service | Default 30 days before scheduled deletion (queue only; no auto-wipe in code). |
| AI cost | `AI_DEFAULT_COST_PER_CALL` | user-service | Used in usage logs. |
| Frontend API | `VITE_API_URL=http://localhost:5000/api` | rapid-grow-performance-hub `.env` | Gateway base including `/api`. |
| Client portal link | `#/client-portal/<token>` | Share with clients | Enable via `PATCH /api/projects/:projectId/advanced` with `{ "clientPortalEnabled": true }`; token returned on project. |
| Super Admin UI | Log in as `SUPER_ADMIN_EMAIL` (see `appSeedConstants.ts`) | Frontend | Routes: `/super-admin`. |
| Data export | `POST /api/data-export` | Admin UI → Settings → Data & privacy | Downloads JSON; does not delete data. |

---

## Immediate Work Summary

| Developer | Start Now | Why |
|-----------|-----------|-----|
| Michael | P1 Order 1: Multi-tenancy setup | This is the backend foundation for almost every other feature. |
| Kabir | P1 Orders 6-10 | These tasks are independent and can be done while Michael works on backend foundation. |

## Dependency Rule

Michael should finish the backend contract for each feature before Kabir connects the final live UI. Kabir can still create the UI first with mock data, document the required API shape, and then switch to the real API when Michael completes it.
