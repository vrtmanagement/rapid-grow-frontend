import type {
  SelectOption,
  SpacesTaskRecurrence,
  TaskCreateRecurrenceDraft,
  TaskCreateRecurrenceEndsType,
  TaskRecurrenceDraft,
} from '../../types/spaces';
import { DEFAULT_USER_TIMEZONE, normalizeUserTimeZone } from '../timezone';

export const NO_VISION_SELECTOR_VALUE = '__no_vision__';
export const EVERYDAY_REPEAT_VALUE = 'everyday';
export const DEFAULT_DATE_REPEAT_INTERVAL_VALUE = '0.5';
export const TASK_RECURRENCE_DATE_INTERVAL_CUSTOM_FIELD = 'taskRecurrenceDateInterval';
export const DATE_REPEAT_INTERVAL_OPTIONS: SelectOption[] = [
  { value: '0.5', label: 'Every 30 minutes' },
  { value: '1', label: 'Every 1 hour' },
  { value: '2', label: 'Every 2 hours' },
  { value: '3', label: 'Every 3 hours' },
  { value: '6', label: 'Every 6 hours' },
  { value: '12', label: 'Every 12 hours' },
  { value: '24', label: 'Every 24 hours' },
];
export const TASK_CREATE_RECURRENCE_WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
export const TASK_CREATE_RECURRENCE_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
export const TASK_CREATE_RECURRENCE_DEFAULT_OCCURRENCES = 10;

function getDefaultRepeatTime() {
  const now = new Date();
  now.setSeconds(0, 0);
  const roundedMinutes = Math.ceil(now.getMinutes() / 30) * 30;
  if (roundedMinutes >= 60) {
    now.setHours(now.getHours() + 1, 0, 0, 0);
  } else {
    now.setMinutes(roundedMinutes, 0, 0);
  }
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function buildDefaultTaskRecurrenceDraft(): TaskRecurrenceDraft {
  const now = new Date();
  return {
    enabled: false,
    scheduleMode: 'day',
    interval: DEFAULT_DATE_REPEAT_INTERVAL_VALUE,
    dayOfWeek: String(now.getDay()),
    dayOfMonth: String(now.getDate()),
    time: getDefaultRepeatTime(),
    startMonth: String(now.getMonth() + 1),
    endMonth: '12',
    repeatCount: '0',
  };
}

export function buildDefaultTaskCreateRecurrenceDraft(): TaskCreateRecurrenceDraft {
  return {
    enabled: false,
    frequency: 'daily',
    interval: 1,
    weekDays: [0],
    monthDay: 1,
    time: '09:00',
    timezone: DEFAULT_USER_TIMEZONE,
    ends: {
      type: 'never',
      date: null,
      occurrences: TASK_CREATE_RECURRENCE_DEFAULT_OCCURRENCES,
    },
  };
}

export function buildTaskRecurrenceCustomFields(taskRecurrence: TaskRecurrenceDraft) {
  if (!taskRecurrence.enabled || taskRecurrence.scheduleMode !== 'day') {
    return {};
  }

  return {
    [TASK_RECURRENCE_DATE_INTERVAL_CUSTOM_FIELD]:
      String(taskRecurrence.interval || DEFAULT_DATE_REPEAT_INTERVAL_VALUE),
  };
}

function parseTimeValue(timeValue: string) {
  const [rawHours = '9', rawMinutes = '0'] = String(timeValue || '').split(':');
  const hours = Math.max(0, Math.min(23, Number(rawHours) || 0));
  const minutes = Math.max(0, Math.min(59, Number(rawMinutes) || 0));
  return { hours, minutes };
}

export function clampRecurrenceInterval(value: number | string, fallback = 1) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return fallback;
  return Math.max(1, Math.min(99, Math.round(normalized)));
}

export function clampRecurrenceOccurrences(value: number | string | null | undefined, fallback = TASK_CREATE_RECURRENCE_DEFAULT_OCCURRENCES) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return fallback;
  return Math.max(1, Math.min(999, Math.round(normalized)));
}

