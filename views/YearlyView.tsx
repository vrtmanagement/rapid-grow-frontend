
import React, { useState } from 'react';
import { PlanningState, Goal } from '../types';
import { Plus, Trash2, Target } from 'lucide-react';
import { removeGoal, saveGoal } from '../services/goalApi';
import { PageHeaderSkeleton, Skeleton, SkeletonBlock } from '../components/ui/Skeleton';
import VisionFlowNav from '../components/planning/VisionFlowNav';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  loading?: boolean;
}

const YearlyView: React.FC<Props> = ({ state, updateState, loading = false }) => {
  const isAdmin = state.currentUser.role === 'Admin';
  const [editingIds, setEditingIds] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');

  const generateId = () =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto.randomUUID() as string)
      : Math.random().toString(36).slice(2));

  const getProgress = (yearlyId: string) => {
    const quarters = state.quarterlyGoals.filter((q) => q.parentId === yearlyId);
    if (!quarters.length) return 0;
    return Math.round((quarters.filter((q) => q.completed).length / quarters.length) * 100);
  };

  const addYearlyGoal = async () => {
    if (!isAdmin) return;
    const text = newGoalText.trim();
    if (!text) return;
    const newGoal: Goal = { id: `y-${generateId()}`, text, completed: false, level: 'year' };
    updateState((prev) => ({
      ...prev,
      yearlyGoals: [...prev.yearlyGoals, newGoal],
    }));
    try {
      await saveGoal(newGoal);
      setNewGoalText('');
      setIsAddingNew(false);
    } catch (e) {
      console.error(e);
    }
  };

  const updateYearlyGoal = (id: string, text: string) => {
    if (!isAdmin) return;
    updateState((prev) => ({
      ...prev,
      yearlyGoals: prev.yearlyGoals.map((g) => (g.id === id ? { ...g, text } : g)),
    }));
  };

  const deleteYearlyGoal = (id: string) => {
    if (!isAdmin) return;
    removeGoal(id).catch((e) => console.error(e));
    updateState((prev) => {
      const quarterIds = new Set(prev.quarterlyGoals.filter((q) => q.parentId === id).map((q) => q.id));
      const monthIds = new Set(prev.monthlyGoals.filter((m) => m.parentId && quarterIds.has(m.parentId)).map((m) => m.id));
      const weekIds = new Set(prev.weeklyGoals.filter((w) => w.parentId && monthIds.has(w.parentId)).map((w) => w.id));
      return {
        ...prev,
        yearlyGoals: prev.yearlyGoals.filter((g) => g.id !== id),
        quarterlyGoals: prev.quarterlyGoals.filter((q) => q.parentId !== id),
        monthlyGoals: prev.monthlyGoals.filter((m) => !monthIds.has(m.id)),
        weeklyGoals: prev.weeklyGoals.filter((w) => !weekIds.has(w.id)),
        dailyGoals: prev.dailyGoals.filter((d) => !d.parentId || !weekIds.has(d.parentId)),
      };
    });
  };

  const handleSave = async (goal: Goal) => {
    const text = drafts[goal.id] ?? goal.text;
    updateYearlyGoal(goal.id, text);
    try {
      await saveGoal({ ...goal, text });
      setEditingIds((prev) => ({ ...prev, [goal.id]: false }));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        <VisionFlowNav subtitle={state.uiConfig.yearlySub} />
        <PageHeaderSkeleton />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`yearly-skeleton-${index}`} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 animate-pulse">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-2/3" />
                </div>
                <div className="min-w-[130px] space-y-2">
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <SkeletonBlock className="h-2 w-full rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <VisionFlowNav subtitle={state.uiConfig.yearlySub} />
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 px-6 py-7 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{state.uiConfig.yearlyTitle}</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Start here: each yearly goal automatically gets Q1–Q4. Example themes: revenue, team, product, culture.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="shrink-0 rounded-xl bg-brand-red px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-red/20 flex items-center justify-center gap-2 hover:opacity-95"
          >
            <Plus size={16} /> Add yearly goal
          </button>
        )}
      </div>

      {isAdmin && isAddingNew && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <textarea
            value={newGoalText}
            onChange={(e) => setNewGoalText(e.target.value)}
            placeholder="Enter yearly goal"
            className="flex-1 resize-none outline-none bg-transparent"
            rows={2}
          />
          <button onClick={addYearlyGoal} className="px-3 py-1 text-xs rounded bg-brand-red text-white">
            Save
          </button>
          <button
            onClick={() => {
              setIsAddingNew(false);
              setNewGoalText('');
            }}
            className="px-3 py-1 text-xs rounded bg-slate-100 text-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-4">
        {state.yearlyGoals.map((goal) => {
          const progress = getProgress(goal.id);
          return (
            <div key={goal.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <textarea
                    readOnly={!isAdmin || !editingIds[goal.id]}
                    value={drafts[goal.id] ?? goal.text}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                    placeholder="Define yearly goal"
                    className="w-full resize-none outline-none text-xl bg-transparent"
                    rows={2}
                  />
                </div>
                <div className="text-right min-w-[130px]">
                  <div className="text-sm text-slate-500">{progress}% complete</div>
                  <div className="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-brand-red" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    {!editingIds[goal.id] ? (
                      <button onClick={() => setEditingIds((prev) => ({ ...prev, [goal.id]: true }))} className="px-3 py-1 text-xs rounded bg-slate-100 text-slate-700">
                        Edit
                      </button>
                    ) : (
                      <button onClick={() => handleSave(goal)} className="px-3 py-1 text-xs rounded bg-brand-red text-white">
                        Save
                      </button>
                    )}
                    <button onClick={() => deleteYearlyGoal(goal.id)} className="p-2 text-slate-500 hover:text-brand-red">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Target size={12} /> Auto-linked quarters: Q1, Q2, Q3, Q4
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YearlyView;
