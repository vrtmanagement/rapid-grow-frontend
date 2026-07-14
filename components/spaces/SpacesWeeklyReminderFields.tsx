import React from 'react';
import { ThemedSelect } from './SpacesFormControls';
import { SpacesWeeklyReminderTimePicker } from './SpacesWeeklyReminderTimePicker';
import { WEEKDAY_SELECT_OPTIONS } from './spacesEmailReminderOptions';

type SpacesWeeklyReminderFieldsProps = {
  repeatCadence: string;
  setRepeatCadence: (value: string) => void;
  repeatWeekDay: string;
  setRepeatWeekDay: (value: string) => void;
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
  repeatWeekDay,
  setRepeatWeekDay,
  repeatWeekTime,
  setRepeatWeekTime,
  repeatOccurrences,
  setRepeatOccurrences,
  disabled = false,
  fieldName,
}) => {
  const hasCustomOccurrences = repeatOccurrences !== 'unlimited';

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
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(120px,1.35fr)_minmax(210px,2fr)]">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">Week Day</div>
              <ThemedSelect
                value={repeatWeekDay}
                onChange={setRepeatWeekDay}
                options={WEEKDAY_SELECT_OPTIONS}
                compact={true}
                fullWidthCompact={true}
                disabled={disabled}
              />
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