export function clampRecurrenceMonthDay(value: number | string, fallback = 1) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return fallback;
  return Math.max(1, Math.min(31, Math.round(normalized)));
}

export function getLastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function resolveMonthlyRepeatDay(year: number, monthIndex: number, selectedDay: number) {
  const targetDay = clampRecurrenceMonthDay(selectedDay);
  const lastDay = getLastDayOfMonth(year, monthIndex);
  return Math.min(targetDay, lastDay);
}

export function getMonthlyRepeatHint(monthDay: number) {
  const day = clampRecurrenceMonthDay(monthDay);
  if (day <= 28) {
    return 'Repeats on the same day each month.';
  }
  if (day === 29) {
    return 'Repeats on the 29th. In February, it uses the last day of the month (28th or 29th in a leap year).';
  }
  if (day === 30) {
    return 'Repeats on the 30th. In February, it uses the last day of the month.';
  }
  return 'Repeats on the 31st when available. In shorter months, it uses the last day of the month.';
}

export function normalizeCreateTaskRecurrenceDraft(
  draft?: Partial<TaskCreateRecurrenceDraft> | null,
): TaskCreateRecurrenceDraft {
  const base = buildDefaultTaskCreateRecurrenceDraft();
  const endsType = String(draft?.ends?.type || base.ends.type) as TaskCreateRecurrenceEndsType;
  const weekDays = Array.isArray(draft?.weekDays)
    ? draft!.weekDays
        .map((value) => Number(value))
        .filter((value, index, values) => Number.isInteger(value) && value >= 0 && value <= 6 && values.indexOf(value) === index)
        .sort((left, right) => left - right)
    : base.weekDays;

  return {
    enabled: Boolean(draft?.enabled),
    frequency:
      draft?.frequency === 'weekly' || draft?.frequency === 'monthly' ? draft.frequency : 'daily',
    interval: clampRecurrenceInterval(draft?.interval ?? base.interval),
    weekDays: weekDays.length ? weekDays : base.weekDays,
    monthDay: clampRecurrenceMonthDay(draft?.monthDay ?? base.monthDay),
    time: /^\d{2}:\d{2}$/.test(String(draft?.time || '')) ? String(draft?.time) : base.time,
    timezone: normalizeUserTimeZone(draft?.timezone, base.timezone || DEFAULT_USER_TIMEZONE),
    ends: {
      type: endsType === 'on_date' || endsType === 'after' ? endsType : 'never',
      date: draft?.ends?.date ? String(draft.ends.date) : null,
      occurrences:
        endsType === 'after'
          ? clampRecurrenceOccurrences(draft?.ends?.occurrences)
          : draft?.ends?.occurrences == null
            ? base.ends.occurrences
            : clampRecurrenceOccurrences(draft.ends.occurrences),
    },
  };
}

export function buildCreateTaskRecurrencePayload(draft: TaskCreateRecurrenceDraft): SpacesTaskRecurrence | undefined {
  const normalized = normalizeCreateTaskRecurrenceDraft(draft);
  if (!normalized.enabled) {
    return { enabled: false };
  }

  return {
    enabled: true,
    frequency: normalized.frequency,
    interval: normalized.interval,
    week_days: normalized.frequency === 'weekly' ? normalized.weekDays : [],
    month_day: normalized.frequency === 'monthly' ? normalized.monthDay : null,
    time: normalized.time,
    timezone: normalized.timezone,
    ends: {
      type: normalized.ends.type,
      date: normalized.ends.type === 'on_date' ? normalized.ends.date : null,
      occurrences:
        normalized.ends.type === 'after'
          ? clampRecurrenceOccurrences(normalized.ends.occurrences)
          : normalized.ends.occurrences ?? TASK_CREATE_RECURRENCE_DEFAULT_OCCURRENCES,
    },
  };
}

export function parseRecurrenceTimeParts(timeValue: string) {
  const { hours, minutes } = parseTimeValue(timeValue);
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return {
    hour: String(displayHour),
    minute: String(minutes).padStart(2, '0'),
    meridiem,
  };
}

