
import React, { useEffect, useState } from 'react';
import { PlanningState } from '../types';
import { API_BASE, getAuthHeaders } from '../config/api';
import { BrainCircuit, Zap, AlertCircle, Sparkles, Send, ShieldCheck } from 'lucide-react';
import { getSocket } from '../realtime/socket';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
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
}

const ReflectionView: React.FC<Props> = ({ state, updateState }) => {
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<ReflectionRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<'me' | 'all' | 'team'>('me');
  const [logFilter, setLogFilter] = useState<'today' | 'yesterday' | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ReflectionRecord | null>(null);

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayKey = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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

  const displayedRecords = records.filter((r) => {
    if (logFilter === 'today') return r.date === todayKey;
    if (logFilter === 'yesterday') return r.date === yesterdayKey;
    return true;
  });

  const handleChange = (key: keyof typeof state.reflection, val: string) => {
    updateState(prev => ({
      ...prev,
      reflection: { ...prev.reflection, [key]: val }
    }));
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    loadReflections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = getSocket();
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

    socket.on('reflections:changed', onChanged);
    return () => {
      socket.off('reflections:changed', onChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in duration-700">
      <div className="bg-slate-900 text-white p-8 rounded-2xl flex items-center justify-center gap-8 text-[12px] shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-red"></div>
        <span className="text-brand-red">Daily Reflection</span>
        <div className="h-1 w-16 bg-brand-red/20 rounded-full"></div>
        <span className="opacity-60">{state.uiConfig.reflectionSub}</span>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-16 rounded-[3rem] border border-slate-200 shadow-sm space-y-12 group hover:border-brand-red/30 transition-all">
            <h2 className="text-4xl text-slate-900 flex items-center gap-6">
              End of Day Report
              <Sparkles className="text-brand-red" size={32} />
            </h2>

            <ReflectionField 
              label="What did you accomplish today?"
              helper="List the key tasks you completed or moved forward. Making progress is the single biggest motivator."
              value={state.reflection.accomplishments}
              onChange={(v) => handleChange('accomplishments', v)}
              icon={<Zap className="text-brand-red" size={24} />}
            />

            <ReflectionField 
              label="What didn’t go well? What did you learn?"
              value={state.reflection.mistakes}
              onChange={(v) => handleChange('mistakes', v)}
              icon={<AlertCircle className="text-brand-red" size={24} />}
            />

            <ReflectionField 
              label="What was left unfinished or deferred?"
              value={state.reflection.forgotten}
              onChange={(v) => handleChange('forgotten', v)}
              icon={<ShieldCheck className="text-slate-800" size={24} />}
            />

            <ReflectionField 
              label="When did you feel most energized?"
              value={state.reflection.energyPeaks}
              onChange={(v) => handleChange('energyPeaks', v)}
              icon={<BrainCircuit className="text-brand-red" size={24} />}
            />

            <div className="bg-red-50 p-10 rounded-[2.5rem] border-4 border-brand-red/10">
               <label className="flex items-center gap-3 text-md text-brand-red mb-6">
                 <Send className="text-brand-red -rotate-45" size={20} />
                 Top priorities for tomorrow
               </label>
               <textarea 
                 value={state.reflection.bigRocksTomorrow}
                 onChange={(e) => handleChange('bigRocksTomorrow', e.target.value)}
                 className="w-full bg-white border-2 border-brand-red/10 rounded-2xl p-8 text-lg text-slate-800 focus:border-brand-red focus:ring-[16px] focus:ring-brand-red/5 outline-none h-48 transition-all shadow-sm"
                 placeholder="List the most important tasks you will work on tomorrow so you can start the day with clarity."
               />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 p-12 rounded-[2.5rem] text-white space-y-12 shadow-2xl relative overflow-hidden border border-white/5 group">
            <div className="absolute top-0 right-0 w-2 h-full bg-brand-red"></div>
            <h3 className="text-2xl text-brand-red relative z-10">Standard Protocol</h3>
            <div className="flex items-center gap-8 relative z-10">
              <div className="w-24 h-24 rounded-2xl border-4 border-brand-red flex items-center justify-center text-3xl shadow-2xl bg-white/5">25m</div>
              <p className="text-[15px] leading-loose text-slate-800">Tactical <br/> Daily Review</p>
            </div>
            <div className="h-px bg-white/10 w-full relative z-10"></div>
            <h3 className="text-2xl text-slate-300 relative z-10">Deep Synthesis</h3>
            <div className="flex items-center gap-8 relative z-10">
              <div className="w-24 h-24 rounded-2xl border-4 border-slate-700 flex items-center justify-center text-3xl shadow-2xl bg-white/5">45m</div>
              <p className="text-[15px] leading-loose text-slate-800">Advanced <br/> Architecture</p>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10">
            <h3 className="text-xl text-slate-900">Daily Reflection Habits</h3>
            <ul className="space-y-8">
              <HabitItem text="Write what you accomplished today so you end the day with a sense of completion." />
              <HabitItem text="Note when you felt most energized so you can design more of those moments." />
              <HabitItem text="Capture your top action items for tomorrow before you log off." />
              <HabitItem text="Send a quick thank you message or email to someone (including yourself) who deserves it." />
            </ul>
            {error && (
              <p className="mt-3 text-xs text-red-500">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!!myTodayRecord && !editingId)}
              className="w-full mt-6 flex items-center justify-center gap-4 bg-brand-red text-white py-6 rounded-2xl text-md shadow-2xl hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Send size={24} className="-rotate-45" />
              {saving ? 'Saving...' : editingId ? 'Save Updates' : 'Save Daily Report'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h3 className="text-xl font-semibold text-slate-900">
              Daily Reflection Log
            </h3>
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setLogFilter('today')}
                className={`px-3 py-1 rounded-full ${logFilter === 'today' ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('yesterday')}
                className={`px-3 py-1 rounded-full ${logFilter === 'yesterday' ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('all')}
                className={`px-3 py-1 rounded-full ${logFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
              >
                All logs
              </button>
            </div>
            {(isAdmin || isLeader) && (
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setScope('me');
                    loadReflections('me');
                  }}
                  className={`px-3 py-1 rounded-full ${scope === 'me' ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
                >
                  Me
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setScope('all');
                      loadReflections('all');
                    }}
                    className={`px-3 py-1 rounded-full ${scope === 'all' ? 'bg-brand-red text-white' : 'text-slate-700'}`}
                  >
                    All logs
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setScope('team');
                      loadReflections('team');
                    }}
                    className={`px-3 py-1 rounded-full ${scope === 'team' ? 'bg-brand-red text-white' : 'text-slate-700'}`}
                  >
                    Employee logs
                  </button>
                )}
              </div>
            )}
          </div>
          {loadingList && (
            <span className="text-xs text-slate-500">Loading...</span>
          )}
        </div>
        {displayedRecords.length === 0 && !loadingList && (
          <p className="text-sm text-slate-500">
            No reflections logged yet. Save your first daily report above.
          </p>
        )}
        <div className="space-y-4">
          {displayedRecords.map((r) => (
            <div
              key={r._id}
              className="border border-slate-200 rounded-2xl p-6 bg-slate-50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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
      </div>

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

const ReflectionField = ({ label, helper, value, onChange, icon }: any) => (
    <div className="space-y-6">
    <label className="flex items-center gap-4 text-md text-slate-800">
      <div className="p-3 bg-slate-50 rounded-xl text-brand-red">{icon}</div>
      {label}
    </label>
    {helper && <p className="text-[15px] text-slate-800 ml-16 opacity-70">({helper})</p>}
    <textarea 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-8 text-lg text-slate-700 focus:bg-white focus:border-brand-red focus:ring-[16px] focus:ring-red-50 transition-all outline-none h-40 resize-none shadow-inner"
      placeholder="Execute deep thought process here..."
    />
  </div>
);

const HabitItem = ({ text }: { text: string }) => (
  <li className="flex gap-6 text-md text-slate-600 font-medium leading-relaxed ">
    <div className="w-2.5 h-2.5 rounded-full bg-brand-red shrink-0 mt-2 shadow-sm"></div>
    {text}
  </li>
);

export default ReflectionView;
