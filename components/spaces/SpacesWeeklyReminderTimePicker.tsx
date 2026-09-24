import React from 'react';

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1).padStart(2, '0');
  return { value, label: value };
});

const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const value = String(index * 5).padStart(2, '0');
  return { value, label: value };
});

const MERIDIEM_OPTIONS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

export function parseWeeklyReminderTimeValue(timeValue?: string) {
  const [hourRaw = '09', minuteRaw = '00'] = String(timeValue || '09:00').split(':');
  const hour24 = Math.min(23, Math.max(0, Number(hourRaw) || 0));
  const minute = Math.min(59, Math.max(0, Number(minuteRaw) || 0));
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return {
    hour: String(hour12).padStart(2, '0'),
    minute: String(minute).padStart(2, '0'),
    meridiem: meridiem as 'AM' | 'PM',
  };
}

export function buildWeeklyReminderTimeValue(hour: string, minute: string, meridiem: 'AM' | 'PM') {
  const hourNumber = Math.min(12, Math.max(1, Number(hour) || 12));
  const minuteNumber = Math.min(59, Math.max(0, Number(minute) || 0));
  let hour24 = hourNumber % 12;
  if (meridiem === 'PM') {
    hour24 += 12;
  }

  return `${String(hour24).padStart(2, '0')}:${String(minuteNumber).padStart(2, '0')}`;
}

export function formatWeeklyReminderTimeLabel(timeValue?: string) {
  const parsed = parseWeeklyReminderTimeValue(timeValue);
  return `${parsed.hour}:${parsed.minute} ${parsed.meridiem}`;
}

interface SpacesWeeklyReminderTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showLabels?: boolean;
}

const selectClassName =
  'h-11 w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-[14px] font-semibold text-slate-800 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60';

const NativeSelect: React.FC<{
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  showLabel?: boolean;
  ariaLabel: string;
}> = ({ label, value, options, onChange, disabled, showLabel, ariaLabel }) => (
  <div className="min-w-0 flex-1">
    {showLabel ? (
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</div>
    ) : null}
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        className={selectClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">▾</span>
    </div>
  </div>
);

export const SpacesWeeklyReminderTimePicker: React.FC<SpacesWeeklyReminderTimePickerProps> = ({
  value,
  onChange,
  disabled = false,
  showLabels = false,
}) => {
  const selection = React.useMemo(() => parseWeeklyReminderTimeValue(value), [value]);

  const updateTime = (next: Partial<{ hour: string; minute: string; meridiem: 'AM' | 'PM' }>) => {
    onChange(
      buildWeeklyReminderTimeValue(
        next.hour ?? selection.hour,
        next.minute ?? selection.minute,
        next.meridiem ?? selection.meridiem,
      ),
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2 sm:gap-3">
        <NativeSelect
          label="Hour"
          ariaLabel="Hour"
          value={selection.hour}
          options={HOUR_OPTIONS}
          onChange={(nextHour) => updateTime({ hour: nextHour })}
          disabled={disabled}
          showLabel={showLabels}
        />
        <div className="hidden pb-3 text-lg font-semibold text-slate-300 sm:block">:</div>
        <NativeSelect
          label="Minute"
          ariaLabel="Minute"
          value={selection.minute}
          options={MINUTE_OPTIONS}
          onChange={(nextMinute) => updateTime({ minute: nextMinute })}
          disabled={disabled}
          showLabel={showLabels}
        />
        <NativeSelect
          label="AM / PM"
          ariaLabel="AM or PM"
          value={selection.meridiem}
          options={MERIDIEM_OPTIONS}
          onChange={(nextMeridiem) => updateTime({ meridiem: nextMeridiem as 'AM' | 'PM' })}
          disabled={disabled}
          showLabel={showLabels}
        />
      </div>
      <p className="rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200">
        Selected time: <span className="text-brand-red">{formatWeeklyReminderTimeLabel(value)}</span>
      </p>
    </div>
  );
};
