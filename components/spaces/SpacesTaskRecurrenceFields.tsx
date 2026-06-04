import React from 'react';
import { ThemedSelect } from './SpacesFormControls';
import type { SelectOption, TaskRecurrenceDraft } from '../../types/spaces';

type SpacesTaskRecurrenceFieldsProps = {
  taskRecurrence: TaskRecurrenceDraft;
  setTaskRecurrence: React.Dispatch<React.SetStateAction<TaskRecurrenceDraft>>;
  isDateMode: boolean;
  dateFallbackNote: string;
  monthOptions: SelectOption[];
  dayOfMonthOptions: SelectOption[];
  timeOptions: SelectOption[];
  weekdayOptions: SelectOption[];
};

const SpacesTaskRecurrenceFields: React.FC<SpacesTaskRecurrenceFieldsProps> = ({
  taskRecurrence,
  setTaskRecurrence,
  isDateMode,
  dateFallbackNote,
  monthOptions,
  dayOfMonthOptions,
  timeOptions,
  weekdayOptions,
}) => (
  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-3.5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-700">Repeating Task</div>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={!!taskRecurrence?.enabled}
          onChange={(event) =>
            setTaskRecurrence((prev) => ({
              ...(prev || ({} as TaskRecurrenceDraft)),
              enabled: event.target.checked,
            }))
          }
          className="peer sr-only"
        />
        <span className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-brand-red/90" />
        <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </label>
    </div>

    <div className={`grid overflow-hidden transition-all duration-300 ease-out ${taskRecurrence?.enabled ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
      <div className="min-h-0">
        <div className="space-y-3 border-t border-slate-200 pt-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Repeat By</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'day', label: 'Day' },
                { value: 'date', label: 'Date' },
              ].map((option) => {
                const active = (taskRecurrence?.scheduleMode || 'day') === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setTaskRecurrence((prev) => ({
                        ...(prev || ({} as TaskRecurrenceDraft)),
                        scheduleMode: option.value as TaskRecurrenceDraft['scheduleMode'],
                      }))
                    }
                    className={`inline-flex h-9 items-center justify-center rounded-[18px] border px-4 text-[12px] font-semibold transition ${
                      active
                        ? 'border-brand-red bg-brand-red text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isDateMode ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">From</label>
                  <ThemedSelect
                    value={taskRecurrence?.startMonth || '1'}
                    onChange={(value) =>
                      setTaskRecurrence((prev) => {
                        const nextStart = Number(value || 1);
                        const prevEnd = Number(prev?.endMonth || nextStart);
                        return {
                          ...(prev || ({} as TaskRecurrenceDraft)),
                          startMonth: value,
                          endMonth: String(Math.max(nextStart, prevEnd)),
                        };
                      })
                    }
                    options={monthOptions}
                    compact={true}
                    fullWidthCompact={true}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">To</label>
                  <ThemedSelect
                    value={taskRecurrence?.endMonth || taskRecurrence?.startMonth || '12'}
                    onChange={(value) =>
                      setTaskRecurrence((prev) => ({
                        ...(prev || ({} as TaskRecurrenceDraft)),
                        endMonth: String(Math.max(Number(prev?.startMonth || 1), Number(value || prev?.startMonth || 1))),
                      }))
                    }
                    options={monthOptions.filter((option) => Number(option.value) >= Number(taskRecurrence?.startMonth || 1))}
                    compact={true}
                    fullWidthCompact={true}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Date</label>
                  <ThemedSelect
                    value={taskRecurrence?.dayOfMonth || '1'}
                    onChange={(value) =>
                      setTaskRecurrence((prev) => ({
                        ...(prev || ({} as TaskRecurrenceDraft)),
                        dayOfMonth: value,
                      }))
                    }
                    options={dayOfMonthOptions}
                    compact={true}
                    fullWidthCompact={true}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Time</label>
                  <ThemedSelect
                    value={taskRecurrence?.time || '09:00'}
                    onChange={(value) =>
                      setTaskRecurrence((prev) => ({
                        ...(prev || ({} as TaskRecurrenceDraft)),
                        time: value,
                      }))
                    }
                    options={timeOptions}
                    compact={true}
                    fullWidthCompact={true}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-red-100 bg-white px-3 py-2 text-[12px] text-slate-500">
                {dateFallbackNote}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Day</label>
                <ThemedSelect
                  value={taskRecurrence?.dayOfWeek || '0'}
                  onChange={(value) =>
                    setTaskRecurrence((prev) => ({
                      ...(prev || ({} as TaskRecurrenceDraft)),
                      dayOfWeek: value,
                    }))
                  }
                  options={weekdayOptions}
                  compact={true}
                  fullWidthCompact={true}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Time</label>
                <ThemedSelect
                  value={taskRecurrence?.time || '09:00'}
                  onChange={(value) =>
                    setTaskRecurrence((prev) => ({
                      ...(prev || ({} as TaskRecurrenceDraft)),
                      time: value,
                    }))
                  }
                  options={timeOptions}
                  compact={true}
                  fullWidthCompact={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default SpacesTaskRecurrenceFields;
