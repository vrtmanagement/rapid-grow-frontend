import React from 'react';
import { ThemedSelect } from './SpacesFormControls';

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
    <div className="grid grid-cols-3 gap-2">
      <div>
        {showLabels ? <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">Hour</div> : null}
        <ThemedSelect
          value={selection.hour}
          onChange={(nextHour) => updateTime({ hour: nextHour })}
          options={HOUR_OPTIONS}
          compact={true}
          fullWidthCompact={true}
          disabled={disabled}
        />
      </div>
      <div>
        {showLabels ? <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">5 Min</div> : null}
        <ThemedSelect
          value={selection.minute}
          onChange={(nextMinute) => updateTime({ minute: nextMinute })}
          options={MINUTE_OPTIONS}
          compact={true}
          fullWidthCompact={true}
          disabled={disabled}
        />
      </div>
      <div>
        {showLabels ? <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">AM / PM</div> : null}
        <ThemedSelect
          value={selection.meridiem}
          onChange={(nextMeridiem) => updateTime({ meridiem: nextMeridiem as 'AM' | 'PM' })}
          options={MERIDIEM_OPTIONS}
          compact={true}
          fullWidthCompact={true}
          disabled={disabled}
        />
      </div>
    </div>
  );
};
