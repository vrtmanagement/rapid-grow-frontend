# Frontend Audit & Cleanup List

**Owner:** Kabir  
**Phase:** P1 Foundation  
**Status:** Complete audit, ready for cleanup implementation

## App Structure

| Area | Current State | Cleanup Task | Priority |
|------|---------------|--------------|----------|
| Routing / shell | Main app state and navigation live heavily in `App.tsx`. | Keep current structure for now, but avoid adding more feature logic to `App.tsx`; move new signup/invite/reset flows into dedicated views. | P1 |
| API clients | Some modules use service files, but many views call `fetch` directly. | Create shared API helpers for response parsing, auth headers, and readable errors before adding more screens. | P1 |
| Auth storage | Session storage is centralized in `config/api.ts`, but login writes `rapidgrow-admin` directly. | Use `AUTH_STORAGE_KEY` everywhere and add company/workspace data to the stored session after signup. | P1 |
| Error handling | Errors are displayed differently across views. | Standardize with one readable API error helper and one reusable alert/toast component. | P1 |
| Loading states | Shared skeletons exist, but not every page uses them. | Use existing skeleton components for Staff, Spaces, Attendance, CRM, AI Agent, and signup/invite flows. | P2 |

## Immediate Independent Work

| Order | Task | Description | Depends On |
|-------|------|-------------|------------|
| 1 | Add shared API response helper | Add a utility that reads JSON safely and returns human-readable backend error messages. | None |
| 2 | Normalize auth storage usage | Replace hard-coded `rapidgrow-admin` writes/reads with `AUTH_STORAGE_KEY` imports. | None |
| 3 | Prepare signup view | Build workspace signup UI against `POST /api/workspaces/signup`. | Backend Task 2 complete |
| 4 | Prepare invite accept view | Build invite preview and accept UI against `GET /api/employees/invites/:token` and `POST /api/employees/invites/:token/accept`. | Backend Task 3 complete |
| 5 | Prepare password reset screens | Build forgot password and reset password UI against `POST /api/employees/password/forgot` and `POST /api/employees/password/reset`. | Backend Task 5 complete |
| 6 | Fix Add Employee password rule | Update UI validation from 6 characters to the backend policy: 8 chars, uppercase, lowercase, number, special character. | Backend Task 5 complete |
| 7 | Mobile smoke pass | Check TaskHub, Attendance, Staff, and Login at mobile width and list layout overflow issues. | None |

## API Endpoints Ready For Frontend

| Flow | Method | Endpoint |
|------|--------|----------|
| Workspace signup | POST | `/api/workspaces/signup` |
| Login | POST | `/api/employees/login` |
| Create invite | POST | `/api/employees/invites` |
| Load invite | GET | `/api/employees/invites/:token` |
| Accept invite | POST | `/api/employees/invites/:token/accept` |
| Forgot password | POST | `/api/employees/password/forgot` |
| Reset password | POST | `/api/employees/password/reset` |

## Components To Reuse

| Component | Use For |
|-----------|---------|
| `components/ui/Toast.tsx` | Success/error messages after signup, invite, password reset, save actions |
| `components/ui/Skeleton.tsx` | Page loading states |
| `components/ui/ConfirmDialog.tsx` | Destructive actions like delete employee, delete project, delete content |
| `components/AccessDenied.tsx` | Permission denied states |

## Known Cleanup Notes

- `LoginView.tsx` should support company/workspace login once the UI flow is ready. For legacy users, no company field is required because the backend defaults to `legacy-company`.
- `AddEmployeeView.tsx` currently validates password length at 6 characters. Backend now requires a stronger password policy.
- Communication file downloads now require auth; any direct file link must include the current token through the gateway request path.
- New signup/invite/password screens should not be placed inside the authenticated app shell because they are public or pre-login flows.
- Avoid adding more raw `fetch` response parsing to feature views; use a shared helper first.

## Completion Criteria

- Kabir can start frontend work without waiting for Michael.
- Backend-ready endpoints are listed.
- Cleanup tasks are ordered and dependency-safe.
- No production data changes are required for this frontend audit.
