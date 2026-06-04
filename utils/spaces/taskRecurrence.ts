import type { TaskRecurrenceDraft } from '../../types/spaces';

export const NO_VISION_SELECTOR_VALUE = '__no_vision__';
export const EVERYDAY_REPEAT_VALUE = 'everyday';

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
    dayOfWeek: String(now.getDay()),
    dayOfMonth: String(now.getDate()),
    time: getDefaultRepeatTime(),
    startMonth: String(now.getMonth() + 1),
    endMonth: '12',
    repeatCount: '0',
  };
}

function parseTimeValue(timeValue: string) {
  const [rawHours = '9', rawMinutes = '0'] = String(timeValue || '').split(':');
  const hours = Math.max(0, Math.min(23, Number(rawHours) || 0));
  const minutes = Math.max(0, Math.min(59, Number(rawMinutes) || 0));
  return { hours, minutes };
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
