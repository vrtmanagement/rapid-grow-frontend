import React from 'react';
import { ThemedSelect } from './SpacesFormControls';
import { SpacesWeeklyReminderTimePicker } from './SpacesWeeklyReminderTimePicker';
import { WEEKDAY_SELECT_OPTIONS } from './spacesEmailReminderOptions';

const MAX_WEEK_DAYS = 6;

type SpacesWeeklyReminderFieldsProps = {
  repeatCadence: string;
  setRepeatCadence: (value: string) => void;
  repeatWeekDays: string[];
  setRepeatWeekDays: (value: string[]) => void;
  repeatWeekTime: string;
  setRepeatWeekTime: (value: string) => void;
  repeatMonthDay: number;
  setRepeatMonthDay: (value: number) => void;
  repeatFromDate: string;
  setRepeatFromDate: (value: string) => void;
  repeatToDate: string;
  setRepeatToDate: (value: string) => void;
  disabled?: boolean;
  fieldName?: string;
};

export const REPEAT_CADENCE_OPTIONS = [
  { value: 'week', label: 'Every week' },
  { value: 'month', label: 'Every month' },
  { value: '2_months', label: 'Every 2 months' },
  { value: '3_months', label: 'Every 3 months' },
  { value: '6_months', label: 'Every 6 months' },
  { value: 'year', label: 'Every year' },
  { value: 'hour', label: 'Every hour' },
  { value: '2_minutes', label: 'Every 2 minutes (test)' },
];

const CALENDAR_CADENCES = new Set(['week', 'month', '2_months', '3_months', '6_months', 'year']);
const MONTH_DAY_CADENCES = new Set(['month', '2_months', '3_months', '6_months', 'year']);

function dayOrdinal(day: number) {
  const rem10 = day % 10;
  const rem100 = day % 100;
  if (rem10 === 1 && rem100 !== 11) return `${day}st`;
  if (rem10 === 2 && rem100 !== 12) return `${day}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${day}rd`;
  return `${day}th`;
}

const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => {
  const day = index + 1;
  return { value: String(day), label: dayOrdinal(day) };
});

function cadenceHelperText(cadence: string, monthDay: number) {
  const onDay = `on the ${dayOrdinal(monthDay)}`;
  switch (cadence) {
    case 'week':
      return 'Sends on the selected weekdays at the chosen time.';
    case 'month':
      return `Sends once every month ${onDay} at the chosen time.`;
    case '2_months':
      return `Sends once every 2 months ${onDay} at the chosen time.`;
    case '3_months':
      return `Sends once every 3 months ${onDay} at the chosen time.`;
    case '6_months':
      return `Sends once every 6 months ${onDay} at the chosen time.`;
    case 'year':
      return `Sends once every year ${onDay} at the chosen time.`;
    case 'hour':
      return 'Sends again one hour after the previous reminder.';
    case '2_minutes':
      return 'Testing mode: sends again two minutes after the previous reminder.';
    default:
      return 'Reminder emails send on each selected interval between the from and to dates.';
  }
}

const fieldLabelClass =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600';
const hintClass = 'text-[12px] leading-5 text-slate-500';
const dateInputClassName =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60';

