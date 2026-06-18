import React from 'react';
import type { TaskCreateRecurrenceDraft, TaskCreateRecurrenceFrequency } from '../../types/spaces';
import {
  buildCreateTaskRecurrencePayload,
  buildRecurrenceTimeValue,
  buildSummaryText,
  clampRecurrenceInterval,
  clampRecurrenceMonthDay,
  clampRecurrenceOccurrences,
  formatOccurrenceChipLabel,
  getMonthlyRepeatHint,
  getNextOccurrences,
  normalizeCreateTaskRecurrenceDraft,
  parseRecurrenceTimeParts,
  TASK_CREATE_RECURRENCE_DEFAULT_OCCURRENCES,
  TASK_CREATE_RECURRENCE_WEEKDAY_LABELS,
} from '../../utils/spaces/taskRecurrence';

type SpacesTaskCreateRecurrenceFieldsProps = {
  taskRecurrence: TaskCreateRecurrenceDraft;
  setTaskRecurrence: React.Dispatch<React.SetStateAction<TaskCreateRecurrenceDraft>>;
};

const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => {
  const day = index + 1;
  const suffix =
    day % 10 === 1 && day % 100 !== 11
      ? 'st'
      : day % 10 === 2 && day % 100 !== 12
        ? 'nd'
        : day % 10 === 3 && day % 100 !== 13
          ? 'rd'
          : 'th';
  return { value: String(day), label: `${day}${suffix}` };
});

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];
const MERIDIEM_OPTIONS = ['AM', 'PM'];

