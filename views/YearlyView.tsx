
import React, { useState } from 'react';
import { PlanningState, Goal } from '../types';
import { Plus, Trash2, Target } from 'lucide-react';
import { removeGoal, saveGoal } from '../services/goalApi';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const YearlyView: React.FC<Props> = ({ state, updateState }) => {
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl text-slate-900">{state.uiConfig.yearlyTitle}</h2>
        {isAdmin && (
          <button onClick={() => setIsAddingNew(true)} className="px-4 py-2 rounded-lg bg-brand-red text-white flex items-center gap-2">
            <Plus size={16} /> Add Yearly Goal
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
            <div key={goal.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
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