export function buildRecurrenceTimeValue(hourValue: string, minuteValue: string, meridiemValue: string) {
  const hour = Math.max(1, Math.min(12, Number(hourValue) || 12));
  const minute = ['00', '15', '30', '45'].includes(String(minuteValue)) ? String(minuteValue) : '00';
  const meridiem = String(meridiemValue || 'AM').toUpperCase() === 'PM' ? 'PM' : 'AM';
  const normalizedHour = meridiem === 'PM' ? (hour % 12) + 12 : hour % 12;
  return `${String(normalizedHour).padStart(2, '0')}:${minute}`;
}

function clampLocalDayOfMonth(year: number, monthIndex: number, dayOfMonth: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.max(1, Math.min(lastDay, dayOfMonth));
}

function buildLocalScheduledDate(year: number, monthIndex: number, dayOfMonth: number, timeValue: string) {
  const safeDay = clampLocalDayOfMonth(year, monthIndex, dayOfMonth);
  const { hours, minutes } = parseTimeValue(timeValue);
  return new Date(year, monthIndex, safeDay, hours, minutes, 0, 0);
}

export function buildNextDayModeRun(dayOfWeek: string, timeValue: string, fromDate = new Date()) {
  const now = new Date(fromDate);
  const candidate = new Date(now);
  const { hours, minutes } = parseTimeValue(timeValue);
  candidate.setSeconds(0, 0);
  candidate.setHours(hours, minutes, 0, 0);

  if (dayOfWeek === EVERYDAY_REPEAT_VALUE) {
    if (candidate.getTime() <= now.getTime()) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  const targetDay = Number(dayOfWeek);
  const safeTargetDay = Number.isInteger(targetDay) ? Math.max(0, Math.min(6, targetDay)) : now.getDay();
  let offset = (safeTargetDay - now.getDay() + 7) % 7;
  if (offset === 0 && candidate.getTime() <= now.getTime()) {
    offset = 7;
  }
  candidate.setDate(candidate.getDate() + offset);
  return candidate;
}

export function buildNextDateModeRun(
  dayOfMonth: string,
  startMonth: string,
  endMonth: string,
  timeValue: string,
  fromDate = new Date(),
) {
  const now = new Date(fromDate);
  const targetDay = Math.max(1, Math.min(31, Number(dayOfMonth) || 1));
  const start = Math.max(1, Math.min(12, Number(startMonth) || now.getMonth() + 1));
  const end = Math.max(start, Math.min(12, Number(endMonth) || start));

  for (let yearOffset = 0; yearOffset < 3; yearOffset += 1) {
    const year = now.getFullYear() + yearOffset;
    for (let month = start; month <= end; month += 1) {
      const candidate = buildLocalScheduledDate(year, month - 1, targetDay, timeValue);
      if (candidate.getTime() > now.getTime()) {
        return candidate;
      }
    }
  }

  return buildLocalScheduledDate(now.getFullYear() + 1, start - 1, targetDay, timeValue);
}

export function formatTime(timeValue: string) {
  const { hour, minute, meridiem } = parseRecurrenceTimeParts(timeValue);
  return `${hour}:${minute} ${meridiem}`;
}

function getZonedDateParts(value: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(value)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(map.year || 0),
    month: Number(map.month || 0),
    date: Number(map.day || 0),
    hour: Number(map.hour || 0) % 24,
    minute: Number(map.minute || 0),
    day: weekdayMap[map.weekday] ?? 0,
  };
}

function getTimeZoneOffsetMinutes(timeZone: string, value: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const timeZoneName =
    formatter.formatToParts(value).find((part) => part.type === 'timeZoneName')?.value || 'GMT+0';
  const match = timeZoneName.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2] || 0) * 60 + Number(match[3] || 0));
}

