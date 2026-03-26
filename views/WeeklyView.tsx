
import React, { useState } from 'react';
import { PlanningState, Goal } from '../types';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { removeGoal, saveGoal } from '../services/goalApi';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const WeeklyView: React.FC<Props> = ({ state, updateState }) => {
  const isAdmin = state.currentUser.role === 'Admin';
  const [expandedMonthIds, setExpandedMonthIds] = useState<Record<string, boolean>>({});
  const [editingIds, setEditingIds] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, { text: string; details: string }>>({});
  const [newWeeklyDraftByMonth, setNewWeeklyDraftByMonth] = useState<Record<string, { text: string; details: string }>>({});
  const [isAddingByMonth, setIsAddingByMonth] = useState<Record<string, boolean>>({});

  const generateId = () =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto.randomUUID() as string)
      : Math.random().toString(36).slice(2));

  const addWeekly = async (monthId: string) => {
    if (!isAdmin) return;
    const draft = newWeeklyDraftByMonth[monthId];
    const text = (draft?.text || '').trim();
    const details = draft?.details || '';
    if (!text) return;
    const id = `w-${generateId()}`;
    const weeklyGoal: Goal = { id, text, completed: false, level: 'week', parentId: monthId, details, timeline: '' };
    updateState((prev) => ({
      ...prev,
      weeklyGoals: [...prev.weeklyGoals, weeklyGoal],
      dailyGoals: [
        ...prev.dailyGoals,
        ...Array.from({ length: 7 }).map((_, idx) => ({
          id: `d-${id}-${idx + 1}`,
          text: `Day ${idx + 1}`,
          completed: false,
          level: 'day' as const,
          parentId: id,
        })),
      ],
    }));
    try {
      await saveGoal(weeklyGoal);
      setNewWeeklyDraftByMonth((prev) => ({ ...prev, [monthId]: { text: '', details: '' } }));
      setIsAddingByMonth((prev) => ({ ...prev, [monthId]: false }));
    } catch (e) {
      console.error(e);
    }
  };

  const updateWeekly = (id: string, updates: Partial<Goal>) => {
    if (!isAdmin) return;
    updateState((prev) => ({
      ...prev,
      weeklyGoals: prev.weeklyGoals.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }));
  };

  const deleteWeekly = (id: string) => {
    if (!isAdmin) return;
    removeGoal(id).catch((e) => console.error(e));
    updateState((prev) => ({
      ...prev,
      weeklyGoals: prev.weeklyGoals.filter((w) => w.id !== id),
      dailyGoals: prev.dailyGoals.filter((d) => d.parentId !== id),
    }));
  };

  const grouped = state.monthlyGoals.map((month) => ({
    month,
    quarter: state.quarterlyGoals.find((q) => q.id === month.parentId),
    weeks: state.weeklyGoals.filter((w) => w.parentId === month.id),
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16">
      <h2 className="text-3xl text-slate-900">{state.uiConfig.weeklyTitle}</h2>
      {grouped.map(({ month, quarter, weeks }) => {
        const isExpanded = expandedMonthIds[month.id] ?? false;
        const progress = weeks.length ? Math.round((weeks.filter((w) => w.completed).length / weeks.length) * 100) : 0;
        return (
          <div key={month.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedMonthIds((prev) => ({ ...prev, [month.id]: !isExpanded }))}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div className="text-left">
                  <div className="text-xs text-slate-500">{quarter?.timeline} - {quarter?.text || 'Quarterly Goal'}</div>
                  <div className="text-slate-900">{month.text || 'Untitled Monthly Goal'}</div>
                </div>
              </div>
              <div className="text-sm text-slate-600">{progress}% complete</div>
            </button>
            {isExpanded && (
              <div className="px-5 pb-5 space-y-3">
                {isAdmin && (
                  <>
                    {!isAddingByMonth[month.id] ? (
                      <button
                        onClick={() => {
                          setIsAddingByMonth((prev) => ({ ...prev, [month.id]: true }));
                          setNewWeeklyDraftByMonth((prev) => ({
                            ...prev,
                            [month.id]: prev[month.id] || { text: '', details: '' },
                          }));
                        }}
                        className="px-3 py-2 rounded-lg bg-brand-red text-white flex items-center gap-2 text-sm"
                      >
                        <Plus size={14} /> Add Weekly Goal
                      </button>
                    ) : (
                      <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                        <textarea
                          value={newWeeklyDraftByMonth[month.id]?.text || ''}
                          onChange={(e) =>
                            setNewWeeklyDraftByMonth((prev) => ({
                              ...prev,
                              [month.id]: { text: e.target.value, details: prev[month.id]?.details || '' },
                            }))
                          }
                          placeholder="Weekly goal"
                          className="w-full resize-none outline-none bg-transparent"
                          rows={2}
                        />
                        <textarea
                          value={newWeeklyDraftByMonth[month.id]?.details || ''}
                          onChange={(e) =>
                            setNewWeeklyDraftByMonth((prev) => ({
                              ...prev,
                              [month.id]: { text: prev[month.id]?.text || '', details: e.target.value },
                            }))
                          }
                          placeholder="Weekly notes"
                          className="w-full resize-none outline-none bg-slate-50 rounded-lg p-2"
                          rows={2}
                        />
                        <div className="flex items-center gap-2">
                          <button onClick={() => addWeekly(month.id)} className="px-3 py-1 text-xs rounded bg-brand-red text-white">
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setIsAddingByMonth((prev) => ({ ...prev, [month.id]: false }));
                              setNewWeeklyDraftByMonth((prev) => ({ ...prev, [month.id]: { text: '', details: '' } }));
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
                {weeks.map((week) => {
                  const dayCount = state.dailyGoals.filter((d) => d.parentId === week.id).length;
                  const doneCount = state.dailyGoals.filter((d) => d.parentId === week.id && d.completed).length;
                  return (
                    <div key={week.id} className="border border-slate-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <textarea
                          readOnly={!isAdmin || !editingIds[week.id]}
                          value={drafts[week.id]?.text ?? week.text}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [week.id]: { text: e.target.value, details: prev[week.id]?.details ?? week.details ?? '' },
                            }))
                          }
                          placeholder="Weekly goal"
                          className="flex-1 resize-none outline-none bg-transparent"
                          rows={2}
                        />
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            {!editingIds[week.id] ? (
                              <button onClick={() => setEditingIds((prev) => ({ ...prev, [week.id]: true }))} className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700">
                                Edit
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  const text = drafts[week.id]?.text ?? week.text;
                                  const details = drafts[week.id]?.details ?? week.details ?? '';
                                  updateWeekly(week.id, { text, details });
                                  await saveGoal({ ...week, text, details }).catch((e) => console.error(e));
                                  setEditingIds((prev) => ({ ...prev, [week.id]: false }));
                                }}
                                className="px-2 py-1 text-xs rounded bg-brand-red text-white"
                              >
                                Save
                              </button>
                            )}
                            <button onClick={() => deleteWeekly(week.id)} className="p-2 text-slate-500 hover:text-brand-red">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      <textarea
                        readOnly={!isAdmin || !editingIds[week.id]}
                        value={drafts[week.id]?.details ?? week.details ?? ''}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [week.id]: { text: prev[week.id]?.text ?? week.text, details: e.target.value },
                          }))
                        }
                        placeholder="Weekly notes"
                        className="w-full resize-none outline-none bg-slate-50 rounded-lg p-2"
                        rows={2}
                      />
                      <div className="text-xs text-slate-500">Daily completion: {doneCount}/{dayCount}</div>
                    </div>
                  );
                })}
                {!weeks.length && <div className="text-sm text-slate-500">No weekly goals yet.</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyView;
