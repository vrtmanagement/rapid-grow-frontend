
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PlanningState } from '../types';
import { API_BASE, getAuthHeaders } from '../config/api';
import {
  BrainCircuit,
  Zap,
  AlertCircle,
  Sparkles,
  Send,
  ShieldCheck,
  ScrollText,
  CheckCircle2,
  PenLine,
  Target,
} from 'lucide-react';
import { getSocket } from '../realtime/socket';
import { ReflectionLogSkeleton, Skeleton, SkeletonBlock } from '../components/ui/Skeleton';
import ReflectionHabitsCard from '../components/reflection/ReflectionHabitsCard';
import PageSectionSubnav from '../components/layout/PageSectionSubnav';
import { ThemedDatePicker } from '../components/spaces/SpacesFormControls';
import { getDisplayAvatarUrl, PROFILE_AVATAR_UPDATED_EVENT, resolveAvatarUrl } from '../utils/avatar';
import { extractReviewMatrixPreviewTasks } from '../services/reviewMatrixTaskPreview';
import {
  DailyCompletedTaskSyncItem,
  getDismissedTaskIdsFromText,
  getImportedTaskIdsFromText,
  mergeAccomplishmentText,
} from '../services/reviewMatrixAccomplishmentSync';

type ReflectionPanel = 'form' | 'logs';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  loading?: boolean;
}

interface ReflectionRecord {
  _id: string;
  empId: string;
  empName: string;
  role: string;
  accomplishments: string;
  challenges: string;
  unfinished: string;
  energyPeaks: string;
  bigRocksTomorrow: string;
  date: string;
  createdAt: string;
  updatedAt?: string;
  lastEditedByName?: string;
  lastEditedByEmpId?: string;
  avatar?: string;
}

interface DailyReflectionSyncResponse {
  date: string;
  reviewMatrixId: string;
  syncSource: string;
  lastSyncedAt?: string | null;
  importedTaskIds?: string[];
  dismissedTaskIds?: string[];
  importedTaskCount?: number;
  totalCompletedTaskCount?: number;
  tasks?: DailyCompletedTaskSyncItem[];
}

