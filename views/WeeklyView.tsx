
import React, { useEffect, useMemo, useState } from 'react';
import { PlanningState, Goal } from '../types';
import { ChevronDown, ChevronRight, Plus, Trash2, CalendarDays } from 'lucide-react';
import { removeGoal, saveGoal } from '../services/goalApi';
import { PageHeaderSkeleton, Skeleton, SkeletonBlock } from '../components/ui/Skeleton';
import VisionFlowNav from '../components/planning/VisionFlowNav';
import { monthSlotDisplayName, monthSlotSortKey } from '../planning/goalHierarchy';
import { Link } from 'react-router-dom';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  loading?: boolean;
}

const sortMonths = (goals: Goal[]) =>
  [...goals].sort(
    (a, b) => monthSlotSortKey(a.timeline) - monthSlotSortKey(b.timeline) || a.id.localeCompare(b.id),
  );

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WeeklyView: React.FC<Props> = ({ state, updateState, loading = false }) => {
  const isAdmin = state.currentUser.role === 'Admin';
  const [expandedYearIds, setExpandedYearIds] = useState<Record<string, boolean>>({});
  const [expandedMonthIds, setExpandedMonthIds] = useState<Record<string, boolean>>({});
  const [selectedQuarterIdByYear, setSelectedQuarterIdByYear] = useState<Record<string, string>>({});
  const [editingIds, setEditingIds] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, { text: string; details: string }>>({});
  const [newWeeklyDraftByMonth, setNewWeeklyDraftByMonth] = useState<Record<string, { text: string; details: string }>>({});
  const [isAddingByMonth, setIsAddingByMonth] = useState<Record<string, boolean>>({});

  const groupedByYearFixed = useMemo(
    () =>
      state.yearlyGoals.map((yearly) => ({
        yearly,
        quarters: state.quarterlyGoals
          .filter((q) => q.parentId === yearly.id)
          .sort((a, b) => (a.timeline || '').localeCompare(b.timeline || '')),
      })),
    [state.yearlyGoals, state.quarterlyGoals],
  );

  useEffect(() => {
    setSelectedQuarterIdByYear((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const row of groupedByYearFixed) {
        if (!row.quarters.length) continue;
        if (!next[row.yearly.id]) {
          next[row.yearly.id] = row.quarters[0].id;
          changed = true;
        } else if (!row.quarters.some((q) => q.id === next[row.yearly.id])) {
          next[row.yearly.id] = row.quarters[0].id;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [groupedByYearFixed]);

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
    const weeklyGoal: Goal = {
      id,
      text,
      completed: false,
      level: 'week',
      parentId: monthId,
      details,
      timeline: formatDateKey(new Date()),
    };
    const seededDays: Goal[] = Array.from({ length: 7 }).map((_, idx) => ({
      id: `d-${id}-${idx + 1}`,
      text: `Day ${idx + 1}`,
      completed: false,
      level: 'day',
      parentId: id,
    }));
    updateState((prev) => ({
      ...prev,
      weeklyGoals: [...prev.weeklyGoals, weeklyGoal],
      dailyGoals: [...prev.dailyGoals, ...seededDays],
    }));
    try {
      await saveGoal(weeklyGoal);
      setNewWeeklyDraftByMonth((prev) => ({ ...prev, [monthId]: { text: '', details: '' } }));
      setIsAddingByMonth((prev) => ({ ...prev, [monthId]: false }));
      await Promise.all(seededDays.map((day) => saveGoal(day)));
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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-5 pb-16">
        <VisionFlowNav subtitle={state.uiConfig.weeklySub} />
        <PageHeaderSkeleton />
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`weekly-skeleton-${index}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse shadow-sm">
            <div className="w-full px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-4 w-4 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="px-5 pb-5 space-y-3">
              <SkeletonBlock className="h-9 w-full rounded-lg" />
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <SkeletonBlock className="h-14 w-full rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <VisionFlowNav subtitle={state.uiConfig.weeklySub} />
      <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 px-6 py-7 shadow-sm">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{state.uiConfig.weeklyTitle}</h2>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-slate-600 marker:font-semibold">
          <li>Pick a <strong className="text-slate-800">year</strong>, then a <strong className="text-slate-800">quarter</strong> (Q1–Q4).</li>
          <li>Under each <strong className="text-slate-800">month slot</strong>, add one or more weekly focuses.</li>
          <li>Open <strong className="text-slate-800">Daily</strong> to tick off the seven day lines created for each week.</li>
        </ol>
      </div>

      {groupedByYearFixed.map(({ yearly, quarters }) => {
        const yearOpen = expandedYearIds[yearly.id] ?? true;
        const activeQuarterId = selectedQuarterIdByYear[yearly.id] || quarters[0]?.id;
        const activeQuarter = quarters.find((q) => q.id === activeQuarterId) || quarters[0];
        const months = activeQuarter
          ? sortMonths(state.monthlyGoals.filter((m) => m.parentId === activeQuarter.id))
          : [];

        const quarterWeekCount = activeQuarter
          ? state.weeklyGoals.filter((w) => months.some((m) => m.id === w.parentId)).length
          : 0;

        return (
          <section key={yearly.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setExpandedYearIds((prev) => ({ ...prev, [yearly.id]: !yearOpen }))}
              className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 text-left hover:bg-slate-50/90"
            >
              <div className="flex min-w-0 items-center gap-3">
                {yearOpen ? <ChevronDown className="shrink-0 text-slate-400" size={18} /> : <ChevronRight className="shrink-0 text-slate-400" size={18} />}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Yearly vision</p>
                  <p className="truncate text-base font-semibold text-slate-900">{yearly.text || 'Untitled yearly goal'}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {quarters.length} quarters
              </span>
            </button>

            {yearOpen && (
              <div className="space-y-0 px-4 pb-5 pt-4 sm:px-5">
                {quarters.length === 0 ? (
                  <p className="px-1 py-6 text-center text-sm text-slate-500">No quarters for this year yet.</p>
                ) : (
                  <>
                    <div className="mb-5">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Quarter</p>
                      <div
                        className="flex flex-wrap gap-2"
                        role="tablist"
                        aria-label={`Quarters for ${yearly.text || 'year'}`}
                      >
                        {quarters.map((q) => {
                          const selected = q.id === activeQuarterId;
                          const qMonths = sortMonths(state.monthlyGoals.filter((m) => m.parentId === q.id));
                          const wCount = state.weeklyGoals.filter((w) => qMonths.some((m) => m.id === w.parentId)).length;
                          return (
                            <button
                              key={q.id}
                              type="button"
                              role="tab"
                              aria-selected={selected}
                              onClick={() => setSelectedQuarterIdByYear((prev) => ({ ...prev, [yearly.id]: q.id }))}
                              className={`rounded-xl border px-3.5 py-2.5 text-left transition ${
                                selected
                                  ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span className={`block text-xs font-bold ${selected ? 'text-brand-red' : 'text-slate-800'}`}>{q.timeline}</span>
                              <span className={`mt-0.5 line-clamp-2 text-[11px] leading-snug ${selected ? 'text-slate-200' : 'text-slate-500'}`}>
                                {q.text?.trim() ? q.text : 'Set focus in Quarterly'}
                              </span>
                              <span className={`mt-1 inline-block text-[10px] font-medium ${selected ? 'text-slate-400' : 'text-slate-400'}`}>
                                {wCount} week{wCount === 1 ? '' : 's'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {activeQuarter && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                        <div className="mb-4 flex flex-col gap-1 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold text-brand-red">{activeQuarter.timeline}</p>
                            <p className="text-sm text-slate-600">
                              {activeQuarter.text?.trim() || 'Define this quarter’s outcome in Quarterly vision.'}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {quarterWeekCount} weekly focus{quarterWeekCount === 1 ? '' : 'es'} in this quarter
                          </p>
                        </div>

                        <div className="space-y-4">
                          {months.map((month) => {
                            const weeks = state.weeklyGoals.filter((w) => w.parentId === month.id);
                            const monthOpen = expandedMonthIds[month.id] ?? true;
                            const slotLabel = monthSlotDisplayName(month.timeline);
                            const weekDone = weeks.filter((w) => w.completed).length;

                            return (
                              <div
                                key={month.id}
                                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                              >
                                <button
                                  type="button"
                                  onClick={() => setExpandedMonthIds((prev) => ({ ...prev, [month.id]: !monthOpen }))}
                                  className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50/80 sm:px-4"
                                >
                                  <div className="flex min-w-0 gap-3">
                                    {monthOpen ? (
                                      <ChevronDown className="mt-0.5 shrink-0 text-slate-400" size={16} />
                                    ) : (
                                      <ChevronRight className="mt-0.5 shrink-0 text-slate-400" size={16} />
                                    )}
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                          {slotLabel}
                                        </span>
                                        {weeks.length > 0 && (
                                          <span className="text-xs text-slate-500">
                                            {weeks.length} week{weeks.length === 1 ? '' : 's'} · {weekDone} complete
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-1 text-sm font-medium text-slate-900">
                                        {month.text?.trim() || 'Monthly outcome (optional)'}
                                      </p>
                                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                                        {month.details?.trim() || 'Edit in Monthly goals if you need notes.'}
                                      </p>
                                    </div>
                                  </div>
                                  <CalendarDays className="mt-1 shrink-0 text-slate-300" size={18} aria-hidden />
                                </button>

                                {monthOpen && (
                                  <div className="space-y-3 border-t border-slate-100 bg-slate-50/40 px-4 py-4 sm:px-4">
                                    {isAdmin && (
                                      <>
                                        {!isAddingByMonth[month.id] ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setIsAddingByMonth((prev) => ({ ...prev, [month.id]: true }));
                                              setNewWeeklyDraftByMonth((prev) => ({
                                                ...prev,
                                                [month.id]: prev[month.id] || { text: '', details: '' },
                                              }));
                                            }}
                                            className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95"
                                          >
                                            <Plus size={15} strokeWidth={2.5} />
                                            Add weekly focus
                                          </button>
                                        ) : (
                                          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">New weekly focus</p>
                                            <textarea
                                              value={newWeeklyDraftByMonth[month.id]?.text || ''}
                                              onChange={(e) =>
                                                setNewWeeklyDraftByMonth((prev) => ({
                                                  ...prev,
                                                  [month.id]: { text: e.target.value, details: prev[month.id]?.details || '' },
                                                }))
                                              }
                                              placeholder="One sentence: what must be true by end of week?"
                                              className="w-full resize-none rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-brand-red/30"
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
                                              placeholder="Optional: sub-steps or TaskHub references"
                                              className="mt-2 w-full resize-none rounded-lg border border-slate-100 bg-white p-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand-red/30"
                                              rows={2}
                                            />
                                            <div className="mt-3 flex flex-wrap gap-2">
                                              <button
                                                type="button"
                                                onClick={() => addWeekly(month.id)}
                                                className="rounded-lg bg-brand-red px-4 py-2 text-xs font-semibold text-white"
                                              >
                                                Save week
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setIsAddingByMonth((prev) => ({ ...prev, [month.id]: false }));
                                                  setNewWeeklyDraftByMonth((prev) => ({ ...prev, [month.id]: { text: '', details: '' } }));
                                                }}
                                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {weeks.length === 0 && !isAddingByMonth[month.id] && (
                                      <p className="text-sm text-slate-500">No weekly focuses yet. Add one above.</p>
                                    )}

                                    <ul className="space-y-3">
                                      {weeks.map((week, weekIndex) => {
                                        const dayCount = state.dailyGoals.filter((d) => d.parentId === week.id).length;
                                        const doneCount = state.dailyGoals.filter((d) => d.parentId === week.id && d.completed).length;
                                        const isEditing = !!editingIds[week.id];

                                        return (
                                          <li key={week.id}>
                                            <div className="flex gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                              <div className="w-1 shrink-0 bg-brand-red/90" aria-hidden />
                                              <div className="min-w-0 flex-1 p-4">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                  <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                      Week focus {weekIndex + 1}
                                                    </p>
                                                    <textarea
                                                      readOnly={!isAdmin || !isEditing}
                                                      value={drafts[week.id]?.text ?? week.text}
                                                      onChange={(e) =>
                                                        setDrafts((prev) => ({
                                                          ...prev,
                                                          [week.id]: {
                                                            text: e.target.value,
                                                            details: prev[week.id]?.details ?? week.details ?? '',
                                                          },
                                                        }))
                                                      }
                                                      placeholder="Weekly outcome"
                                                      className="mt-1 w-full resize-none bg-transparent text-base font-semibold leading-snug text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 disabled:opacity-90"
                                                      rows={isEditing ? 3 : 2}
                                                    />
                                                  </div>
                                                  {isAdmin && (
                                                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                                                      {!isEditing ? (
                                                        <button
                                                          type="button"
                                                          onClick={() => setEditingIds((prev) => ({ ...prev, [week.id]: true }))}
                                                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                        >
                                                          Edit
                                                        </button>
                                                      ) : (
                                                        <button
                                                          type="button"
                                                          onClick={async () => {
                                                            const text = drafts[week.id]?.text ?? week.text;
                                                            const details = drafts[week.id]?.details ?? week.details ?? '';
                                                            updateWeekly(week.id, { text, details });
                                                            await saveGoal({ ...week, text, details }).catch((e) => console.error(e));
                                                            setEditingIds((prev) => ({ ...prev, [week.id]: false }));
                                                          }}
                                                          className="rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white"
                                                        >
                                                          Save
                                                        </button>
                                                      )}
                                                      <button
                                                        type="button"
                                                        onClick={() => deleteWeekly(week.id)}
                                                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                        title="Remove this week"
                                                      >
                                                        <Trash2 size={16} />
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                                <textarea
                                                  readOnly={!isAdmin || !isEditing}
                                                  value={drafts[week.id]?.details ?? week.details ?? ''}
                                                  onChange={(e) =>
                                                    setDrafts((prev) => ({
                                                      ...prev,
                                                      [week.id]: {
                                                        text: prev[week.id]?.text ?? week.text,
                                                        details: e.target.value,
                                                      },
                                                    }))
                                                  }
                                                  placeholder="Notes (visible when editing)"
                                                  className={`mt-2 w-full resize-none rounded-lg border border-transparent p-2 text-sm outline-none ${
                                                    isEditing ? 'bg-slate-50 text-slate-600' : 'bg-transparent text-slate-500'
                                                  }`}
                                                  rows={isEditing ? 2 : 1}
                                                />
                                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                                    Daily steps: {doneCount}/{dayCount || 7} done
                                                  </span>
                                                  <Link
                                                    to={`/daily?weekId=${encodeURIComponent(week.id)}`}
                                                    className="text-[11px] font-medium text-brand-red hover:underline"
                                                  >
                                                    Open in Daily
                                                  </Link>
                                                </div>
                                              </div>
                                            </div>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        );
      })}

      {groupedByYearFixed.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-sm text-slate-500">
          Add a yearly goal first. Each year gets Q1–Q4 and three month slots per quarter automatically.
        </div>
      )}
    </div>
  );
};

export default WeeklyView;
