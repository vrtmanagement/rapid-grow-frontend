import type { SpacesTask } from '../../types/spaces';

export interface CalendarMonth {
  key: string;
  label: string;
  yearLabel: string;
  monthIndex: number;
  year: number;
}

export interface CalendarWeek {
  key: string;
  label: string;
  weekIndex: number;
  monthKey: string;
  startDate: Date;
  endDate: Date;
}

export interface CalendarDay {
  key: string;
  label: string;
  weekdayIndex: number;
  weekKey: string;
  date: Date;
  dateLabel: string;
}

export interface MonthGoalContext {
  monthKey: string;
  monthLabel: string;
  weekKey: string;
  weekLabel: string;
  dayKey: string;
  dayLabel: string;
  dayDate: string;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCalendarMonths(fromDate: Date, count: number): CalendarMonth[] {
  const months: CalendarMonth[] = [];
  const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);

  for (let index = 0; index < count; index += 1) {
    const year = cursor.getFullYear();
    const monthIndex = cursor.getMonth();
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    months.push({
      key,
      label: cursor.toLocaleDateString(undefined, { month: 'long' }),
      yearLabel: String(year),
      monthIndex,
      year,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

export function getWeeksForMonth(month: CalendarMonth): CalendarWeek[] {
  const daysInMonth = new Date(month.year, month.monthIndex + 1, 0).getDate();
  const weeks: CalendarWeek[] = [];
  let weekNum = 1;

  for (let startDay = 1; startDay <= daysInMonth; startDay += 7) {
    const endDay = Math.min(startDay + 6, daysInMonth);
    weeks.push({
      key: `${month.key}-w${weekNum}`,
      label: `Week ${weekNum}`,
      weekIndex: weekNum,
      monthKey: month.key,
      startDate: new Date(month.year, month.monthIndex, startDay),
      endDate: new Date(month.year, month.monthIndex, endDay),
    });
    weekNum += 1;
  }

  return weeks;
}

export function getDaysForWeek(week: CalendarWeek): CalendarDay[] {
  const days: CalendarDay[] = [];
  const cursor = new Date(week.startDate);

  while (cursor <= week.endDate) {
    const weekdayIndex = cursor.getDay();
    days.push({
      key: `${week.key}-d${cursor.getDate()}`,
      label: WEEKDAY_SHORT[weekdayIndex],
      weekdayIndex,
      weekKey: week.key,
      date: new Date(cursor),
      dateLabel: cursor.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function getTaskMonthKey(task: SpacesTask): string {
  return String(task?.customFields?.monthGoalKey || task?.customFields?.monthlyGoalId || '').trim();
}

export function getTaskWeekKey(task: SpacesTask): string {
  return String(task?.customFields?.weekGoalKey || task?.customFields?.weeklyGoalId || '').trim();
}

export function getTaskDayKey(task: SpacesTask): string {
  return String(task?.customFields?.dayGoalKey || task?.customFields?.dailyGoalId || '').trim();
}

export function isMonthGoalTask(task: SpacesTask): boolean {
  return String(task?.customFields?.planningSource || '').trim() === 'month-goals';
}

export function isTaskCompleted(task: SpacesTask): boolean {
  const status = String(task.status || '').trim().toLowerCase();
  return status === 'done' || status === 'review';
}

export function getProgressPercent(tasks: SpacesTask[]): number {
  if (!tasks.length) return 0;
  const done = tasks.filter(isTaskCompleted).length;
  return Math.round((done / tasks.length) * 100);
}

export function buildMonthGoalCustomFields(context: MonthGoalContext): Record<string, string> {
  return {
    planningSource: 'month-goals',
    monthGoalKey: context.monthKey,
    monthGoalLabel: context.monthLabel,
    weekGoalKey: context.weekKey,
    weekGoalLabel: context.weekLabel,
    dayGoalKey: context.dayKey,
    dayGoalLabel: context.dayLabel,
    monthlyGoalId: context.monthKey,
    weeklyGoalId: context.weekKey,
    dailyGoalId: context.dayKey,
    planningMonthLabel: context.monthLabel,
    planningWeekLabel: context.weekLabel,
    planningDayLabel: context.dayLabel,
    planningBreadcrumb: `${context.monthLabel} > ${context.weekLabel} > ${context.dayLabel}`,
  };
}

export function buildMonthGoalContext(
  month: CalendarMonth,
  week: CalendarWeek,
  day: CalendarDay,
): MonthGoalContext {
  return {
    monthKey: month.key,
    monthLabel: `${month.label} ${month.yearLabel}`,
    weekKey: week.key,
    weekLabel: week.label,
    dayKey: day.key,
    dayLabel: `${day.label}, ${day.dateLabel}`,
    dayDate: formatIsoDate(day.date),
  };
}

export function calendarMonthFromKey(key: string): CalendarMonth | null {
  const match = String(key || '').trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return null;
  const date = new Date(year, monthIndex, 1);
  return {
    key,
    label: date.toLocaleDateString(undefined, { month: 'long' }),
    yearLabel: String(year),
    monthIndex,
    year,
  };
}

export function getTaskWeekLabel(task: SpacesTask): string {
  return String(task?.customFields?.weekGoalLabel || task?.customFields?.planningWeekLabel || '').trim();
}

export function getTaskDayLabel(task: SpacesTask): string {
  return String(task?.customFields?.dayGoalLabel || task?.customFields?.planningDayLabel || '').trim();
}

/** Calendar order: earlier months first (Jan → Feb → …). */
export function compareCalendarMonthsAsc(
  a: Pick<CalendarMonth, 'year' | 'monthIndex'>,
  b: Pick<CalendarMonth, 'year' | 'monthIndex'>,
): number {
  return new Date(a.year, a.monthIndex, 1).getTime() - new Date(b.year, b.monthIndex, 1).getTime();
}

/** Current month through the next 11 months (12 total). */
export function getPlanableCalendarMonths(fromDate = new Date()): CalendarMonth[] {
  return getCalendarMonths(new Date(fromDate.getFullYear(), fromDate.getMonth(), 1), 12);
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Employee self-serve: pin task to today's month / week / day. */
export function resolveTodayMonthGoalContext(referenceDate = new Date()): MonthGoalContext | null {
  const months = getPlanableCalendarMonths(referenceDate);
  const month = months[0];
  if (!month) return null;

  const weeks = getWeeksForMonth(month);
  const week =
    weeks.find((item) => referenceDate >= item.startDate && referenceDate <= item.endDate) || weeks[0];
  if (!week) return null;

  const days = getDaysForWeek(week);
  const day = days.find((item) => isSameCalendarDay(item.date, referenceDate)) || days[0];
  if (!day) return null;

  return buildMonthGoalContext(month, week, day);
}

export type MonthGoalTaskDraft = {
  title: string;
  description: string;
  assigneeId: string;
  taskDocumentFile: File | null;
  monthKey: string;
  weekKey: string;
  dayKey: string;
};

export type MonthGoalValidationOptions = {
  canPickSchedule: boolean;
  canPickAssignee: boolean;
  employeeId: string;
  allowedAssigneeIds?: Set<string>;
};

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 4000;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_TASK_ATTACHMENTS = 10;

export function validateMonthGoalTaskDraft(
  draft: MonthGoalTaskDraft,
  options: MonthGoalValidationOptions,
): string[] {
  const errors: string[] = [];
  const title = String(draft.title || '').trim();
  const description = String(draft.description || '').trim();

  if (!title) errors.push('Task title is required.');
  if (title.length > MAX_TITLE_LENGTH) errors.push(`Task title must be ${MAX_TITLE_LENGTH} characters or less.`);

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`);
  }

  if (options.canPickSchedule) {
    if (!draft.monthKey) errors.push('Select a month for this goal.');
    if (!draft.weekKey) errors.push('Select a week for this goal.');
    if (!draft.dayKey) errors.push('Select a day for this goal.');
  }

  if (options.canPickAssignee) {
    const assigneeId = String(draft.assigneeId || '').trim();
    if (!assigneeId) errors.push('Select an assignee for this goal task.');
    if (assigneeId && options.allowedAssigneeIds && !options.allowedAssigneeIds.has(assigneeId)) {
      errors.push('Selected assignee is not available for this task.');
    }
  } else {
    if (!options.employeeId) errors.push('Your employee profile is required to create a task.');
  }

  if (draft.taskDocumentFile) {
    if (draft.taskDocumentFile.size > MAX_DOCUMENT_BYTES) {
      errors.push('Document must be 10 MB or smaller.');
    }
  }

  return errors;
}

export function buildMonthGoalContextFromKeys(
  monthKey: string,
  weekKey: string,
  dayKey: string,
): MonthGoalContext | null {
  const month = calendarMonthFromKey(monthKey);
  if (!month) return null;

  const weeks = getWeeksForMonth(month);
  const week = weeks.find((item) => item.key === weekKey);
  if (!week) return null;

  const day = getDaysForWeek(week).find((item) => item.key === dayKey);
  if (!day) return null;

  return buildMonthGoalContext(month, week, day);
}
