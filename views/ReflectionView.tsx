
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

import {
  type ReflectionPanel,
  type ReflectionRecord,
  type ReflectionViewProps,
  type DailyReflectionSyncResponse,
  getIndiaDateKey,
} from './reflectionViewHelpers';
import { ReflectionFormPanel } from './ReflectionFormPanel';
import { ReflectionLogsPanel } from './ReflectionLogsPanel';

const ReflectionView: React.FC<ReflectionViewProps> = ({ state, updateState, loading = false }) => {
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
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const setLogsPage = setCurrentPage;

  const paginatedRecords = useMemo(() => {
    const start = (safePage - 1) * LOGS_PER_PAGE;
    return displayedRecords.slice(start, start + LOGS_PER_PAGE);
  }, [displayedRecords, safePage, LOGS_PER_PAGE]);
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

  if (loading && records.length === 0) {
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
        <ReflectionFormPanel
          state={state}
          todayKey={todayKey}
          editingId={editingId}
          myTodayRecord={myTodayRecord}
          handleAccomplishmentsChange={handleAccomplishmentsChange}
          handleChange={handleChange}
          taskSyncHint={taskSyncHint}
          importedTaskCount={importedTaskCount}
          syncLoading={syncLoading}
          tomorrowPreviewTasks={tomorrowPreviewTasks}
          error={error}
          successMessage={successMessage}
          handleSave={handleSave}
          saving={saving}
        />
      )}

      {activePanel === 'logs' && (
        <ReflectionLogsPanel
          isAdmin={isAdmin}
          isLeader={isLeader}
          loadingList={loadingList}
          logsLoaded={logsLoaded}
          logFilter={logFilter}
          setLogFilter={setLogFilter}
          selectedLogDate={selectedLogDate}
          setSelectedLogDate={setSelectedLogDate}
          scope={scope}
          setScope={setScope}
          displayedRecords={displayedRecords}
          paginatedRecords={paginatedRecords}
          employeeAvatarById={employeeAvatarById}
          canEditOrDelete={canEditOrDelete}
          handleEditClick={handleEditClick}
          setConfirmDelete={setConfirmDelete}
          totalPages={totalPages}
          safePage={safePage}
          setLogsPage={setLogsPage}
        />
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

export default ReflectionView;
