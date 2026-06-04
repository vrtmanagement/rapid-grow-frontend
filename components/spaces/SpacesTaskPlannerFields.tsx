import React from 'react';
import { ThemedSelect } from './SpacesFormControls';
import type { SelectOption } from '../../types/spaces';

type SpacesTaskPlannerFieldsProps = {
  hideWeeklyPlanner?: boolean;
  addToWeeklyPlanner: boolean;
  setAddToWeeklyPlanner: (value: boolean) => void;
  plannerSummary: string;
  plannerQuarterLabel: string;
  setPlannerQuarterLabel: (value: string) => void;
  plannerMonthLabel: string;
  setPlannerMonthLabel: (value: string) => void;
  normalizedPlannerWeekOptions: SelectOption[];
  parsePlannerLabel: (label: string) => { quarter: string; month: string; week: string };
  plannerQuarterOptions: SelectOption[];
  plannerMonthOptions: SelectOption[];
  compactPlannerWeekOptions: SelectOption[];
  plannerWeekId: string;
  setPlannerWeekId: (value: string) => void;
  plannerDayOptions: SelectOption[];
  plannerDayId: string;
  setPlannerDayId: (value: string) => void;
};

const SpacesTaskPlannerFields: React.FC<SpacesTaskPlannerFieldsProps> = ({
  hideWeeklyPlanner = false,
  addToWeeklyPlanner,
  setAddToWeeklyPlanner,
  plannerSummary,
  plannerQuarterLabel,
  setPlannerQuarterLabel,
  plannerMonthLabel,
  setPlannerMonthLabel,
  normalizedPlannerWeekOptions,
  parsePlannerLabel,
  plannerQuarterOptions,
  plannerMonthOptions,
  compactPlannerWeekOptions,
  plannerWeekId,
  setPlannerWeekId,
  plannerDayOptions,
  plannerDayId,
  setPlannerDayId,
}) => {
  if (hideWeeklyPlanner) return null;

  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-700">Weekly Planner</div>
          <p className="mt-1 text-[12px] leading-5 text-slate-500">Plan this task inside the selected quarter, month, week, and day.</p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={addToWeeklyPlanner}
            onChange={(event) => setAddToWeeklyPlanner(event.target.checked)}
            className="peer sr-only"
          />
          <span className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-brand-red/90" />
          <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
        </label>
      </div>

      {addToWeeklyPlanner ? (
        <div className="mt-3.5 space-y-3 border-t border-slate-200 pt-3">
          <div className="rounded-2xl border border-red-100 bg-red-50/70 px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-red">Planner Context</div>
            <div className="mt-1 text-[13px] font-semibold text-slate-900">{plannerSummary || 'Choose a week and day'}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Quarter</label>
              <ThemedSelect
                value={plannerQuarterLabel}
                onChange={(value) => {
                  setPlannerQuarterLabel(value);
                  const nextMonth = normalizedPlannerWeekOptions
                    .map((option) => ({ option, parsed: parsePlannerLabel(option.label) }))
                    .find(({ parsed }) => parsed.quarter === value)?.parsed.month || '';
                  setPlannerMonthLabel(nextMonth);
                  const nextWeek = normalizedPlannerWeekOptions.find((option) => {
                    const parsed = parsePlannerLabel(option.label);
                    return parsed.quarter === value && (!nextMonth || parsed.month === nextMonth);
                  })?.value || '';
                  setPlannerWeekId(nextWeek);
                }}
                options={plannerQuarterOptions}
                placeholder="Quarter"
                compact={true}
                fullWidthCompact={true}
                denseMenu={true}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Month</label>
              <ThemedSelect
                value={plannerMonthLabel}
                onChange={(value) => {
                  setPlannerMonthLabel(value);
                  const nextWeek = normalizedPlannerWeekOptions.find((option) => {
                    const parsed = parsePlannerLabel(option.label);
                    return (!plannerQuarterLabel || parsed.quarter === plannerQuarterLabel) && parsed.month === value;
                  })?.value || '';
                  setPlannerWeekId(nextWeek);
                }}
                options={plannerMonthOptions}
                placeholder="Month"
                compact={true}
                fullWidthCompact={true}
                denseMenu={true}
                disabled={!plannerQuarterOptions.length}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Week</label>
              <ThemedSelect
                value={plannerWeekId}
                onChange={setPlannerWeekId}
                options={compactPlannerWeekOptions}
                placeholder="Week"
                compact={true}
                fullWidthCompact={true}
                denseMenu={true}
                disabled={!plannerMonthOptions.length}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Day</label>
              <ThemedSelect
                value={plannerDayId}
                onChange={setPlannerDayId}
                options={plannerDayOptions}
                placeholder="Day"
                compact={true}
                fullWidthCompact={true}
                denseMenu={true}
                disabled={!compactPlannerWeekOptions.length}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SpacesTaskPlannerFields;
