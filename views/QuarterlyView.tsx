
import React, { useState } from 'react';
import { PlanningState } from '../types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { saveGoal } from '../services/goalApi';
import { PageHeaderSkeleton, Skeleton, SkeletonBlock } from '../components/ui/Skeleton';
import VisionFlowNav from '../components/planning/VisionFlowNav';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  loading?: boolean;
}

const QuarterlyView: React.FC<Props> = ({ state, updateState, loading = false }) => {
  const isAdmin = state.currentUser.role === 'Admin';
  const [expandedYearIds, setExpandedYearIds] = useState<Record<string, boolean>>({});
  const [editingIds, setEditingIds] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const handleGoalChange = (id: string, text: string) => {
    if (!isAdmin) return;
    updateState(prev => ({
      ...prev,
      quarterlyGoals: prev.quarterlyGoals.map(g => g.id === id ? { ...g, text } : g)
    }));
  };

  const grouped = state.yearlyGoals.map((yearGoal) => ({
    yearGoal,
    quarters: state.quarterlyGoals
      .filter((q) => q.parentId === yearGoal.id)
      .sort((a, b) => (a.timeline || '').localeCompare(b.timeline || '')),
  }));

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-5 pb-16">
        <VisionFlowNav subtitle={state.uiConfig.quarterlySub} />
        <PageHeaderSkeleton />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`quarterly-skeleton-${index}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
            <div className="w-full px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-4 w-4 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="px-5 pb-5 grid md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((__, cardIndex) => (
                <div key={`quarter-card-${index}-${cardIndex}`} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-7 w-14 rounded-lg" />
                    <SkeletonBlock className="h-7 w-7 rounded" />
                  </div>
                  <Skeleton className="h-3 w-28" />
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
      <VisionFlowNav subtitle={state.uiConfig.quarterlySub} />
      <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 px-6 py-7 shadow-sm">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{state.uiConfig.quarterlyTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Quarters are fixed (Q1–Q4) for each yearly goal. Define the outcome for each quarter; months are planned on the Monthly step.
        </p>
      </div>
      {grouped.map(({ yearGoal, quarters }) => {
        const isExpanded = expandedYearIds[yearGoal.id] ?? true;
        const progress = quarters.length ? Math.round((quarters.filter((q) => q.completed).length / quarters.length) * 100) : 0;
        return (
          <div key={yearGoal.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setExpandedYearIds((prev) => ({ ...prev, [yearGoal.id]: !isExpanded }))}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50"
            >
              <div className="flex items-center gap-2 text-left">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div>
                  <div className="text-sm text-slate-500">Yearly Goal</div>
                  <div className="text-slate-900">{yearGoal.text || 'Untitled yearly goal'}</div>
                </div>
              </div>
              <div className="text-sm text-slate-600">{progress}% complete</div>
            </button>
            {isExpanded && (
              <div className="px-5 pb-5 grid md:grid-cols-2 gap-4">
                {quarters.map((goal) => {
                  const monthly = state.monthlyGoals.filter((m) => m.parentId === goal.id);
                  const quarterProgress = monthly.length ? Math.round((monthly.filter((m) => m.completed).length / monthly.length) * 100) : 0;
                  return (
                    <div key={goal.id} className="border border-slate-200 rounded-xl bg-slate-50/40 p-4 space-y-2 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                      <div className="text-xs font-semibold uppercase tracking-wide text-brand-red">{goal.timeline}</div>
                      <textarea
                        readOnly={!isAdmin || !editingIds[goal.id]}
                        value={drafts[goal.id] ?? goal.text}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                        placeholder={`${goal.timeline} goal`}
                        className="w-full resize-none bg-transparent outline-none text-slate-800"
                        rows={2}
                      />
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          {!editingIds[goal.id] ? (
                            <button onClick={() => setEditingIds((prev) => ({ ...prev, [goal.id]: true }))} className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700">
                              Edit
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                const text = drafts[goal.id] ?? goal.text;
                                handleGoalChange(goal.id, text);
                                await saveGoal({ ...goal, text }).catch((e) => console.error(e));
                                setEditingIds((prev) => ({ ...prev, [goal.id]: false }));
                              }}
                              className="px-2 py-1 text-xs rounded bg-brand-red text-white"
                            >
                              Save
                            </button>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-slate-500">{quarterProgress}% monthly completion</div>
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

export default QuarterlyView;
