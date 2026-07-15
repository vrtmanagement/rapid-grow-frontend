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
  repeatFromDate: string;
  setRepeatFromDate: (value: string) => void;
  repeatToDate: string;
  setRepeatToDate: (value: string) => void;
  disabled?: boolean;
  fieldName?: string;
};

const REPEAT_CADENCE_OPTIONS = [
  { value: 'week', label: 'Week' },
  { value: 'hour', label: 'Hour' },
  { value: '2_minutes', label: '2 Minutes' },
];

const dateInputClassName =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60';

const SpacesWeeklyReminderFields: React.FC<SpacesWeeklyReminderFieldsProps> = ({
  repeatCadence,
  setRepeatCadence,
  repeatWeekDays,
  setRepeatWeekDays,
  repeatWeekTime,
  setRepeatWeekTime,
  repeatFromDate,
  setRepeatFromDate,
  repeatToDate,
  setRepeatToDate,
  disabled = false,
}) => {
  const selectedDays = Array.isArray(repeatWeekDays) ? repeatWeekDays : [];

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
    <div className="space-y-4 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
      <div>
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">For Every</label>
        <ThemedSelect
          value={repeatCadence}
          onChange={setRepeatCadence}
          options={REPEAT_CADENCE_OPTIONS}
          compact={true}
          fullWidthCompact={true}
          disabled={disabled}
        />

        {repeatCadence === 'week' ? (
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                Week Day
                <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">
                  (up to {MAX_WEEK_DAYS})
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
                      className={`inline-flex min-h-9 items-center rounded-xl border px-3 text-[12px] font-semibold transition ${
                        selected
                          ? 'border-violet-400 bg-violet-100 text-violet-800 ring-2 ring-violet-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50/60'
                      } ${disabled || atLimit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">Time</div>
              <SpacesWeeklyReminderTimePicker
                value={repeatWeekTime}
                onChange={setRepeatWeekTime}
                disabled={disabled}
              />
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            {repeatCadence === 'hour'
              ? 'The next occurrence activates one hour after the previous occurrence.'
              : 'Testing mode: the next occurrence activates two minutes after the previous occurrence.'}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
          Date range
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">From date</div>
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
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">To date</div>
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
      </div>

      <p className="text-[11px] leading-5 text-slate-500">
        Tasks repeat and email only between the selected from and to dates, on each selected interval.
      </p>
    </div>
  );
};

export default SpacesWeeklyReminderFields;