const SpacesWeeklyReminderFields: React.FC<SpacesWeeklyReminderFieldsProps> = ({
  repeatCadence,
  setRepeatCadence,
  repeatWeekDays,
  setRepeatWeekDays,
  repeatWeekTime,
  setRepeatWeekTime,
  repeatMonthDay,
  setRepeatMonthDay,
  repeatFromDate,
  setRepeatFromDate,
  repeatToDate,
  setRepeatToDate,
  disabled = false,
}) => {
  const selectedDays = Array.isArray(repeatWeekDays) ? repeatWeekDays : [];
  const showWeekDays = repeatCadence === 'week';
  const showMonthDay = MONTH_DAY_CADENCES.has(repeatCadence);
  const showTime = CALENDAR_CADENCES.has(repeatCadence);
  const safeMonthDay = Math.min(31, Math.max(1, Number(repeatMonthDay) || 1));

  const toggleWeekDay = (dayValue: string) => {
    if (disabled) return;
    const alreadySelected = selectedDays.includes(dayValue);
    if (alreadySelected) {
      if (selectedDays.length <= 1) return;
      setRepeatWeekDays(selectedDays.filter((day) => day !== dayValue));
      return;
    }
    if (selectedDays.length >= MAX_WEEK_DAYS) return;
    const next = [...selectedDays, dayValue].sort((left, right) => {
      const leftOrder = left === '0' ? 7 : Number(left);
      const rightOrder = right === '0' ? 7 : Number(right);
      return leftOrder - rightOrder;
    });
    setRepeatWeekDays(next);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div>
        <label className={fieldLabelClass}>How often</label>
        <ThemedSelect
          value={repeatCadence}
          onChange={setRepeatCadence}
          options={REPEAT_CADENCE_OPTIONS}
          compact={true}
          fullWidthCompact={true}
          disabled={disabled}
        />
        <p className={`mt-2 ${hintClass}`}>{cadenceHelperText(repeatCadence, safeMonthDay)}</p>
      </div>

      {showMonthDay ? (
        <div>
          <label className={fieldLabelClass}>On which day of the month</label>
          <ThemedSelect
            value={String(safeMonthDay)}
            onChange={(value) => setRepeatMonthDay(Number(value) || 1)}
            options={MONTH_DAY_OPTIONS}
            compact={true}
            fullWidthCompact={true}
            disabled={disabled}
          />
          <p className={`mt-2 ${hintClass}`}>
            Mail sends on the {dayOrdinal(safeMonthDay)} each cycle. Shorter months use the last day
            (e.g. the 31st becomes the 28th/29th/30th).
          </p>
        </div>
      ) : null}

      {showWeekDays ? (
        <div>
          <div className={fieldLabelClass}>
            On which days
            <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">
              (pick up to {MAX_WEEK_DAYS})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_SELECT_OPTIONS.map((option) => {
              const selected = selectedDays.includes(option.value);
              const atLimit = !selected && selectedDays.length >= MAX_WEEK_DAYS;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled || atLimit}
                  onClick={() => toggleWeekDay(option.value)}
                  className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-[12px] font-semibold transition ${
                    selected
                      ? 'border-brand-red bg-brand-red text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50/70'
                  } ${disabled || atLimit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  {option.label.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {showTime ? (
        <div>
          <div className={fieldLabelClass}>At what time</div>
          <SpacesWeeklyReminderTimePicker
            value={repeatWeekTime}
            onChange={setRepeatWeekTime}
            disabled={disabled}
            showLabels={true}
          />
        </div>
      ) : null}

      <div>
        <div className={fieldLabelClass}>Active between</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">From</div>
            <input
              type="date"
              value={repeatFromDate}
              min={new Date().toISOString().slice(0, 10)}
              max={repeatToDate || undefined}
              onChange={(event) => {
                const nextFrom = event.target.value;
                setRepeatFromDate(nextFrom);
                if (repeatToDate && nextFrom && repeatToDate < nextFrom) {
                  setRepeatToDate(nextFrom);
                }
              }}
              disabled={disabled}
              aria-label="Repeat from date"
              className={dateInputClassName}
            />
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">To</div>
            <input
              type="date"
              value={repeatToDate}
              min={repeatFromDate || new Date().toISOString().slice(0, 10)}
              onChange={(event) => setRepeatToDate(event.target.value)}
              disabled={disabled}
              aria-label="Repeat to date"
              className={dateInputClassName}
            />
          </div>
        </div>
        <p className={`mt-2 ${hintClass}`}>
          From and to only set the active window—not the send day. Reminders send on the schedule above
          inside this range. For “Remind until done”, they keep going until the task is marked done (or
          the to date passes).
        </p>
      </div>
    </div>
  );
};

export default SpacesWeeklyReminderFields;
