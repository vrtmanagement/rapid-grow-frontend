import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarRange, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import PageSectionSubnav from '../components/layout/PageSectionSubnav';
import { PageHeaderSkeleton } from '../components/ui/Skeleton';
import StrategyCalendarGrid from '../components/strategyExecution/StrategyCalendarGrid';
import StrategyMonthDetail from '../components/strategyExecution/StrategyMonthDetail';
import StrategyPillarsPanel from '../components/strategyExecution/StrategyPillarsPanel';
import {
  appendNumberedNote,
  deleteNumberedNote,
  updateNumberedNote,
} from '../components/strategyExecution/strategyExecutionNotes';
import { API_BASE, getAuthHeaders } from '../config/api';
import {
  apiGetStrategyExecution,
  apiGetStrategyYears,
  apiUpdateStrategyExecution,
  apiUpdateStrategyMonth,
  progressPercent,
  StrategyEmployeeOption,
  StrategyExecutionPlan,
  StrategyEventStatus,
  StrategyWhoAssignee,
  StrategyWhoRole,
} from '../services/strategyExecutionApi';

type TabKey = 'calendar' | 'pillars';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'calendar', label: 'Execution Calendar', icon: <CalendarRange size={16} /> },
  { key: 'pillars', label: 'Strategy Map', icon: <Layers size={16} /> },
];