function zonedLocalToUtc(
  parts: { year: number; month: number; date: number; hour?: number; minute?: number; second?: number },
  timeZone: string,
) {
  let utcMs = Date.UTC(
    parts.year,
    (parts.month || 1) - 1,
    parts.date || 1,
    parts.hour || 0,
    parts.minute || 0,
    parts.second || 0,
    0,
  );
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, new Date(utcMs));
    const adjustedUtcMs =
      Date.UTC(
        parts.year,
        (parts.month || 1) - 1,
        parts.date || 1,
        parts.hour || 0,
        parts.minute || 0,
        parts.second || 0,
        0,
      ) -
      offsetMinutes * 60000;
    if (adjustedUtcMs === utcMs) break;
    utcMs = adjustedUtcMs;
  }
  return new Date(utcMs);
}

function addZonedCalendarDays(
  parts: { year: number; month: number; date: number },
  dayDelta: number,
) {
  const cursor = new Date(Date.UTC(parts.year, (parts.month || 1) - 1, parts.date || 1));
  cursor.setUTCDate(cursor.getUTCDate() + dayDelta);
  return {
    year: cursor.getUTCFullYear(),
    month: cursor.getUTCMonth() + 1,
    date: cursor.getUTCDate(),
  };
}

export function getNextOccurrences(
  recurrence: Pick<SpacesTaskRecurrence, 'frequency' | 'interval' | 'week_days' | 'month_day' | 'time' | 'ends' | 'timezone'>,
  fromDate = new Date(),
  limit = 50,
) {
  const timeZone = normalizeUserTimeZone(recurrence?.timezone, DEFAULT_USER_TIMEZONE);
  const normalizedTime = /^\d{2}:\d{2}$/.test(String(recurrence?.time || '')) ? String(recurrence?.time) : '09:00';
  const { hours, minutes } = parseTimeValue(normalizedTime);
  const occurrences: Date[] = [];
  const fromParts = getZonedDateParts(fromDate, timeZone);
  let calendar = { year: fromParts.year, month: fromParts.month, date: fromParts.date };
  let cursor = zonedLocalToUtc({ ...calendar, hour: hours, minute: minutes }, timeZone);

  if (cursor.getTime() <= new Date(fromDate).getTime()) {
    calendar = addZonedCalendarDays(calendar, 1);
    cursor = zonedLocalToUtc({ ...calendar, hour: hours, minute: minutes }, timeZone);
  }

  const selectedMonthDay =
    recurrence.frequency === 'monthly' ? clampRecurrenceMonthDay(recurrence.month_day ?? 1) : 1;
  let tries = 0;
  while (occurrences.length < limit && tries < 1000) {
    tries += 1;
    let match = false;
    const weekday = new Date(Date.UTC(calendar.year, calendar.month - 1, calendar.date)).getUTCDay();

    if (recurrence.frequency === 'daily') {
      match = true;
    } else if (recurrence.frequency === 'weekly') {
      const mappedDay = weekday === 0 ? 6 : weekday - 1;
      match = Array.isArray(recurrence.week_days) && recurrence.week_days.includes(mappedDay);
    } else if (recurrence.frequency === 'monthly') {
      match =
        calendar.date ===
        resolveMonthlyRepeatDay(calendar.year, calendar.month - 1, selectedMonthDay);
    }

    if (match) {
      if (recurrence.ends?.type === 'on_date' && recurrence.ends.date) {
        const [year, month, date] = String(recurrence.ends.date).split('-').map(Number);
        const endAt = zonedLocalToUtc({ year, month, date, hour: 23, minute: 59, second: 59 }, timeZone);
        if (cursor > endAt) break;
      }
      if (recurrence.ends?.type === 'after') {
        const maxOccurrences = clampRecurrenceOccurrences(recurrence.ends.occurrences, TASK_CREATE_RECURRENCE_DEFAULT_OCCURRENCES);
        if (occurrences.length >= maxOccurrences) break;
      }

      occurrences.push(new Date(cursor));
    }

    if (recurrence.frequency === 'daily') {
      calendar = addZonedCalendarDays(calendar, clampRecurrenceInterval(recurrence.interval, 1));
    } else if (recurrence.frequency === 'weekly') {
      calendar = addZonedCalendarDays(calendar, 1);
      const nextWeekday = new Date(Date.UTC(calendar.year, calendar.month - 1, calendar.date)).getUTCDay();
      if (nextWeekday === 1 && clampRecurrenceInterval(recurrence.interval, 1) > 1) {
        calendar = addZonedCalendarDays(calendar, (clampRecurrenceInterval(recurrence.interval, 1) - 1) * 7);
      }
    } else if (recurrence.frequency === 'monthly') {
      if (match) {
        const nextMonthIndex = calendar.month - 1 + clampRecurrenceInterval(recurrence.interval, 1);
        const nextYear = calendar.year + Math.floor(nextMonthIndex / 12);
        const normalizedMonth = ((nextMonthIndex % 12) + 12) % 12;
        const resolvedDay = resolveMonthlyRepeatDay(nextYear, normalizedMonth, selectedMonthDay);
        calendar = { year: nextYear, month: normalizedMonth + 1, date: resolvedDay };
      } else {
        calendar = addZonedCalendarDays(calendar, 1);
      }
    }
    cursor = zonedLocalToUtc({ ...calendar, hour: hours, minute: minutes }, timeZone);
  }

  return occurrences;
}