function getIndiaDateKey(offsetDays = 0): string {
  const baseDate = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(baseDate);
  const year = parts.find((part) => part.type === 'year')?.value || '0000';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

const ReflectionView: React.FC<Props> = ({ state, updateState, loading = false }) => {
  const LOGS_PER_PAGE = 5;
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<ReflectionRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ReflectionPanel>('form');
  const [scope, setScope] = useState<'me' | 'all' | 'team'>('me');
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [myRecordsBootstrapped, setMyRecordsBootstrapped] = useState(false);
  const [logFilter, setLogFilter] = useState<'today' | 'yesterday' | 'all'>('all');
  const [selectedLogDate, setSelectedLogDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [employeeAvatarById, setEmployeeAvatarById] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ReflectionRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [taskHubCompletedTasks, setTaskHubCompletedTasks] = useState<DailyCompletedTaskSyncItem[]>([]);
  const [dismissedSyncedTaskIds, setDismissedSyncedTaskIds] = useState<string[]>([]);
  const [importedTaskIds, setImportedTaskIds] = useState<string[]>([]);
  const [taskSyncHint, setTaskSyncHint] = useState<string>('Submitted and completed tasks from TaskHub are automatically added here.');
  const syncRequestIdRef = useRef(0);
  const latestEditingIdRef = useRef<string | null>(null);
  const latestDismissedTaskIdsRef = useRef<string[]>([]);

  const todayKey = getIndiaDateKey();
  const yesterdayKey = getIndiaDateKey(-1);
  const currentEmpId = (() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('rapidgrow-admin') : null;
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.employee?.empId || null;
    } catch {
      return null;
    }
  })();

  const myTodayRecord = currentEmpId
    ? records.find(r => r.empId === currentEmpId && r.date === todayKey) || null
    : null;

  const displayedRecords = useMemo(
    () =>
      records.filter((r) => {
        if (selectedLogDate && r.date !== selectedLogDate) return false;
        if (logFilter === 'today') return r.date === todayKey;
        if (logFilter === 'yesterday') return r.date === yesterdayKey;
        return true;
      }),
    [records, selectedLogDate, logFilter, todayKey, yesterdayKey],
  );

  const totalPages = Math.max(1, Math.ceil(displayedRecords.length / LOGS_PER_PAGE));

  const paginatedRecords = useMemo(() => {
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const start = (safePage - 1) * LOGS_PER_PAGE;
    return displayedRecords.slice(start, start + LOGS_PER_PAGE);
  }, [displayedRecords, currentPage, totalPages, LOGS_PER_PAGE]);
  const tomorrowPreviewTasks = useMemo(
    () => extractReviewMatrixPreviewTasks(state.reflection.bigRocksTomorrow),
    [state.reflection.bigRocksTomorrow],
  );
  const importedTaskCount = importedTaskIds.length;

  useEffect(() => {
    latestEditingIdRef.current = editingId;
  }, [editingId]);

  useEffect(() => {
    latestDismissedTaskIdsRef.current = dismissedSyncedTaskIds;
  }, [dismissedSyncedTaskIds]);

  useEffect(() => {
    setCurrentPage(1);
  }, [logFilter, selectedLogDate, scope]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const handleChange = (key: keyof typeof state.reflection, val: string) => {
    updateState(prev => ({
      ...prev,
      reflection: { ...prev.reflection, [key]: val }
    }));
  };

  const applyAccomplishmentSync = (
    tasks: DailyCompletedTaskSyncItem[],
    nextDismissedTaskIds: string[],
    baseText = state.reflection.accomplishments,
  ) => {
    const mergedText = mergeAccomplishmentText({
      currentText: baseText,
      tasks,
      dismissedTaskIds: nextDismissedTaskIds,
    });

    if (mergedText !== baseText) {
      handleChange('accomplishments', mergedText);
    }

    setImportedTaskIds(getImportedTaskIdsFromText(mergedText, tasks, nextDismissedTaskIds));
  };

  const loadDailyTaskSync = async (options?: { reflectionId?: string | null; preserveDismissed?: boolean; baseText?: string }) => {
    if (!currentEmpId) return;

    try {
      syncRequestIdRef.current += 1;
      const requestId = syncRequestIdRef.current;
      setSyncLoading(true);

      const params = new URLSearchParams();
      const targetReflectionId = String(options?.reflectionId || '').trim();
      if (targetReflectionId) {
        params.set('reflectionId', targetReflectionId);
      }

      const res = await fetch(`${API_BASE}/reflections/daily-sync?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load TaskHub sync');
      }

      const data: DailyReflectionSyncResponse = await res.json();
      if (requestId !== syncRequestIdRef.current) return;

      const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
      const serverDismissedTaskIds = Array.isArray(data?.dismissedTaskIds) ? data.dismissedTaskIds : [];
      const mergedDismissedTaskIds = Array.from(
        new Set(
          options?.preserveDismissed === false
            ? serverDismissedTaskIds
            : [...latestDismissedTaskIdsRef.current, ...serverDismissedTaskIds],
        ),
      );

      setTaskHubCompletedTasks(tasks);
      setDismissedSyncedTaskIds(mergedDismissedTaskIds);
      applyAccomplishmentSync(tasks, mergedDismissedTaskIds, options?.baseText ?? state.reflection.accomplishments);
      setTaskSyncHint(
        tasks.length
          ? 'Submitted and completed tasks from TaskHub are automatically added here.'
          : 'Submitted and completed tasks from TaskHub are automatically added here when you update work today.',
      );
    } catch (e) {
      console.error(e);
      setTaskSyncHint('Submitted and completed tasks from TaskHub are automatically added here.');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleAccomplishmentsChange = (value: string) => {
    const nextDismissedTaskIds = getDismissedTaskIdsFromText(
      value,
      taskHubCompletedTasks,
      latestDismissedTaskIdsRef.current,
    );
    setDismissedSyncedTaskIds(nextDismissedTaskIds);
    setImportedTaskIds(getImportedTaskIdsFromText(value, taskHubCompletedTasks, nextDismissedTaskIds));
    handleChange('accomplishments', value);
  };

  const loadReflections = async (scopeOverride?: 'me' | 'all' | 'team') => {
    try {
      setLoadingList(true);
      setError(null);
      const scopeToUse = scopeOverride || scope;
      const params = new URLSearchParams();
      params.set('scope', scopeToUse);
      const res = await fetch(`${API_BASE}/reflections?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load reflections');
      }
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
      setLogsLoaded(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load reflections');
    } finally {
      setLoadingList(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      if (!editingId && myTodayRecord) {
        setError('You already submitted today’s report. Use Edit to update it.');
        return;
      }
      const body = {
        accomplishments: state.reflection.accomplishments,
        mistakes: state.reflection.mistakes,
        forgotten: state.reflection.forgotten,
        energyPeaks: state.reflection.energyPeaks,
        bigRocksTomorrow: state.reflection.bigRocksTomorrow,
        taskSync: {
          importedTaskIds,
          dismissedTaskIds: dismissedSyncedTaskIds,
        },
      };
      const url = editingId
        ? `${API_BASE}/reflections/${editingId}`
        : `${API_BASE}/reflections`;
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save reflection');
      }
      const data = await res.json().catch(() => ({}));
      const carryForwardMessage = String(data?.taskCarryForward?.message || '').trim();
      setSuccessMessage(carryForwardMessage || 'Daily report saved successfully.');
      // Clear form after save and reload list
      updateState(prev => ({
        ...prev,
        reflection: {
          ...prev.reflection,
          accomplishments: '',
          mistakes: '',
          forgotten: '',
          energyPeaks: '',
          bigRocksTomorrow: '',
        },
      }));
      setDismissedSyncedTaskIds([]);
      setImportedTaskIds([]);
      setEditingId(null);
      await loadReflections();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to save reflection');
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = state.currentUser.role === 'Admin';
  const isLeader = state.currentUser.role === 'Leader';
  const isEmployee = state.currentUser.role === 'Employee';

  const canEditOrDelete = (record: ReflectionRecord) => {
    if (isAdmin) return true;
    if (!isLeader && !isEmployee) return false;
    if (record.date !== todayKey) return false;
    // Team lead can view employees but cannot edit/delete employees (admin only).
    if (isLeader && currentEmpId && record.empId !== currentEmpId) return false;
    if (isEmployee && currentEmpId && record.empId !== currentEmpId) return false;
    return true;
  };

  const handleEditClick = (record: ReflectionRecord) => {
    if (!canEditOrDelete(record)) return;
    setDismissedSyncedTaskIds([]);
    setImportedTaskIds([]);
    setEditingId(record._id);
    updateState(prev => ({
      ...prev,
      reflection: {
        ...prev.reflection,
        accomplishments: record.accomplishments || '',
        mistakes: record.challenges || '',
        forgotten: record.unfinished || '',
        energyPeaks: record.energyPeaks || '',
        bigRocksTomorrow: record.bigRocksTomorrow || '',
      },
    }));
    setActivePanel('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    void loadDailyTaskSync({
      reflectionId: record._id,
      preserveDismissed: false,
      baseText: record.accomplishments || '',
    });
  };

  const handleDeleteClick = async (record: ReflectionRecord) => {
    if (!canEditOrDelete(record)) return;
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/reflections/${record._id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete reflection');
      }
      if (editingId === record._id) {
        setEditingId(null);
      }
      await loadReflections();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to delete reflection');
    }
  };

  useEffect(() => {
    if (activePanel === 'form' && !myRecordsBootstrapped) {
      loadReflections('me').finally(() => setMyRecordsBootstrapped(true));
      return;
    }
    if (activePanel !== 'logs') return;
    loadReflections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, scope, myRecordsBootstrapped]);

  useEffect(() => {
    if (activePanel !== 'form') return;
    if (myTodayRecord && !editingId) return;
    void loadDailyTaskSync({ reflectionId: editingId, preserveDismissed: !!editingId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, editingId, myTodayRecord?._id]);

  useEffect(() => {
    if (activePanel !== 'form') return;

    const handleFocus = () => {
      if (myTodayRecord && !latestEditingIdRef.current) return;
      void loadDailyTaskSync({
        reflectionId: latestEditingIdRef.current,
        preserveDismissed: true,
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, myTodayRecord?._id]);

  useEffect(() => {
    const loadEmployeeAvatars = async () => {
      try {
        const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];
        const map: Record<string, string> = {};
        list.forEach((emp: any) => {
          const empId = String(emp?.empId || '').trim();
          const avatar = resolveAvatarUrl(emp?.avatar);
          if (empId && avatar) {
            map[empId] = avatar;
          }
        });
        setEmployeeAvatarById(map);
      } catch {
        setEmployeeAvatarById({});
      }
    };
    loadEmployeeAvatars();
  }, []);

  useEffect(() => {
    const handleProfileAvatarUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ avatar?: string; empId?: string }>).detail || {};
      const empId = String(detail.empId || '').trim();
      const avatar = resolveAvatarUrl(detail.avatar);
      if (!empId || !avatar) return;
      setEmployeeAvatarById((prev) => ({ ...prev, [empId]: avatar }));
      setRecords((prev) => prev.map((record) => (record.empId === empId ? { ...record, avatar } : record)));
    };

    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated as EventListener);
    return () => {
      window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onSpacesChanged = (payload: any) => {
      if (activePanel !== 'form') return;
      if (!currentEmpId) return;
      if (myTodayRecord && !latestEditingIdRef.current) return;

      const task = payload?.task;
      const taskAssigneeId = String(task?.assigneeId || '').trim();
      const payloadTaskId = String(task?.taskId || payload?.taskId || '').trim();
      const belongsToCurrentUser =
        taskAssigneeId === currentEmpId ||
        taskHubCompletedTasks.some((item) => item.taskId === payloadTaskId);

      if (!belongsToCurrentUser) return;

      void loadDailyTaskSync({
        reflectionId: latestEditingIdRef.current,
        preserveDismissed: true,
      });
    };

    const onChanged = (payload: any) => {
      const action = payload?.action;
      const reflection = payload?.reflection as ReflectionRecord | undefined;
      const reflectionId = payload?.reflectionId as string | undefined;

      const currentUserRole = (state.currentUser?.role || '').toString();
      const scopeToUse = scope;

      const isMeScope = scopeToUse === 'me';
      const shouldInclude = (r: ReflectionRecord): boolean => {
        if (!currentEmpId) return true;
        if (isMeScope) return r.empId === currentEmpId;
        // For team/all scopes we accept pushed updates and rely on server-side auth;
        // keep a minimal guard to avoid showing other-employee logs to employees.
        if (currentUserRole === 'Employee') return r.empId === currentEmpId;
        return true;
      };

      setRecords((prev) => {
        if (action === 'deleted') {
          if (!reflectionId) return prev;
          return prev.filter((r) => r._id !== reflectionId);
        }

        if (!reflection) return prev;
        if (!shouldInclude(reflection)) return prev;

        const idx = prev.findIndex((r) => r._id === reflection._id);
        const next = idx === -1 ? [reflection, ...prev] : prev.map((r) => (r._id === reflection._id ? reflection : r));
        // match list sorting (newest first)
        return next.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });
    };

    socket.on('spaces:changed', onSpacesChanged);
    socket.on('reflections:changed', onChanged);
    return () => {
      socket.off('spaces:changed', onSpacesChanged);
      socket.off('reflections:changed', onChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, currentEmpId, myTodayRecord?._id, taskHubCompletedTasks]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in duration-700">
        <div className="bg-slate-900 text-white p-8 rounded-2xl flex items-center justify-center gap-8 text-[12px] shadow-2xl border border-white/5 relative overflow-hidden animate-pulse">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-red"></div>
          <Skeleton className="h-4 w-28 bg-white/10" />
          <div className="h-1 w-16 bg-brand-red/20 rounded-full"></div>
          <Skeleton className="h-4 w-40 bg-white/10" />
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="animate-pulse space-y-4 rounded-[1.75rem] border border-slate-800/80 bg-slate-900 p-6">
              <Skeleton className="h-5 w-40 bg-white/10" />
              <Skeleton className="h-4 w-full bg-white/10" />
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={`habit-${index}`} className="h-16 w-full rounded-xl bg-white/10" />
              ))}
            </div>
          </div>

          <div className="min-w-0 space-y-6 lg:col-span-8">
            <div className="animate-pulse space-y-5 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 sm:p-8">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-56" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <SkeletonBlock className="h-7 w-28 rounded-full" />
              </div>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`reflection-field-${index}`} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <Skeleton className="h-5 w-64" />
                  <SkeletonBlock className="h-28 w-full rounded-xl" />
                </div>
              ))}
              <div className="space-y-3 rounded-2xl border border-brand-red/10 bg-red-50/50 p-4">
                <Skeleton className="h-5 w-48" />
                <SkeletonBlock className="h-36 w-full rounded-xl bg-white" />
              </div>
              <SkeletonBlock className="h-14 w-full rounded-xl" />
            </div>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Skeleton className="h-6 w-48" />
              <SkeletonBlock className="h-8 w-56 rounded-full" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          <ReflectionLogSkeleton count={3} />
        </div>
      </div>
    );
  }

  const pageTitle = state.uiConfig.reflectionTitle || 'Daily Reflection';
  const subnavTabClass = (panel: ReflectionPanel) =>
    `border-b-2 px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors sm:text-[12px] ${
      activePanel === panel
        ? 'border-brand-red text-slate-900'
        : 'border-transparent text-slate-500 hover:text-slate-900'
    }`;

  return (
    <div className="w-full pb-24 animate-in fade-in duration-700">
      <PageSectionSubnav
        outerClassName="mb-8"
        leading={
          <>
            <span className="h-1.5 w-8 shrink-0 rounded-full bg-brand-red" />
            <span className="truncate text-sm font-medium text-slate-600 sm:text-[15px]">{pageTitle}</span>
          </>
        }
        center={
          <>
            <button type="button" onClick={() => setActivePanel('form')} className={subnavTabClass('form')}>
              Daily Report
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePanel('logs');
                if (!logsLoaded) void loadReflections();
              }}
              className={subnavTabClass('logs')}
            >
              All Logs
            </button>
          </>
        }
      />

      {activePanel === 'form' && (
        <div className="mx-auto max-w-6xl scroll-mt-24 pt-2">
          <div className="grid gap-8 lg:grid-cols-12">
            <aside className="lg:col-span-4">
              <div className="lg:sticky lg:top-[4.75rem] lg:z-10">
                <ReflectionHabitsCard error={null} />
              </div>
            </aside>

            <div className="min-w-0 lg:col-span-8">
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <div className="relative border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-red-50/40 px-6 py-5 sm:px-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-red">Daily report</p>
                      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">End of Day Report</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Intl.DateTimeFormat('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          timeZone: 'Asia/Kolkata',
                        }).format(new Date(`${todayKey}T12:00:00`))}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editingId ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                          <PenLine size={14} />
                          Editing entry
                        </span>
                      ) : myTodayRecord ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 size={14} />
                          Submitted today
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          <Sparkles size={14} className="text-brand-red" />
                          Ready to submit
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-6 sm:p-8">
                  <ReflectionField
                    step={1}
                    label="What did you accomplish today?"
                    value={state.reflection.accomplishments}
                    onChange={handleAccomplishmentsChange}
                    icon={<Zap className="text-brand-red" size={20} />}
                    placeholder="Summarize wins, deliveries, and momentum you created today..."
                    helper={taskSyncHint}
                    footer={
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                          ✓ Synced from TaskHub
                        </span>
                        <span className="text-slate-500">
                          {importedTaskCount} TaskHub task{importedTaskCount === 1 ? '' : 's'} imported
                        </span>
                        {syncLoading ? <span className="text-slate-400">Refreshing...</span> : null}
                      </div>
                    }
                  />

                  <ReflectionField
                    step={2}
                    label="What didn’t go well? What did you learn?"
                    value={state.reflection.mistakes}
                    onChange={(v) => handleChange('mistakes', v)}
                    icon={<AlertCircle className="text-brand-red" size={20} />}
                    placeholder="Capture setbacks honestly and what you will do differently..."
                  />

                  <ReflectionField
                    step={3}
                    label="What was left unfinished or deferred?"
                    value={state.reflection.forgotten}
                    onChange={(v) => handleChange('forgotten', v)}
                    icon={<ShieldCheck className="text-slate-700" size={20} />}
                    placeholder="Note open loops so they do not get lost overnight..."
                  />

                  <ReflectionField
                    step={4}
                    label="When did you feel most energized?"
                    value={state.reflection.energyPeaks}
                    onChange={(v) => handleChange('energyPeaks', v)}
                    icon={<BrainCircuit className="text-brand-red" size={20} />}
                    placeholder="Morning focus block, collaboration, deep work — what gave you energy?"
                  />

                  <div className="relative overflow-hidden rounded-2xl border border-brand-red/20 bg-gradient-to-br from-red-50 via-white to-white p-5 sm:p-6">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand-red/10 blur-2xl" />
                    <div className="relative space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red text-white shadow-md shadow-brand-red/25">
                          <Target size={18} />
                        </span>
                        <div>
                          <label className="text-base font-semibold text-slate-900">Top priorities for tomorrow</label>
                          <p className="mt-1 text-sm text-slate-500">
                            Tasks added here will automatically appear in your TaskHub for tomorrow.
                          </p>
                        </div>
                      </div>
                      <textarea
                        value={state.reflection.bigRocksTomorrow}
                        onChange={(e) => handleChange('bigRocksTomorrow', e.target.value)}
                        rows={4}
                        className="w-full resize-none overflow-y-auto rounded-xl border border-brand-red/15 bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10"
                        placeholder="List the 1–3 most important tasks to start tomorrow with clarity."
                      />
                      <div className="rounded-xl border border-brand-red/10 bg-white/80 px-4 py-3">
                        <p className="text-sm font-medium text-slate-700">
                          {tomorrowPreviewTasks.length
                            ? `${tomorrowPreviewTasks.length} task${tomorrowPreviewTasks.length === 1 ? '' : 's'} will be created in TaskHub.`
                            : 'Add tomorrow priorities to preview the tasks that will be created in TaskHub.'}
                        </p>
                        {tomorrowPreviewTasks.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {tomorrowPreviewTasks.slice(0, 6).map((task) => (
                              <span
                                key={task}
                                className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-brand-red"
                              >
                                {task}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-5 sm:px-8">
                  {error ? (
                    <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                  ) : null}
                  {successMessage ? (
                    <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {successMessage}
                    </p>
                  ) : null}
                  {!editingId && myTodayRecord ? (
                    <p className="mb-4 text-sm text-slate-600">
                      You already submitted today&apos;s report. Use <span className="font-semibold">All Logs</span> to edit if needed.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || (!!myTodayRecord && !editingId)}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-brand-red to-[#c41e24] px-6 py-4 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(230,28,33,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(230,28,33,0.32)] hover:from-brand-navy hover:to-slate-900 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    <Send size={20} className="-rotate-45" />
                    {saving ? 'Saving...' : editingId ? 'Save updates' : 'Submit daily report'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activePanel === 'logs' && (
        <div className="max-w-6xl mx-auto pt-2 bg-gradient-to-br from-white via-white to-red-50/30 rounded-[2.5rem] border border-slate-200 shadow-[0_24px_60px_rgba(15,23,42,0.08)] p-10 space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <ScrollText className="text-brand-red" size={22} />
              <div>
                <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Reflection Logs</h3>
                <p className="text-sm text-slate-500 mt-0.5">Browse saved daily reports. Use the filters below to narrow results.</p>
              </div>
            </div>
            {loadingList && <span className="text-xs text-slate-500">Loading...</span>}
          </div>

          <div className={`grid gap-6 ${isAdmin || isLeader ? 'lg:grid-cols-2' : 'max-w-2xl'}`}>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-red mb-1">Quick date filter</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex flex-wrap items-center rounded-full border border-slate-200 bg-slate-50 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setLogFilter('today');
                      setSelectedLogDate('');
                    }}
                    className={`px-3 py-1 rounded-full ${logFilter === 'today' && !selectedLogDate ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLogFilter('yesterday');
                      setSelectedLogDate('');
                    }}
                    className={`px-3 py-1 rounded-full ${logFilter === 'yesterday' && !selectedLogDate ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLogFilter('all');
                      setSelectedLogDate('');
                    }}
                    className={`px-3 py-1 rounded-full ${logFilter === 'all' && !selectedLogDate ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
                  >
                    All dates
                  </button>
                  <ThemedDatePicker
                    pill
                    active={!!selectedLogDate}
                    forceOpenDown
                    value={selectedLogDate}
                    onChange={(value) => {
                      setSelectedLogDate(value);
                      if (value) {
                        setLogFilter('all');
                        return;
                      }
                      setLogFilter('all');
                    }}
                  />
                </div>
              </div>
            </div>

            {(isAdmin || isLeader) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1">Whose reports to show</p>
                <p className="text-xs text-slate-500 mb-3">
                  {isAdmin
                    ? 'View only your entries or every employee’s daily reports.'
                    : 'View your report or your team members’ reports.'}
                </p>
                <div className="inline-flex flex-wrap rounded-full border border-slate-200 bg-slate-50 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setScope('me')}
                    className={`px-3 py-1 rounded-full ${scope === 'me' ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
                  >
                    My reports only
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setScope('all')}
                      className={`px-3 py-1 rounded-full ${scope === 'all' ? 'bg-brand-red text-white' : 'text-slate-700'}`}
                    >
                      Everyone (all staff)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setScope('team')}
                      className={`px-3 py-1 rounded-full ${scope === 'team' ? 'bg-brand-red text-white' : 'text-slate-700'}`}
                    >
                      My team only
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        {displayedRecords.length === 0 && !loadingList && (
          <p className="text-sm text-slate-500">
            {logsLoaded
              ? 'No reflections match these filters.'
              : 'No reflections logged yet. Submit a daily report from the Daily Report tab.'}
          </p>
        )}
        <div className="space-y-4">
          {loadingList ? (
            <ReflectionLogSkeleton count={5} />
          ) : paginatedRecords.map((r) => (
            <div
              key={r._id}
              className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  {(() => {
                    const avatarSrc = getDisplayAvatarUrl(r.avatar || employeeAvatarById[r.empId], r.empName || r.empId);
                    return (
                    <img
                      src={avatarSrc}
                      alt={r.empName}
                      className="h-10 w-10 rounded-full object-cover border border-slate-200 bg-slate-50"
                    />
                    );
                  })()}
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {r.empName} ({r.empId})
                    </span>
                  <span className="text-xs text-slate-500">
                    {r.role} • {r.date}
                  </span>
                  {r.updatedAt && r.updatedAt !== r.createdAt && (
                    <span className="mt-1 inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Edited{r.lastEditedByName ? ` by ${r.lastEditedByName}` : ''}
                    </span>
                  )}
                </div>
                </div>
                {canEditOrDelete(r) && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleEditClick(r)}
                      className="px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(r)}
                      className="px-3 py-1 rounded-full border border-red-300 text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-700">
                {r.accomplishments && (
                  <div>
                    <span className="font-semibold block mb-1">
                      Today&apos;s accomplishments
                    </span>
                    <p className="whitespace-pre-line">{r.accomplishments}</p>
                  </div>
                )}
                {r.challenges && (
                  <div>
                    <span className="font-semibold block mb-1">
                      Challenges / learnings
                    </span>
                    <p className="whitespace-pre-line">{r.challenges}</p>
                  </div>
                )}
                {r.unfinished && (
                  <div>
                    <span className="font-semibold block mb-1">
                      Unfinished / deferred
                    </span>
                    <p className="whitespace-pre-line">{r.unfinished}</p>
                  </div>
                )}
                {r.energyPeaks && (
                  <div>
                    <span className="font-semibold block mb-1">
                      Energy peaks
                    </span>
                    <p className="whitespace-pre-line">{r.energyPeaks}</p>
                  </div>
                )}
                {r.bigRocksTomorrow && (
                  <div className="md:col-span-2">
                    <span className="font-semibold block mb-1">
                      Priorities for tomorrow
                    </span>
                    <p className="whitespace-pre-line">
                      {r.bigRocksTomorrow}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {!loadingList && displayedRecords.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80">
            <p className="text-xs text-slate-500">
              Showing {(currentPage - 1) * LOGS_PER_PAGE + 1}-
              {Math.min(currentPage * LOGS_PER_PAGE, displayedRecords.length)} of {displayedRecords.length}
            </p>
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                Previous
              </button>
              <span className="text-xs text-slate-600 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-full border border-brand-red/30 text-brand-red hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <h4 className="text-lg font-semibold text-slate-900">Delete reflection?</h4>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete this daily reflection log for{' '}
              <span className="font-semibold text-slate-800">{confirmDelete.date}</span>?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const toDelete = confirmDelete;
                  setConfirmDelete(null);
                  await handleDeleteClick(toDelete);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const reflectionTextareaClassName =
  'w-full resize-none overflow-y-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10';

type ReflectionFieldProps = {
  step: number;
  label: string;
  helper?: string;
  footer?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
};

const ReflectionField: React.FC<ReflectionFieldProps> = ({
  step,
  label,
  helper,
  footer,
  value,
  onChange,
  icon,
  placeholder = 'Share your thoughts...',
}) => (
  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors focus-within:border-brand-red/30 focus-within:bg-white focus-within:shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-5">
    <div className="mb-3 flex items-start gap-3">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-brand-red shadow-sm ring-1 ring-slate-200/80">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <label className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-red ring-1 ring-slate-200/80">
            {icon}
          </span>
          {label}
        </label>
        {helper ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{helper}</p> : null}
      </div>
    </div>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      className={reflectionTextareaClassName}
      placeholder={placeholder}
    />
    {footer ? <div className="mt-3">{footer}</div> : null}
  </div>
);

export default ReflectionView;
