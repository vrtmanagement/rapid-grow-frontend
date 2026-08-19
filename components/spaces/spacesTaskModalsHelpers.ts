import {
  buildCreateTaskRecurrencePayload,
  buildDefaultTaskCreateRecurrenceDraft,
  normalizeCreateTaskRecurrenceDraft,
} from '../../utils/spaces/taskRecurrence';
import type { SpacesTask, TaskCreateRecurrenceDraft } from '../../types/spaces';
import { getUserTimeZone, normalizeUserTimeZone } from '../../utils/timezone';

export const EDIT_PLANNING_CUSTOM_FIELD_KEYS = [
  'planningSource',
  'monthGoalKey',
  'monthGoalLabel',
  'weekGoalKey',
  'weekGoalLabel',
  'dayGoalKey',
  'dayGoalLabel',
  'monthlyGoalId',
  'weeklyGoalId',
  'dailyGoalId',
  'quarterlyGoalId',
  'yearlyGoalId',
  'weeklyGoalText',
  'dailyGoalText',
  'planningYearId',
  'planningYearLabel',
  'planningQuarterId',
  'planningQuarterLabel',
  'planningMonthId',
  'planningMonthLabel',
  'planningWeekId',
  'planningWeekLabel',
  'planningWeekRange',
  'planningDayLabel',
  'planningBreadcrumb',
  'weekChainKey',
  'dayChainKey',
];

export function parseRecurrenceTimeLabel(nextRunAt?: string, fallback = '09:00', timeZone?: string) {
  const parsed = nextRunAt ? new Date(nextRunAt) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return fallback;
  const tz = normalizeUserTimeZone(timeZone, getUserTimeZone());
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(parsed);
  const hour = String(parts.find((part) => part.type === 'hour')?.value || '09').padStart(2, '0');
  const minute = String(parts.find((part) => part.type === 'minute')?.value || '00').padStart(2, '0');
  return `${hour}:${minute}`;
}

export function resolveTaskAutomationTimezone(task?: SpacesTask | null) {
  return normalizeUserTimeZone(
    task?.emailChecklist?.timezone || task?.recurrence?.timezone,
    getUserTimeZone(),
  );
}

export function buildEditTaskRecurrenceDraft(task?: SpacesTask | null): TaskCreateRecurrenceDraft {
  const base = buildDefaultTaskCreateRecurrenceDraft();
  const recurrence = task?.recurrence;
  if (!recurrence?.enabled) return base;

  const endsType = recurrence.ends?.type || (recurrence.endDate ? 'on_date' : recurrence.maxOccurrences ? 'after' : 'never');
  const frequency = String(recurrence.frequency || '').trim().toLowerCase();
  return normalizeCreateTaskRecurrenceDraft({
    ...base,
    enabled: true,
    frequency: frequency === 'weekly' || frequency === 'monthly' ? frequency : 'daily',
    interval: Number(recurrence.interval || 1),
    weekDays:
      Array.isArray(recurrence.week_days) && recurrence.week_days.length
        ? recurrence.week_days
        : recurrence.dayOfWeek != null
          ? [Number(recurrence.dayOfWeek)]
          : base.weekDays,
    monthDay: Number(recurrence.month_day || recurrence.dayOfMonth || base.monthDay),
    time: String(recurrence.time || parseRecurrenceTimeLabel(recurrence.nextRunAt || undefined, base.time, recurrence.timezone)),
    timezone: normalizeUserTimeZone(recurrence.timezone, getUserTimeZone()),
    ends: {
      type: endsType === 'on_date' || endsType === 'after' ? endsType : 'never',
      date:
        recurrence.ends?.date ||
        (recurrence.endDate ? new Date(recurrence.endDate).toISOString().slice(0, 10) : null),
      occurrences:
        recurrence.ends?.occurrences ??
        (Number(recurrence.maxOccurrences || 0) > 0 ? Number(recurrence.maxOccurrences) : base.ends.occurrences),
    },
  });
}

export function buildEditTaskRecurrencePayload(taskRecurrence: TaskCreateRecurrenceDraft) {
  return buildCreateTaskRecurrencePayload(taskRecurrence) || { enabled: false };
}