const SpacesTaskCreateRecurrenceFields: React.FC<SpacesTaskCreateRecurrenceFieldsProps> = ({
  taskRecurrence,
  setTaskRecurrence,
}) => {
  const normalizedDraft = React.useMemo(
    () => normalizeCreateTaskRecurrenceDraft(taskRecurrence),
    [taskRecurrence],
  );

  const { hour, minute, meridiem } = React.useMemo(
    () => parseRecurrenceTimeParts(normalizedDraft.time),
    [normalizedDraft.time],
  );

  const recurrencePayload = React.useMemo(
    () => buildCreateTaskRecurrencePayload({ ...normalizedDraft, enabled: true }),
    [normalizedDraft],
  );
  const previewSummary = React.useMemo(
    () => buildSummaryText(recurrencePayload || { enabled: true, frequency: 'daily', interval: 1, time: '09:00', ends: { type: 'never', date: null, occurrences: TASK_CREATE_RECURRENCE_DEFAULT_OCCURRENCES } }),
    [recurrencePayload],
  );
  const previewOccurrences = React.useMemo(
    () => (recurrencePayload ? getNextOccurrences(recurrencePayload, new Date(), 4) : []),
    [recurrencePayload],
  );

  const updateDraft = React.useCallback(
    (updater: (prev: TaskCreateRecurrenceDraft) => TaskCreateRecurrenceDraft) => {
      setTaskRecurrence((prev) => normalizeCreateTaskRecurrenceDraft(updater(normalizeCreateTaskRecurrenceDraft(prev))));
    },
    [setTaskRecurrence],
  );

  const toggleEnabled = React.useCallback(
    (enabled: boolean) => {
      setTaskRecurrence((prev) => {
        const base = normalizeCreateTaskRecurrenceDraft(prev);
        return enabled ? { ...base, enabled: true } : { ...base, enabled: false };
      });
    },
    [setTaskRecurrence],
  );

  const updateFrequency = React.useCallback(
    (frequency: TaskCreateRecurrenceFrequency) => {
      updateDraft((prev) => ({
        ...prev,
        frequency,
        weekDays: frequency === 'weekly' ? prev.weekDays : prev.weekDays.length ? prev.weekDays : [0],
        monthDay: frequency === 'monthly' ? prev.monthDay : prev.monthDay || 1,
      }));
    },
    [updateDraft],
  );

  const intervalUnitLabel =
    normalizedDraft.frequency === 'daily'
      ? 'day(s)'
      : normalizedDraft.frequency === 'weekly'
        ? 'week(s)'
        : 'month(s)';

  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-700">Repeating Task</div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={normalizedDraft.enabled}
            onChange={(event) => toggleEnabled(event.target.checked)}
            className="peer sr-only"
          />
          <span className="h-7 w-12 rounded-full bg-[#ccc] transition peer-checked:bg-brand-red" />
          <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
        </label>
      </div>

      {normalizedDraft.enabled ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="space-y-4">
            <div>
              <label className="rt-section-label">Frequency</label>
              <div className="rt-frequency-tabs mt-2">
                {(['daily', 'weekly', 'monthly'] as TaskCreateRecurrenceFrequency[]).map((frequency) => {
                  const active = normalizedDraft.frequency === frequency;
                  return (
                    <button
                      key={frequency}
                      type="button"
                      onClick={() => updateFrequency(frequency)}
                      className={`rt-freq-tab ${active ? 'is-active' : ''}`}
                    >
                      {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="rt-section-label">Every</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  value={normalizedDraft.interval}
                  onChange={(event) =>
                    updateDraft((prev) => ({
                      ...prev,
                      interval: clampRecurrenceInterval(event.target.value, prev.interval),
                    }))
                  }
                  className="rt-number-input"
                />
                <span className="text-[14px] text-slate-700">{intervalUnitLabel}</span>
              </div>
            </div>

            {normalizedDraft.frequency === 'weekly' ? (
              <div>
                <label className="rt-section-label">On Days</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TASK_CREATE_RECURRENCE_WEEKDAY_LABELS.map((label, index) => {
                    const selected = normalizedDraft.weekDays.includes(index);
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          updateDraft((prev) => {
                            const alreadySelected = prev.weekDays.includes(index);
                            if (alreadySelected && prev.weekDays.length === 1) {
                              return prev;
                            }
                            const nextWeekDays = alreadySelected
                              ? prev.weekDays.filter((day) => day !== index)
                              : [...prev.weekDays, index].sort((left, right) => left - right);
                            return { ...prev, weekDays: nextWeekDays };
                          })
                        }
                        className={`rt-day-pill ${selected ? 'is-selected' : ''}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {normalizedDraft.frequency === 'monthly' ? (
              <div>
                <label className="rt-section-label">On The</label>
                <div className="mt-2 space-y-2">
                  <select
                    value={String(normalizedDraft.monthDay)}
                    onChange={(event) =>
                      updateDraft((prev) => ({
                        ...prev,
                        monthDay: clampRecurrenceMonthDay(event.target.value, prev.monthDay),
                      }))
                    }
                    className="rt-select rt-select-full"
                  >
                    {MONTH_DAY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-[14px] text-slate-700">of each month</div>
                  <div className="text-[12px] leading-[1.5] text-slate-500">
                    {getMonthlyRepeatHint(normalizedDraft.monthDay)}
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <label className="rt-section-label">At Time</label>
              <div className="rt-time-row mt-2">
                <select
                  value={hour}
                  onChange={(event) =>
                    updateDraft((prev) => ({
                      ...prev,
                      time: buildRecurrenceTimeValue(event.target.value, minute, meridiem),
                    }))
                  }
                  className="rt-select rt-time-select"
                >
                  {HOUR_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  value={minute}
                  onChange={(event) =>
                    updateDraft((prev) => ({
                      ...prev,
                      time: buildRecurrenceTimeValue(hour, event.target.value, meridiem),
                    }))
                  }
                  className="rt-select rt-time-select"
                >
                  {MINUTE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      :{option}
                    </option>
                  ))}
                </select>
                <select
                  value={meridiem}
                  onChange={(event) =>
                    updateDraft((prev) => ({
                      ...prev,
                      time: buildRecurrenceTimeValue(hour, minute, event.target.value),
                    }))
                  }
                  className="rt-select rt-time-select rt-time-meridiem"
                >
                  {MERIDIEM_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="rt-section-label">Ends</label>
              <div className="rt-ends-group mt-2">
                <label className="rt-radio-row rt-radio-option">
                  <input
                    type="radio"
                    name="task-create-recurrence-ends"
                    checked={normalizedDraft.ends.type === 'never'}
                    onChange={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        ends: { ...prev.ends, type: 'never', date: null },
                      }))
                    }
                    className="h-4 w-4 accent-brand-red"
                  />
                  <span>Never</span>
                </label>

                <label className="rt-radio-row rt-radio-option">
                  <input
                    type="radio"
                    name="task-create-recurrence-ends"
                    checked={normalizedDraft.ends.type === 'on_date'}
                    onChange={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        ends: { ...prev.ends, type: 'on_date', date: prev.ends.date || new Date().toISOString().slice(0, 10) },
                      }))
                    }
                    className="h-4 w-4 accent-brand-red"
                  />
                  <span>On date</span>
                  {normalizedDraft.ends.type === 'on_date' ? (
                    <input
                      type="date"
                      value={normalizedDraft.ends.date || ''}
                      onChange={(event) =>
                        updateDraft((prev) => ({
                          ...prev,
                          ends: { ...prev.ends, date: event.target.value || null },
                        }))
                      }
                      className="rt-inline-input"
                    />
                  ) : null}
                </label>

                <label className="rt-radio-row rt-radio-option">
                  <input
                    type="radio"
                    name="task-create-recurrence-ends"
                    checked={normalizedDraft.ends.type === 'after'}
                    onChange={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        ends: {
                          ...prev.ends,
                          type: 'after',
                          occurrences: clampRecurrenceOccurrences(prev.ends.occurrences),
                        },
                      }))
                    }
                    className="h-4 w-4 accent-brand-red"
                  />
                  <span>After</span>
                  {normalizedDraft.ends.type === 'after' ? (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        step={1}
                        value={normalizedDraft.ends.occurrences ?? TASK_CREATE_RECURRENCE_DEFAULT_OCCURRENCES}
                        onChange={(event) =>
                          updateDraft((prev) => ({
                            ...prev,
                            ends: {
                              ...prev.ends,
                              occurrences: clampRecurrenceOccurrences(event.target.value),
                            },
                          }))
                        }
                        className="rt-inline-input rt-inline-number"
                      />
                      <span className="text-[13px] text-slate-600">occurrences</span>
                    </>
                  ) : null}
                </label>
              </div>
            </div>

            <div className="rt-preview">
              <div className="rt-preview-label">Preview</div>
              <div className="rt-preview-summary">{previewSummary}</div>
              <div className="mt-2 text-[13px] leading-[1.5] text-slate-600">Next occurrences:</div>
              <div className="rt-preview-occurrences mt-2">
                {previewOccurrences.map((occurrence) => (
                  <span key={occurrence.toISOString()} className="rt-chip">
                    {formatOccurrenceChipLabel(occurrence)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] leading-[1.5] text-slate-400">
          Turn on repeating task to configure a recurring schedule.
        </div>
      )}
    </div>
  );
};

export default SpacesTaskCreateRecurrenceFields;