function ordinal(value: number) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const remainder = value % 100;
  return `${value}${suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]}`;
}

export function buildSummaryText(recurrence: Pick<SpacesTaskRecurrence, 'frequency' | 'interval' | 'week_days' | 'month_day' | 'time' | 'ends' | 'timezone'>) {
  const interval = clampRecurrenceInterval(recurrence.interval, 1);
  const timeStr = formatTime(String(recurrence.time || '09:00'));
  let frequencyText = '';

  if (recurrence.frequency === 'daily') {
    frequencyText = interval === 1 ? 'Every day' : `Every ${interval} days`;
  } else if (recurrence.frequency === 'weekly') {
    const names = (Array.isArray(recurrence.week_days) ? recurrence.week_days : [0])
      .slice()
      .sort((left, right) => left - right)
      .map((dayIndex) => TASK_CREATE_RECURRENCE_DAY_NAMES[dayIndex] || TASK_CREATE_RECURRENCE_DAY_NAMES[0])
      .join(', ');
    frequencyText = interval === 1 ? `Every week on ${names}` : `Every ${interval} weeks on ${names}`;
  } else {
    const monthDay = clampRecurrenceMonthDay(recurrence.month_day ?? 1);
    const dayLabel =
      monthDay > 28 ? `${ordinal(monthDay)} (or last day in shorter months)` : ordinal(monthDay);
    frequencyText =
      interval === 1
        ? `Every month on the ${dayLabel}`
        : `Every ${interval} months on the ${dayLabel}`;
  }

  let endsText = '';
  if (recurrence.ends?.type === 'never') {
    endsText = ' · No end date';
  } else if (recurrence.ends?.type === 'on_date' && recurrence.ends.date) {
    const endDate = new Date(`${recurrence.ends.date}T00:00:00`);
    endsText = ` · Until ${endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  } else if (recurrence.ends?.type === 'after') {
    const occurrences = clampRecurrenceOccurrences(recurrence.ends.occurrences, TASK_CREATE_RECURRENCE_DEFAULT_OCCURRENCES);
    endsText = ` · Stops after ${occurrences} occurrence${occurrences === 1 ? '' : 's'}`;
  }

  return `${frequencyText} at ${timeStr}${endsText}`;
}

export function formatOccurrenceChipLabel(date: Date, timeZone?: string) {
  const tz = normalizeUserTimeZone(timeZone, DEFAULT_USER_TIMEZONE);
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  });
  const timeLabel = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  });
  return `${dateLabel} · ${timeLabel}`;
}

export function formatChecklistIntervalLabel(value: string | number) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return '1 hour';
  const minutes = Math.round(hours * 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  if (minutes % 60 === 0) {
    const wholeHours = minutes / 60;
    return `${wholeHours} hour${wholeHours === 1 ? '' : 's'}`;
  }
  return `${minutes} minutes`;
}
