export type CrmRole = 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | 'SUPER_ADMIN';

export function normalizeCrmRole(role?: string): CrmRole {
  if (role === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'TEAM_LEAD') return 'TEAM_LEAD';
  return 'EMPLOYEE';
}

export function canUseTeamFilters(role?: string): boolean {
  const normalized = normalizeCrmRole(role);
  return normalized === 'ADMIN' || normalized === 'SUPER_ADMIN' || normalized === 'TEAM_LEAD';
}
