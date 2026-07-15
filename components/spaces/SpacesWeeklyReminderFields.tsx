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
  repeatOccurrences: string;
  setRepeatOccurrences: (value: string) => void;
  disabled?: boolean;
  fieldName: string;
};

const REPEAT_CADENCE_OPTIONS = [
  { value: 'week', label: 'Week' },
  { value: 'hour', label: 'Hour' },
  { value: '2_minutes', label: '2 Minutes' },
];

const SpacesWeeklyReminderFields: React.FC<SpacesWeeklyReminderFieldsProps> = ({
  repeatCadence,
  setRepeatCadence,
  repeatWeekDays,
  setRepeatWeekDays,
  repeatWeekTime,
  setRepeatWeekTime,
  repeatOccurrences,
  setRepeatOccurrences,
  disabled = false,
  fieldName,
}) => {
  const hasCustomOccurrences = repeatOccurrences !== 'unlimited';
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
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Occurrences</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className={`flex min-h-11 items-center gap-2 rounded-xl border bg-white px-3 text-[13px] ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${!hasCustomOccurrences ? 'border-violet-400 ring-2 ring-violet-100' : 'border-slate-200'}`}>
            <input
              type="radio"
              name={fieldName}
              checked={!hasCustomOccurrences}
              onChange={() => setRepeatOccurrences('unlimited')}
              disabled={disabled}
              className="h-4 w-4 accent-violet-600"
            />
            <span className="font-medium text-slate-700">Unlimited</span>
          </label>

          <label className={`flex min-h-11 items-center gap-2 rounded-xl border bg-white px-3 text-[13px] ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${hasCustomOccurrences ? 'border-violet-400 ring-2 ring-violet-100' : 'border-slate-200'}`}>
            <input
              type="radio"
              name={fieldName}
              checked={hasCustomOccurrences}
              onChange={() => setRepeatOccurrences(hasCustomOccurrences ? repeatOccurrences : '5')}
              disabled={disabled}
              className="h-4 w-4 accent-violet-600"
            />
            <input
              type="number"
              min={1}
              max={999}
              step={1}
              value={hasCustomOccurrences ? repeatOccurrences : ''}
              onFocus={() => {
                if (!hasCustomOccurrences) setRepeatOccurrences('5');
              }}
              onChange={(event) => setRepeatOccurrences(event.target.value)}
              onBlur={() => {
                if (hasCustomOccurrences && (!Number.isFinite(Number(repeatOccurrences)) || Number(repeatOccurrences) < 1)) {
                  setRepeatOccurrences('1');
                }
              }}
              disabled={disabled}
              placeholder="5"
              aria-label="Number of occurrences"
              className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-[13px] font-semibold text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
            />
            <span className="text-slate-600">occurrences</span>
          </label>
        </div>
      </div>

      <p className="text-[11px] leading-5 text-slate-500">
        Each selected interval creates and emails a new task occurrence, whether the previous task is done or not.
      </p>
    </div>
  );
};

export default SpacesWeeklyReminderFields;
