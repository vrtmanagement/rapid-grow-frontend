
import React, { useState } from 'react';
import { PlanningState } from '../types';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { removeGoal, saveGoal } from '../services/goalApi';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const QuarterlyView: React.FC<Props> = ({ state, updateState }) => {
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

  const handleDeleteQuarter = (quarterId: string) => {
    if (!isAdmin) return;
    removeGoal(quarterId).catch((e) => console.error(e));
    updateState((prev) => {
      const monthIds = new Set(prev.monthlyGoals.filter((m) => m.parentId === quarterId).map((m) => m.id));
      const weekIds = new Set(prev.weeklyGoals.filter((w) => w.parentId && monthIds.has(w.parentId)).map((w) => w.id));
      return {
        ...prev,
        quarterlyGoals: prev.quarterlyGoals.filter((q) => q.id !== quarterId),
        monthlyGoals: prev.monthlyGoals.filter((m) => !monthIds.has(m.id)),
        weeklyGoals: prev.weeklyGoals.filter((w) => !weekIds.has(w.id)),
        dailyGoals: prev.dailyGoals.filter((d) => !d.parentId || !weekIds.has(d.parentId)),
      };
    });
  };

  const grouped = state.yearlyGoals.map((yearGoal) => ({
    yearGoal,
    quarters: state.quarterlyGoals
      .filter((q) => q.parentId === yearGoal.id)
      .sort((a, b) => (a.timeline || '').localeCompare(b.timeline || '')),
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16">
      <h2 className="text-3xl text-slate-900">{state.uiConfig.quarterlyTitle}</h2>
      {grouped.map(({ yearGoal, quarters }) => {
        const isExpanded = expandedYearIds[yearGoal.id] ?? true;
        const progress = quarters.length ? Math.round((quarters.filter((q) => q.completed).length / quarters.length) * 100) : 0;
        return (
          <div key={yearGoal.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
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
                    <div key={goal.id} className="border border-slate-200 rounded-xl p-4 space-y-2">
                      <div className="text-xs text-slate-500">{goal.timeline}</div>
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
                          <button onClick={() => handleDeleteQuarter(goal.id)} className="p-1 text-slate-500 hover:text-brand-red">
                            <Trash2 size={14} />
                          </button>
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
