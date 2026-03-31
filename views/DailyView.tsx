
import React, { useEffect, useState } from 'react';
import { PlanningState } from '../types';
import { Clock, Star, ListCheck, Pin, Link2 } from 'lucide-react';
import { PriorityStamp } from '../constants';
import { API_BASE, getAuthHeaders } from '../config/api';
import { Skeleton, SkeletonBlock } from '../components/ui/Skeleton';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  loading?: boolean;
}

interface SpacesTaskSummary {
  taskId: string;
  title: string;
  assigneeId: string;
  dueDate: string;
  priority: string;
  status: string;
}

function getLoggedInEmpId(): string {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed?.employee?.empId || '';
  } catch {
    return '';
  }
}

const DailyView: React.FC<Props> = ({ state, updateState, loading = false }) => {
  const [topTasks, setTopTasks] = useState<SpacesTaskSummary[]>([]);
  const isAdmin = state.currentUser.role === 'Admin';

  useEffect(() => {
    const empId = getLoggedInEmpId();
    if (!empId) return;

    const loadTasks = async () => {
      try {
        const res = await fetch(`${API_BASE}/spaces`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const tasks: any[] = Array.isArray(data?.tasks) ? data.tasks : [];

        const meTasks = tasks.filter(
          (t) =>
            t.assigneeId === empId &&
            typeof t.dueDate === 'string' &&
            t.dueDate.trim() &&
            t.status !== 'done',
        );

        const parsed = meTasks
          .map((t) => {
            const dStr = String(t.dueDate).trim();
            const d = new Date(`${dStr}T00:00:00`);
            if (isNaN(d.getTime())) return null;
            return {
              taskId: t.taskId,
              title: t.title || '',
              assigneeId: t.assigneeId || '',
              dueDate: dStr,
              priority: t.priority || 'medium',
              status: t.status || 'todo',
              _due: d.getTime(),
            } as any;
          })
          .filter(Boolean) as (SpacesTaskSummary & { _due: number })[];

        parsed.sort((a, b) => a._due - b._due);
        setTopTasks(parsed.slice(0, 5));
      } catch {
        // ignore errors for daily view
      }
    };

    loadTasks();
  }, []);
  const handlePriorityChange = (idx: number, val: string) => {
    updateState(prev => {
      const newP = [...prev.dailyPriorities];
      newP[idx] = val;
      return { ...prev, dailyPriorities: newP };
    });
  };

  const handleScheduleChange = (idx: number, activity: string) => {
    updateState(prev => {
      const newS = [...prev.schedule];
      newS[idx] = { ...newS[idx], activity };
      return { ...prev, schedule: newS };
    });
  };

  const toggleDaily = (id: string) => {
    if (!isAdmin) return;
    updateState((prev) => ({
      ...prev,
      dailyGoals: prev.dailyGoals.map((d) => (d.id === id ? { ...d, completed: !d.completed } : d)),
    }));
  };

  const updateDailyText = (id: string, text: string) => {
    if (!isAdmin) return;
    updateState((prev) => ({
      ...prev,
      dailyGoals: prev.dailyGoals.map((d) => (d.id === id ? { ...d, text } : d)),
    }));
  };

  const dailyGroups = state.weeklyGoals.map((week) => ({
    week,
    days: state.dailyGoals.filter((d) => d.parentId === week.id),
  }));

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-pulse">
            <Skeleton className="h-6 w-56 mb-4" />
            <div className="space-y-4 max-h-[420px]">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`daily-group-${index}`} className="border border-slate-100 rounded-xl p-3 space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((__, itemIndex) => (
                      <div key={`daily-item-${index}-${itemIndex}`} className="flex items-center gap-2">
                        <SkeletonBlock className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm animate-pulse">
            <div className="flex items-center gap-3 mb-6">
              <SkeletonBlock className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-52" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`priority-skeleton-${index}`} className="flex items-center gap-4">
                  <SkeletonBlock className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-brand-indigo/5 p-8 rounded-[3rem] border-2 border-brand-indigo/10 space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-44" />
            </div>
            <SkeletonBlock className="h-[200px] w-full rounded-2xl bg-white" />
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col animate-pulse">
          <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex-1 divide-y divide-slate-100">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={`schedule-skeleton-${index}`} className="flex">
                <div className="w-24 px-4 py-6 bg-slate-50 border-r border-slate-100 flex items-center justify-center shrink-0">
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex-1 p-4 flex items-center">
                  <Skeleton className="h-5 w-full" />
                </div>
              </div>
            ))}
          </div>
          <div className="p-8 bg-slate-50 border-t border-slate-200">
            <Skeleton className="h-4 w-40 mb-4" />
            <SkeletonBlock className="h-[120px] w-full rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-5 space-y-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg text-slate-800 mb-4">Daily Protocol by Weekly Goal</h3>
          <div className="space-y-4 max-h-[420px] overflow-y-auto">
            {dailyGroups.map(({ week, days }) => (
              <div key={week.id} className="border border-slate-100 rounded-xl p-3">
                <div className="text-sm font-medium text-slate-700 mb-2">{week.text || 'Untitled Weekly Goal'}</div>
                <div className="space-y-2">
                  {days.map((day) => (
                    <label key={day.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={day.completed} onChange={() => toggleDaily(day.id)} disabled={!isAdmin} />
                      <input
                        type="text"
                        value={day.text}
                        onChange={(e) => updateDailyText(day.id, e.target.value)}
                        readOnly={!isAdmin}
                        className="flex-1 bg-transparent border-b border-slate-200 outline-none text-sm"
                      />
                    </label>
                  ))}
                  {!days.length && <div className="text-xs text-slate-500">No days mapped.</div>}
                </div>
              </div>
            ))}
            {!dailyGroups.length && <div className="text-sm text-slate-500">No weekly goals found.</div>}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-brand-indigo/30 transition-all">
          <div className="absolute top-4 right-4 rotate-12">
            <PriorityStamp />
          </div>
          <div className="flex items-center gap-3 mb-6">
            <Star className="text-amber-400 fill-current" size={24} />
            <h3 className="text-xl text-slate-800">Top 5 Priorities For Today</h3>
          </div>
          <div className="space-y-4">
            {topTasks.length > 0
              ? topTasks.map((t, i) => (
                  <div key={t.taskId} className="flex flex-col gap-1 group/item">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-md shrink-0 group-focus-within/item:bg-brand-gradient group-focus-within/item:text-white transition-all">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{t.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Due: {t.dueDate || '—'} · Priority: {t.priority}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              : state.dailyPriorities.map((p, i) => (
                  <div key={i} className="flex flex-col gap-1 group/item">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-md shrink-0 group-focus-within/item:bg-brand-gradient group-focus-within/item:text-white transition-all">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={p}
                        onChange={(e) => handlePriorityChange(i, e.target.value)}
                        className="flex-1 border-b-2 border-slate-100 py-2 focus:border-brand-indigo outline-none font-medium text-slate-700 transition-all bg-transparent"
                        placeholder="Identify key output..."
                      />
                      <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <Link2 size={12} className="text-brand-indigo" />
                      </div>
                    </div>
                  </div>
                ))}
          </div>
          <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
             <span className="text-[15px] text-slate-800">Strategy Check</span>
             <p className="text-[9px] text-slate-800">Link priorities to weekly goals for maximum impact.</p>
          </div>
        </div>

        <div className="bg-brand-indigo/5 p-8 rounded-[3rem] border-2 border-brand-indigo/10 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-indigo/5 rounded-full -mr-16 -mt-16"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <Pin className="text-brand-indigo" size={24} />
            <h3 className="text-xl text-brand-indigo">Main Goals Of The Day</h3>
          </div>
          <textarea 
            placeholder="What single thing will make today a victory?"
            className="w-full bg-white border border-brand-indigo/20 rounded-2xl p-6 text-lg text-brand-indigo shadow-sm min-h-[200px] outline-none focus:ring-8 focus:ring-brand-indigo/10 transition-all relative z-10"
          />
        </div>

        <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-white/5">
           <div className="absolute inset-0 bg-brand-gradient opacity-0 group-hover:opacity-10 transition-opacity"></div>
           <h4 className="text-[15px] text-brand-indigo mb-4 flex items-center gap-2">
             <ListCheck size={14} />
             Productivity hack
           </h4>
           <p className="text-md text-slate-300 leading-relaxed  relative z-10">"Time-boxing isn't about filling every minute. It's about protecting the minutes that matter most. Block your deep work first."</p>
        </div>
      </div>

      <div className="lg:col-span-7 bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="text-brand-indigo" size={24} />
            <h3 className="text-xl text-slate-800">Time Boxing Schedule</h3>
          </div>
          <div className="text-[15px] text-slate-800">March 25, {state.currentYear}</div>
        </div>
        
        <div className="flex-1 overflow-y-auto max-h-[800px] divide-y divide-slate-100 no-scrollbar">
          {state.schedule.map((slot, i) => (
            <div key={i} className="flex group relative">
                <div className="w-24 px-4 py-6 bg-slate-50 text-[15px] text-slate-800 border-r border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-100 transition-colors">
                {slot.time}
              </div>
              <div className="flex-1 p-2 flex items-center">
                <input 
                  type="text"
                  value={slot.activity}
                  onChange={(e) => handleScheduleChange(i, e.target.value)}
                  className="w-full h-full p-4 text-md font-semibold text-slate-700 bg-transparent border-none outline-none group-hover:bg-brand-indigo/5 transition-colors rounded-xl placeholder:text-slate-400"
                  placeholder="Scheduled block..."
                />
                <div className="absolute right-6 opacity-0 group-hover:opacity-40 pointer-events-none">
                  <Clock size={14} className="text-brand-indigo" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-200">
           <label className="text-[15px] text-slate-800 block mb-4">Daily Notes & Observations</label>
           <textarea 
             className="w-full bg-white border border-slate-200 rounded-2xl p-6 text-md text-slate-600 min-h-[120px] outline-none focus:border-brand-indigo transition-all shadow-inner"
             placeholder="Jot down quick thoughts, calls to make, or things that pop up..."
           />
        </div>
      </div>
    </div>
  );
};

export default DailyView;
