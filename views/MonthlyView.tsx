
import React, { useState } from 'react';
import { PlanningState, Goal } from '../types';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { removeGoal, saveGoal } from '../services/goalApi';
import { PageHeaderSkeleton, Skeleton, SkeletonBlock } from '../components/ui/Skeleton';

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
  const [newMonthlyDraftByQuarter, setNewMonthlyDraftByQuarter] = useState<Record<string, { text: string; details: string }>>({});
  const [isAddingByQuarter, setIsAddingByQuarter] = useState<Record<string, boolean>>({});

  const generateId = () =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto.randomUUID() as string)
      : Math.random().toString(36).slice(2));

  const handleAddProject = async (quarterId: string) => {
    if (!hasAdminPower) return;
    const draft = newMonthlyDraftByQuarter[quarterId];
    const text = (draft?.text || '').trim();
    const details = draft?.details || '';
    if (!text) return;
    const newProject: Goal = {
      id: `m-${generateId()}`,
      text,
      completed: false,
      level: 'month',
      details,
      parentId: quarterId
    };
    updateState(prev => ({
      ...prev,
      monthlyGoals: [...prev.monthlyGoals, newProject]
    }));
    try {
      await saveGoal(newProject);
      setNewMonthlyDraftByQuarter((prev) => ({ ...prev, [quarterId]: { text: '', details: '' } }));
      setIsAddingByQuarter((prev) => ({ ...prev, [quarterId]: false }));
    } catch (e) {
      console.error(e);
    }
  };

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
    updateState(prev => ({
      ...prev,
      monthlyGoals: prev.monthlyGoals.map(g => g.id === id ? { ...g, text } : g)
    }));
  };

  const handleDetailsChange = (id: string, details: string) => {
    if (!hasAdminPower) return;
    updateState(prev => ({
      ...prev,
      monthlyGoals: prev.monthlyGoals.map(g => g.id === id ? { ...g, details } : g)
    }));
  };

  const groupedByYear = state.yearlyGoals.map((yearly) => ({
    yearly,
    quarters: state.quarterlyGoals
      .filter((q) => q.parentId === yearly.id)
      .sort((a, b) => (a.timeline || '').localeCompare(b.timeline || ''))
      .map((quarter) => ({
        quarter,
        months: state.monthlyGoals.filter((m) => m.parentId === quarter.id),
      })),
  }));

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-5 pb-16">
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
                    <SkeletonBlock className="h-9 w-36 rounded-lg" />
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
      <h2 className="text-3xl text-slate-900">{state.uiConfig.monthlyTitle}</h2>
      {groupedByYear.map(({ yearly, quarters }) => {
        const yearExpanded = expandedYearIds[yearly.id] ?? true;
        const allMonths = quarters.flatMap((q) => q.months);
        const yearlyProgress = allMonths.length
          ? Math.round((allMonths.filter((m) => m.completed).length / allMonths.length) * 100)
          : 0;
        return (
          <div key={yearly.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedYearIds((prev) => ({ ...prev, [yearly.id]: !yearExpanded }))}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                {yearExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div className="text-left">
                  <div className="text-xs text-slate-500">Yearly Vision</div>
                  <div className="text-slate-900">{yearly.text || 'Untitled Yearly Goal'}</div>
                </div>
              </div>
              <div className="text-sm text-slate-600">{yearlyProgress}% complete</div>
            </button>
            {yearExpanded && (
              <div className="px-5 pb-5 space-y-3">
                {quarters.map(({ quarter, months }) => {
                  const isExpanded = expandedQuarterIds[quarter.id] ?? false;
                  const progress = months.length ? Math.round((months.filter((m) => m.completed).length / months.length) * 100) : 0;
                  return (
                    <div key={quarter.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedQuarterIds((prev) => ({ ...prev, [quarter.id]: !isExpanded }))}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2 text-left">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <div className="text-slate-800">{quarter.timeline}: {quarter.text || 'Untitled Quarterly Goal'}</div>
                        </div>
                        <div className="text-xs text-slate-500">{progress}%</div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3">
                          {hasAdminPower && (
                            <>
                              {!isAddingByQuarter[quarter.id] ? (
                                <button
                                  onClick={() => {
                                    setIsAddingByQuarter((prev) => ({ ...prev, [quarter.id]: true }));
                                    setNewMonthlyDraftByQuarter((prev) => ({
                                      ...prev,
                                      [quarter.id]: prev[quarter.id] || { text: '', details: '' },
                                    }));
                                  }}
                                  className="px-3 py-2 rounded-lg bg-brand-red text-white flex items-center gap-2 text-sm"
                                >
                                  <Plus size={14} /> Add Monthly Goal
                                </button>
                              ) : (
                                <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                                  <textarea
                                    value={newMonthlyDraftByQuarter[quarter.id].text}
                                    onChange={(e) =>
                                      setNewMonthlyDraftByQuarter((prev) => ({
                                        ...prev,
                                        [quarter.id]: { text: e.target.value, details: prev[quarter.id]?.details || '' },
                                      }))
                                    }
                                    placeholder="Monthly goal"
                                    className="w-full resize-none outline-none bg-transparent"
                                    rows={2}
                                  />
                                  <textarea
                                    value={newMonthlyDraftByQuarter[quarter.id].details}
                                    onChange={(e) =>
                                      setNewMonthlyDraftByQuarter((prev) => ({
                                        ...prev,
                                        [quarter.id]: { text: prev[quarter.id]?.text || '', details: e.target.value },
                                      }))
                                    }
                                    placeholder="Monthly goal notes"
                                    className="w-full resize-none outline-none bg-slate-50 rounded-lg p-2"
                                    rows={2}
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleAddProject(quarter.id)}
                                      className="px-3 py-1 text-xs rounded bg-brand-red text-white"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setIsAddingByQuarter((prev) => ({ ...prev, [quarter.id]: false }));
                                        setNewMonthlyDraftByQuarter((prev) => ({
                                          ...prev,
                                          [quarter.id]: { text: '', details: '' },
                                        }));
                                      }}
                                      className="px-3 py-1 text-xs rounded bg-slate-100 text-slate-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          {months.map((goal) => (
                            <div key={goal.id} className="border border-slate-200 rounded-xl p-4 space-y-2">
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
                                  placeholder="Monthly goal"
                                  className="flex-1 resize-none outline-none bg-transparent"
                                  rows={2}
                                />
                                {hasAdminPower && (
                                  <div className="flex items-center gap-2">
                                    {!editingIds[goal.id] ? (
                                      <button onClick={() => setEditingIds((prev) => ({ ...prev, [goal.id]: true }))} className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700">
                                        Edit
                                      </button>
                                    ) : (
                                      <button
                                        onClick={async () => {
                                          const text = drafts[goal.id]?.text ?? goal.text;
                                          const details = drafts[goal.id]?.details ?? goal.details ?? '';
                                          handleGoalChange(goal.id, text);
                                          handleDetailsChange(goal.id, details);
                                          await saveGoal({ ...goal, text, details }).catch((e) => console.error(e));
                                          setEditingIds((prev) => ({ ...prev, [goal.id]: false }));
                                        }}
                                        className="px-2 py-1 text-xs rounded bg-brand-red text-white"
                                      >
                                        Save
                                      </button>
                                    )}
                                    <button onClick={() => handleRemoveProject(goal.id)} className="p-2 text-slate-500 hover:text-brand-red">
                                      <Trash2 size={14} />
                                    </button>
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
                                placeholder="Monthly goal notes"
                                className="w-full resize-none outline-none bg-slate-50 rounded-lg p-2"
                                rows={2}
                              />
                            </div>
                          ))}
                          {!months.length && <div className="text-sm text-slate-500">No monthly goals yet.</div>}
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
