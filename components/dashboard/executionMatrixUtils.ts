export const TARGET_SCORE = 75;
export const ALL_DEPARTMENTS_VALUE = 'all';
export const ALL_DEPARTMENTS_LABEL = 'All Departments';
export const CURATED_DEPARTMENTS = [
  'Engineering',
  'Product Management',
  'Design',
  'Human Resources',
  'Finance',
  'Sales',
  'Marketing',
  'Operations',
  'Customer Success',
  'Business Development',
] as const;

export function getWeekStart(date: Date) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = next.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  next.setUTCDate(next.getUTCDate() + diff);
  return next;
}

export function formatDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildWeekOptions(count = 6) {
  const start = getWeekStart(new Date());
  return Array.from({ length: count }).map((_, index) => {
    const weekStart = new Date(start.getTime());
    weekStart.setUTCDate(weekStart.getUTCDate() - index * 7);
    const weekEnd = new Date(weekStart.getTime());
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

    return {
      value: formatDateKey(weekStart),
      label:
        index === 0
          ? 'This Week'
          : `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${weekEnd.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          })}`,
    };
  });
}

export function normalizeDepartmentLabel(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function buildDepartmentOptions(values: string[]) {
  const uniqueDepartments = new Map<string, string>();

  values.forEach((value) => {
    const normalized = normalizeDepartmentLabel(String(value || ''));
    if (!normalized) return;
    if (normalized.toLocaleLowerCase() === ALL_DEPARTMENTS_LABEL.toLocaleLowerCase()) return;

    const key = normalized.toLocaleLowerCase();
    if (!uniqueDepartments.has(key)) {
      uniqueDepartments.set(key, normalized);
    }
  });

  return Array.from(uniqueDepartments.values()).sort((a, b) => a.localeCompare(b));
}
