
import React, { useState } from 'react';
import { PlanningState, Goal } from '../types';
import { ChevronDown, ChevronRight, Trash2, Eraser } from 'lucide-react';
import { removeGoal, saveGoal } from '../services/goalApi';
import { PageHeaderSkeleton, Skeleton, SkeletonBlock } from '../components/ui/Skeleton';
import VisionFlowNav from '../components/planning/VisionFlowNav';
import { isMonthSlotLabel, monthSlotDisplayName, monthSlotSortKey } from '../planning/goalHierarchy';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  loading?: boolean;
}

const MonthlyView: React.FC<Props> = ({ state, updateState, loading = false }) => {
  const hasAdminPower = state.currentUser.role === 'Admin';
  const [expandedYearIds, setExpandedYearIds] = useState<Record<string, boolean>>({});
  const [expandedQuarterIds, setExpandedQuarterIds] = useState<Record<string, boolean>>({});
  const [editingIds, setEditingIds] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, { text: string; details: string }>>({});

  const sortMonths = (goals: Goal[]) =>
    [...goals].sort(
      (a, b) => monthSlotSortKey(a.timeline) - monthSlotSortKey(b.timeline) || a.id.localeCompare(b.id),
    );

  const handleRemoveProject = (id: string) => {
    if (!hasAdminPower) return;
    removeGoal(id).catch((e) => console.error(e));
    updateState((prev) => {
      const weekIds = new Set(prev.weeklyGoals.filter((w) => w.parentId === id).map((w) => w.id));
      return {
        ...prev,
        monthlyGoals: prev.monthlyGoals.filter((g) => g.id !== id),
        weeklyGoals: prev.weeklyGoals.filter((w) => w.parentId !== id),
        dailyGoals: prev.dailyGoals.filter((d) => !d.parentId || !weekIds.has(d.parentId)),
      };
    });
  };

  const handleGoalChange = (id: string, text: string) => {
    if (!hasAdminPower) return;
    updateState((prev) => ({
      ...prev,
      monthlyGoals: prev.monthlyGoals.map((g) => (g.id === id ? { ...g, text } : g)),
    }));
  };

  const handleDetailsChange = (id: string, details: string) => {
    if (!hasAdminPower) return;
    updateState((prev) => ({
      ...prev,
      monthlyGoals: prev.monthlyGoals.map((g) => (g.id === id ? { ...g, details } : g)),
    }));
  };

  const clearMonth = async (goal: Goal) => {
    if (!hasAdminPower) return;
    handleGoalChange(goal.id, '');
    handleDetailsChange(goal.id, '');
    try {
      await saveGoal({ ...goal, text: '', details: '' });
    } catch (e) {
      console.error(e);
    }
  };

  const groupedByYear = state.yearlyGoals.map((yearly) => ({
    yearly,
    quarters: state.quarterlyGoals
      .filter((q) => q.parentId === yearly.id)
      .sort((a, b) => (a.timeline || '').localeCompare(b.timeline || ''))
      .map((quarter) => ({
        quarter,
        months: sortMonths(state.monthlyGoals.filter((m) => m.parentId === quarter.id)),
      })),
  }));

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-5 pb-16">
        <VisionFlowNav subtitle={state.uiConfig.monthlySub} />
        <PageHeaderSkeleton />
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`monthly-skeleton-${index}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
            <div className="w-full px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-4 w-4 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-60" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="px-5 pb-5 space-y-3">
              {Array.from({ length: 2 }).map((__, quarterIndex) => (
                <div key={`monthly-quarter-${index}-${quarterIndex}`} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="w-full px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SkeletonBlock className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <div className="px-4 pb-4 space-y-3">
                    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <SkeletonBlock className="h-16 w-full rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16">
      <VisionFlowNav subtitle={state.uiConfig.monthlySub} />
      <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 px-6 py-7 shadow-sm">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{state.uiConfig.monthlyTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Each quarter has three month slots. Add weekly goals inside a month; daily steps are created automatically for each week.
        </p>
      </div>
      {groupedByYear.map(({ yearly, quarters }) => {
        const yearExpanded = expandedYearIds[yearly.id] ?? true;
        const allMonths = quarters.flatMap((q) => q.months);
        const yearlyProgress = allMonths.length
          ? Math.round((allMonths.filter((m) => m.completed).length / allMonths.length) * 100)
          : 0;
        return (
          <div key={yearly.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setExpandedYearIds((prev) => ({ ...prev, [yearly.id]: !yearExpanded }))}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/80"
            >
              <div className="flex items-center gap-2">
                {yearExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div className="text-left">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Yearly vision</div>
                  <div className="text-slate-900 font-medium">{yearly.text || 'Untitled yearly goal'}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-slate-600">{yearlyProgress}%</div>
            </button>
            {yearExpanded && (
              <div className="px-5 pb-5 space-y-3">
                {quarters.map(({ quarter, months }) => {
                  const isExpanded = expandedQuarterIds[quarter.id] ?? false;
                  const progress = months.length
                    ? Math.round((months.filter((m) => m.completed).length / months.length) * 100)
                    : 0;
                  return (
                    <div key={quarter.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
                      <button
                        type="button"
                        onClick={() => setExpandedQuarterIds((prev) => ({ ...prev, [quarter.id]: !isExpanded }))}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/80"
                      >
                        <div className="flex items-center gap-2 text-left">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <div>
                            <span className="text-xs font-semibold text-brand-red">{quarter.timeline}</span>
                            <span className="text-slate-800"> · {quarter.text || 'Quarter focus'}</span>
                          </div>
                        </div>
                        <div className="text-xs font-medium text-slate-500">{progress}%</div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3">
                          {months.map((goal) => (
                            <div
                              key={goal.id}
                              className="border border-slate-200 rounded-xl bg-white p-4 space-y-2 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                                  {monthSlotDisplayName(goal.timeline)}
                                </span>
                                {hasAdminPower && (
                                  <div className="flex items-center gap-2">
                                    {(goal.text || goal.details) && isMonthSlotLabel(goal.timeline) && (
                                      <button
                                        type="button"
                                        onClick={() => clearMonth(goal)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                                      >
                                        <Eraser size={12} />
                                        Clear
                                      </button>
                                    )}
                                    {!isMonthSlotLabel(goal.timeline) && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveProject(goal.id)}
                                        className="p-2 text-slate-400 hover:text-brand-red"
                                        title="Remove extra month"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-start gap-2">
                                <textarea
                                  readOnly={!hasAdminPower || !editingIds[goal.id]}
                                  value={drafts[goal.id]?.text ?? goal.text}
                                  onChange={(e) =>
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [goal.id]: { text: e.target.value, details: prev[goal.id]?.details ?? goal.details ?? '' },
                                    }))
                                  }
                                  placeholder="What must be true by the end of this month?"
                                  className="flex-1 resize-none outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                                  rows={2}
                                />
                                {hasAdminPower && (
                                  <div className="flex items-center gap-2 shrink-0">
                                    {!editingIds[goal.id] ? (
                                      <button
                                        type="button"
                                        onClick={() => setEditingIds((prev) => ({ ...prev, [goal.id]: true }))}
                                        className="px-2 py-1 text-xs rounded-lg bg-slate-100 text-slate-700"
                                      >
                                        Edit
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const text = drafts[goal.id]?.text ?? goal.text;
                                          const details = drafts[goal.id]?.details ?? goal.details ?? '';
                                          handleGoalChange(goal.id, text);
                                          handleDetailsChange(goal.id, details);
                                          await saveGoal({ ...goal, text, details }).catch((e) => console.error(e));
                                          setEditingIds((prev) => ({ ...prev, [goal.id]: false }));
                                        }}
                                        className="px-2 py-1 text-xs rounded-lg bg-brand-red text-white"
                                      >
                                        Save
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              <textarea
                                readOnly={!hasAdminPower || !editingIds[goal.id]}
                                value={drafts[goal.id]?.details ?? goal.details ?? ''}
                                onChange={(e) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [goal.id]: { text: prev[goal.id]?.text ?? goal.text, details: e.target.value },
                                  }))
                                }
                                placeholder="Notes, metrics, or dependencies"
                                className="w-full resize-none outline-none bg-slate-50 rounded-lg p-2 text-sm text-slate-700 placeholder:text-slate-400"
                                rows={2}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MonthlyView;
