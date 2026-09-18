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

export type PeriodGranularity = 'weekly' | 'monthly' | 'yearly';

export type PeriodOption = {
  value: string;
  label: string;
  granularity: PeriodGranularity;
  /** weekId sent to the weekly performance API */
  weekId: string;
};

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

export function buildWeekOptions(count = 8): PeriodOption[] {
  const start = getWeekStart(new Date());
  return Array.from({ length: count }).map((_, index) => {
    const weekStart = new Date(start.getTime());
    weekStart.setUTCDate(weekStart.getUTCDate() - index * 7);
    const weekEnd = new Date(weekStart.getTime());
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const weekId = formatDateKey(weekStart);

    return {
      value: `week:${weekId}`,
      weekId,
      granularity: 'weekly' as const,
      label:
        index === 0
          ? 'This week'
          : `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${weekEnd.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            })}`,
    };
  });
}

export function buildMonthOptions(count = 12): PeriodOption[] {
  const now = new Date();
  return Array.from({ length: count }).map((_, index) => {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    const weekId = formatDateKey(getWeekStart(monthStart));
    const label =
      index === 0
        ? 'This month'
        : monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    return {
      value: `month:${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`,
      weekId,
      granularity: 'monthly' as const,
      label,
    };
  });
}

export function buildYearOptions(count = 4): PeriodOption[] {
  const currentYear = new Date().getUTCFullYear();
  return Array.from({ length: count }).map((_, index) => {
    const year = currentYear - index;
    const weekId = formatDateKey(getWeekStart(new Date(Date.UTC(year, 0, 1))));
    return {
      value: `year:${year}`,
      weekId,
      granularity: 'yearly' as const,
      label: index === 0 ? 'This year' : String(year),
    };
  });
}

export function buildPeriodMenu() {
  return {
    weekly: buildWeekOptions(),
    monthly: buildMonthOptions(),
    yearly: buildYearOptions(),
  };
}

export function normalizeDepartmentLabel(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

const DEPARTMENT_ACRONYMS = new Set(['IT', 'HR', 'QA', 'UI', 'UX', 'PMO', 'CEO', 'CTO', 'CFO']);

export function formatDepartmentDisplay(value?: string | null) {
  const normalized = normalizeDepartmentLabel(String(value || ''));
  if (!normalized) return 'Unassigned';
  if (normalized !== normalized.toUpperCase() || !/[A-Z]/.test(normalized)) {
    return normalized;
  }

  return normalized
    .toLowerCase()
    .split(' ')
    .map((word) => {
      const upper = word.toUpperCase();
      if (DEPARTMENT_ACRONYMS.has(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
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
