export const BACKEND_ROLES = ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD', 'EMPLOYEE'] as const;
export type BackendRole = typeof BACKEND_ROLES[number];

export type PermissionKey =
  | 'EMPLOYEE_CREATE'
  | 'EMPLOYEE_UPDATE'
  | 'EMPLOYEE_DELETE'
  | 'EMPLOYEE_LIST'
  | 'DASHBOARD_VIEW'
  | 'EXECUTION_MATRIX_VIEW'
  | 'WORKSPACES_VIEW'
  | 'SPACES_VIEW'
  | 'ATTENDANCE_VIEW'
  | 'EMPLOYEE_ATTENDANCE_VIEW'
  | 'YEARLY_VIEW'
  | 'QUARTERLY_VIEW'
  | 'MONTHLY_VIEW'
  | 'WEEKLY_VIEW'
  | 'DAILY_VIEW'
  | 'REFLECTION_VIEW'
  | 'PROFILE_VIEW'
  | 'COMMUNICATION_VIEW'
  | 'FEEDBACK_VIEW'
  | 'STAFF_VIEW'
  | 'PERMISSIONS_MANAGE';

export const ROLE_LABELS: Record<BackendRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TEAM_LEAD: 'Team Lead',
  EMPLOYEE: 'Employee',
};

export function mapBackendRoleToUiRole(role?: string): 'Admin' | 'Leader' | 'Employee' {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return 'Admin';
  if (role === 'TEAM_LEAD') return 'Leader';
  return 'Employee';
}