const StrategyExecutionView: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [tab, setTab] = useState<TabKey>('calendar');
  const [plan, setPlan] = useState<StrategyExecutionPlan | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftPurpose, setDraftPurpose] = useState('');
  const [draftOutcome, setDraftOutcome] = useState('');
  const [draftWhoAssignees, setDraftWhoAssignees] = useState<StrategyWhoAssignee[]>([]);
  const [employees, setEmployees] = useState<StrategyEmployeeOption[]>([]);
  const [draftPillars, setDraftPillars] = useState<StrategyExecutionPlan['pillars']>([]);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const yearIndex = availableYears.indexOf(year);
  const hasPrevYear = yearIndex > 0;
  const hasNextYear = yearIndex >= 0 && yearIndex < availableYears.length - 1;

  const applyPlan = useCallback((res: { plan: StrategyExecutionPlan; canManage: boolean }) => {
    setPlan(res.plan);
    setCanManage(Boolean(res.canManage));
    setSelectedMonth((prev) =>
      res.plan.events.some((e) => e.month === prev) ? prev : (res.plan.events[0]?.month ?? 1)
    );
    setDraftPillars(res.plan.pillars || []);
  }, []);

  const loadPlan = useCallback(async (targetYear: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGetStrategyExecution(targetYear);
      applyPlan(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load strategy execution calendar');
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [applyPlan]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      setError('');
      try {
        let { years, canManage: manage } = await apiGetStrategyYears();
        if (cancelled) return;

        if (!years.length) {
          await apiGetStrategyExecution(currentYear);
          if (cancelled) return;
          const refreshed = await apiGetStrategyYears();
          years = refreshed.years;
          manage = refreshed.canManage;
        }

        const targetYear = years.includes(currentYear)
          ? currentYear
          : years[years.length - 1];

        setCanManage(Boolean(manage));
        setAvailableYears(years);
        setYear(targetYear);
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load strategy execution calendar');
          setLoading(false);
        }
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [currentYear]);

  useEffect(() => {
    if (!ready || !availableYears.includes(year)) return;
    loadPlan(year);
  }, [year, ready, availableYears, loadPlan]);

  const goToPrevYear = () => {
    if (!hasPrevYear) return;
    setYear(availableYears[yearIndex - 1]);
  };

  const goToNextYear = () => {
    if (!hasNextYear) return;
    setYear(availableYears[yearIndex + 1]);
  };

  const selectedEvent = useMemo(
    () => plan?.events.find((e) => e.month === selectedMonth) ?? null,
    [plan, selectedMonth]
  );

  useEffect(() => {
    setDraftNotes('');
    if (!selectedEvent) {
      setDraftPurpose('');
      setDraftOutcome('');
      setDraftWhoAssignees([]);
      return;
    }
    setDraftPurpose(selectedEvent.purpose || '');
    setDraftOutcome(selectedEvent.outcome || '');
    setDraftWhoAssignees(
      selectedEvent.whoAssignees?.length ? [...selectedEvent.whoAssignees] : []
    );
  }, [selectedEvent]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];
        const allowedRoles: StrategyWhoRole[] = ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD', 'EMPLOYEE'];
        setEmployees(
          list
            .map((entry: Record<string, unknown>) => ({
              empId: String(entry.empId || entry._id || '').trim(),
              name: String(entry.empName || entry.name || '').trim(),
              role: (allowedRoles.includes(entry.role as StrategyWhoRole)
                ? entry.role
                : 'EMPLOYEE') as StrategyWhoRole,
            }))
            .filter((entry: StrategyEmployeeOption) => entry.empId && entry.name)
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch {
        setEmployees([]);
      }
    };
    loadEmployees();
  }, []);

  const detailsDirty = useMemo(() => {
    if (!selectedEvent) return false;
    const savedAssignees = selectedEvent.whoAssignees || [];
    const assigneesChanged =
      draftWhoAssignees.length !== savedAssignees.length ||
      draftWhoAssignees.some(
        (item, index) =>
          item.empId !== savedAssignees[index]?.empId ||
          item.name !== savedAssignees[index]?.name ||
          item.role !== savedAssignees[index]?.role
      );
    return (
      draftPurpose !== (selectedEvent.purpose || '') ||
      draftOutcome !== (selectedEvent.outcome || '') ||
      assigneesChanged
    );
  }, [selectedEvent, draftPurpose, draftOutcome, draftWhoAssignees]);

  const handleSelectMonth = (month: number) => {
    setSelectedMonth(month);
    setDraftNotes('');
  };

  const handleStatusChange = async (month: number, status: StrategyEventStatus) => {
    if (!canManage) return;
    setSaving(true);
    try {
      const res = await apiUpdateStrategyMonth(year, month, { status });
      setPlan(res.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const persistNotes = async (nextNotes: string) => {
    setSaving(true);
    try {
      const res = await apiUpdateStrategyMonth(year, selectedMonth, { notes: nextNotes });
      setPlan(res.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!canManage || !selectedEvent) return;
    const draft = draftNotes.trim();
    if (!draft) return;

    const mergedNotes = appendNumberedNote(selectedEvent.notes || '', draft);
    setDraftNotes('');
    await persistNotes(mergedNotes);
  };

  const handleEditNote = async (noteNumber: number, newBody: string) => {
    if (!canManage || !selectedEvent) return;
    const mergedNotes = updateNumberedNote(selectedEvent.notes || '', noteNumber, newBody);
    await persistNotes(mergedNotes);
  };

  const handleDeleteNote = async (noteNumber: number) => {
    if (!canManage || !selectedEvent) return;
    const mergedNotes = deleteNumberedNote(selectedEvent.notes || '', noteNumber);
    await persistNotes(mergedNotes);
  };

  const handleSaveDetails = async () => {
    if (!canManage || !selectedEvent || !detailsDirty) return;
    setSaving(true);
    try {
      const res = await apiUpdateStrategyMonth(year, selectedMonth, {
        purpose: draftPurpose,
        outcome: draftOutcome,
        whoAssignees: draftWhoAssignees,
      });
      setPlan(res.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save month details');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePillars = async () => {
    if (!canManage || !plan) return;
    setSaving(true);
    try {
      const res = await apiUpdateStrategyExecution(year, { pillars: draftPillars });
      setPlan(res.plan);
      setDraftPillars(res.plan.pillars);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save strategy map');
    } finally {
      setSaving(false);
    }
  };

  const progress = plan ? progressPercent(plan.events) : 0;

  if (loading && !plan) {
    return <PageHeaderSkeleton />;
  }

  return (
    <div className="w-full min-w-0 pb-8 animate-in fade-in duration-700">
      <PageSectionSubnav
        sticky={false}
        outerClassName="mb-8"
        innerClassName="gap-1.5 py-1 md:min-h-[48px]"
        leading={
          <>
            <span className="h-1.5 w-8 shrink-0 rounded-full bg-brand-red" />
            <span className="truncate text-sm font-medium text-slate-600 sm:text-[15px] dark:text-slate-300">
              Strategy Execution Calendar
            </span>
          </>
        }
        center={
          <div className="flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors sm:px-3 sm:py-2 sm:text-xs ${
                  tab === item.key
                    ? 'border-brand-red text-brand-red'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        }
        trailing={
          <div className="flex items-center gap-2">
            {hasPrevYear ? (
              <button
                type="button"
                className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"
                onClick={goToPrevYear}
                aria-label="Previous year"
              >
                <ChevronLeft size={16} />
              </button>
            ) : (
              <span className="w-9" aria-hidden />
            )}
            <span className="min-w-[4rem] text-center text-sm font-bold">{year}</span>
            {hasNextYear ? (
              <button
                type="button"
                className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"
                onClick={goToNextYear}
                aria-label="Next year"
              >
                <ChevronRight size={16} />
              </button>
            ) : (
              <span className="w-9" aria-hidden />
            )}
          </div>
        }
      />

      <div className="relative z-0 mx-auto max-w-7xl min-w-0 space-y-6">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Growth As A Process — annual planning &amp; execution rhythm
        </p>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

      {tab === 'calendar' && plan && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Annual progress</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{progress}%</p>
            </div>
            <div className="h-2 flex-1 min-w-[200px] rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-2 rounded-full bg-brand-red transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              {plan.events.filter((e) => e.status === 'completed').length} of {plan.events.length} months completed
            </p>
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,24rem)] 2xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,26rem)]">
            <div className="min-w-0">
              <StrategyCalendarGrid
                events={plan.events}
                selectedMonth={selectedMonth}
                onSelectMonth={handleSelectMonth}
                canManage={canManage}
                onStatusChange={handleStatusChange}
              />
            </div>
            <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
              <StrategyMonthDetail
                event={selectedEvent}
                canManage={canManage}
                draftPurpose={draftPurpose}
                draftOutcome={draftOutcome}
                draftWhoAssignees={draftWhoAssignees}
                onPurposeChange={setDraftPurpose}
                onOutcomeChange={setDraftOutcome}
                onWhoAssigneesChange={setDraftWhoAssignees}
                onSaveDetails={handleSaveDetails}
                detailsDirty={detailsDirty}
                employees={employees}
                savedNotes={selectedEvent?.notes || ''}
                draftNote={draftNotes}
                onDraftNoteChange={setDraftNotes}
                onSaveNotes={handleSaveNotes}
                onEditNote={handleEditNote}
                onDeleteNote={handleDeleteNote}
                saving={saving}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'pillars' && plan && (
        <div className="space-y-6">
          <StrategyPillarsPanel
            pillars={draftPillars}
            canManage={canManage}
            onChange={setDraftPillars}
          />
          {canManage && (
            <div className="sticky bottom-4 z-20 flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleSavePillars}
                className="rounded-xl bg-brand-red px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-red/25 transition hover:bg-brand-red/90 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save strategy map'}
              </button>
            </div>
          )}
        </div>
      )}

      </div>
    </div>
  );
};

export default StrategyExecutionView;
