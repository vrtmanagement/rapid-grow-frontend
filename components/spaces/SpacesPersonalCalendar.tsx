/// <reference types="vite/client" />
import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import type { SpacesTask, TaskStatus } from '../../types/spaces';
import { fetchGoogleCalendarEvents, loadGoogleIdentity, requestGoogleCalendarToken, type GoogleCalendarEvent } from '../../services/googleCalendar';
import { calendarDays, eventOccursOn, localDateKey, taskDateKey } from './personalCalendarHelpers';
import { PriorityIcon, StatusIcon, TaskTypeIcon } from './personalTaskViewIcons';

const TASK_PILL: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-700',
  doing: 'bg-sky-50 text-sky-800',
  review: 'bg-violet-50 text-violet-800',
  blocked: 'bg-amber-50 text-amber-800',
  done: 'bg-emerald-50 text-emerald-800',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To do',
  doing: 'In progress',
  review: 'In review',
  blocked: 'Blocked',
  done: 'Done',
};

export default function SpacesPersonalCalendar({ tasks, onOpen }: { tasks: SpacesTask[]; onOpen: (task: SpacesTask) => void }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => localDateKey(new Date()));
  const [token, setToken] = useState<{ value: string; expiresAt: number } | null>(null);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const clientId = String(import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID || '').trim();
  const days = calendarDays(month);
  const startKey = localDateKey(days[0]);
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGoogleIdentity().then(() => { if (!cancelled) setReady(true); }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [clientId, refresh]);
  useEffect(() => {
    if (!token) { setEvents([]); setLoading(false); return; }
    const abort = new AbortController();
    setEvents([]); setError(''); setLoading(true);
    const start = new Date(`${startKey}T00:00:00`);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 42);
    if (token.expiresAt <= Date.now()) {
      setToken(null); setError('Your Google session expired. Please connect again.'); setLoading(false);
      return;
    }
    fetchGoogleCalendarEvents(token.value, start, end, abort.signal)
      .then(data => { if (!abort.signal.aborted) setEvents(data); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [token, startKey, refresh]);
  const connect = () => {
    setConnecting(true); setError('');
    requestGoogleCalendarToken(clientId).then(setToken).catch(e => setError(e.message)).finally(() => setConnecting(false));
  };
  const selectedDate = new Date(`${selected}T00:00:00`);
  const dayTasks = tasks.filter(task => taskDateKey(task.dueDate) === selected);
  const dayEvents = events.filter(event => eventOccursOn(event, selectedDate));
  const unscheduled = tasks.filter(task => !taskDateKey(task.dueDate));
  const move = (amount: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(next); setSelected(localDateKey(next));
  };
  return <section className="personal-calendar rounded-xl border border-slate-200 bg-white overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
      <div className="flex items-center gap-2">
        <button className="personal-view-button" onClick={() => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setSelected(localDateKey(new Date())); }}>Today</button>
        <button className="personal-view-button" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={16} /></button>
        <button className="personal-view-button" aria-label="Next month" onClick={() => move(1)}><ChevronRight size={16} /></button>
        <h3 className="text-sm font-semibold text-slate-900">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="personal-view-button" aria-label="Refresh Google Calendar" disabled={loading || connecting} onClick={() => setRefresh(v => v + 1)}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
        {token ? <button className="personal-view-button" onClick={() => { setToken(null); setEvents([]); setError(''); }}>Disconnect Google Calendar</button>
          : <button className="personal-view-button" disabled={!clientId || !ready || connecting} aria-busy={connecting} onClick={connect}>{connecting ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />} {connecting ? 'Connecting…' : 'Connect Google Calendar'}</button>}
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-slate-400" /> Task due dates</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-sky-500" /> Google Calendar {token ? '(primary)' : '(not connected)'}</span>
      <span>Times: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
    </div>
    {!clientId && <p className="mx-4 mb-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Google Calendar connection will be available once setup is complete. Your task due dates are shown below.</p>}
    {error && <p role="alert" className="mx-4 mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
    <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-x-auto">
        <div className="min-w-[630px] grid grid-cols-7 border-t border-slate-200">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <div key={day} className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">{day}</div>)}
          {days.map(day => {
            const key = localDateKey(day);
            const due = tasks.filter(task => taskDateKey(task.dueDate) === key);
            const appointments = events.filter(event => eventOccursOn(event, day));
            const labels = [
              ...due.map(t => ({ id: t.taskId, title: t.title, task: true as const, status: t.status })),
              ...appointments.map(e => ({ id: e.id, title: e.summary || 'Untitled event', task: false as const, status: null })),
            ];
            const isSelected = selected === key;
            const isToday = key === localDateKey(new Date());
            return <button key={key} type="button" aria-pressed={isSelected} aria-label={`${day.toLocaleDateString()}, ${due.length} tasks, ${appointments.length} events`} onClick={() => setSelected(key)} className={`min-h-[112px] min-w-0 border-r border-b border-slate-100 p-2 text-left transition-colors hover:bg-slate-50 ${isSelected ? 'bg-rose-50/40 ring-1 ring-inset ring-rose-300' : day.getMonth() !== month.getMonth() ? 'bg-slate-50/70 text-slate-400' : 'bg-white'}`}>
              <span className={`mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? 'bg-slate-800 text-white' : 'text-slate-700'}`}>{day.getDate()}</span>
              {labels.slice(0, 2).map((item, i) => (
                <span
                  key={`${item.id}-${i}`}
                  className={`mb-1 flex min-w-0 items-center gap-1 truncate rounded-md px-1.5 py-1 text-[11px] font-medium ${
                    item.task ? TASK_PILL[item.status!] || TASK_PILL.todo : 'bg-sky-50 text-sky-800'
                  }`}
                >
                  {item.task ? <StatusIcon status={item.status!} size={11} /> : <CalendarDays size={11} className="shrink-0 text-sky-600" />}
                  <span className="truncate">{item.title}</span>
                </span>
              ))}
              {labels.length > 2 && <span className="text-[11px] text-slate-500">+{labels.length - 2} more</span>}
            </button>;
          })}
        </div>
      </div>
      <aside className="min-w-0 border-t border-slate-200 bg-slate-50/40 p-4 xl:border-l xl:border-t-0">
        <h4 className="font-semibold text-slate-900">{selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
        <p className="mt-1 mb-4 text-xs text-slate-500">{dayTasks.length} tasks · {dayEvents.length} events</p>
        <h5 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <TaskTypeIcon size={12} className="text-slate-500" /> Tasks
        </h5>
        {dayTasks.map(task => (
          <button
            key={task.taskId}
            type="button"
            onClick={() => onOpen(task)}
            className="mb-2 block w-full rounded-lg border border-slate-200 bg-white p-3 text-left text-sm shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="flex items-start gap-2.5">
              <StatusIcon status={task.status} size={15} />
              <span className="min-w-0">
                <span className="block font-medium leading-snug text-slate-800">{task.title}</span>
                <span className="mt-1.5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 capitalize">
                    <PriorityIcon priority={task.priority} size={11} />
                    {task.priority}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1">
                    <StatusIcon status={task.status} size={11} />
                    {STATUS_LABEL[task.status] || task.status}
                  </span>
                </span>
              </span>
            </span>
          </button>
        ))}
        {!dayTasks.length && <p className="mb-4 text-sm text-slate-400">No tasks due.</p>}
        <h5 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Google Calendar</h5>
        {loading && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading events…</p>}
        {dayEvents.map(event => <div key={event.id} className="mb-2 rounded-lg border border-sky-100 bg-sky-50/60 p-3 text-sm"><p className="font-medium text-slate-800">{event.summary || 'Untitled event'}</p><p className="mt-1 text-xs text-sky-700">{event.start.date ? 'All day' : new Date(event.start.dateTime!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p>{event.htmlLink?.startsWith('https://') && <a className="mt-2 inline-block text-xs text-sky-700 underline" href={event.htmlLink} target="_blank" rel="noreferrer">Open event</a>}</div>)}
        {!loading && !dayEvents.length && <p className="text-sm text-slate-400">{token ? error ? 'Events could not be loaded.' : 'No events this day.' : 'Connect Google Calendar to see your events.'}</p>}
      </aside>
    </div>
    {unscheduled.length > 0 && <details className="border-t border-slate-200 p-4"><summary className="cursor-pointer text-sm font-medium text-slate-600">Unscheduled tasks ({unscheduled.length})</summary><div className="mt-3 flex flex-wrap gap-2">{unscheduled.map(task => <button key={task.taskId} className="personal-view-button max-w-full truncate inline-flex items-center gap-1.5" onClick={() => onOpen(task)}><StatusIcon status={task.status} size={12} /><span className="truncate">{task.title}</span></button>)}</div></details>}
  </section>;
}
