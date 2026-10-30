/// <reference types="vite/client" />
import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Link2,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Users,
  Video,
  X,
} from 'lucide-react';
import type { SpacesTask, TaskStatus } from '../../types/spaces';
import {
  createGoogleCalendarEvent,
  fetchGoogleCalendarEvents,
  loadGoogleIdentity,
  requestGoogleCalendarToken,
  type GoogleCalendarEvent,
} from '../../services/googleCalendar';
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

export default function SpacesPersonalCalendar({
  tasks,
  onOpen,
}: {
  tasks: SpacesTask[];
  onOpen: (task: SpacesTask) => void;
}) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => localDateKey(new Date()));
  const [token, setToken] = useState<{ value: string; expiresAt: number } | null>(null);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushingTaskId, setPushingTaskId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [guestEmails, setGuestEmails] = useState('');
  const [addGoogleMeet, setAddGoogleMeet] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState(() => localDateKey(new Date()));
  const [endDate, setEndDate] = useState(() => localDateKey(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [reminderMinutes, setReminderMinutes] = useState('30');
  const clientId = String(import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID || '').trim();
  const days = calendarDays(month);
  const startKey = localDateKey(days[0]);

  const resetComposer = (dateKey = selected) => {
    setEventTitle('');
    setEventNotes('');
    setEventLocation('');
    setMeetingLink('');
    setGuestEmails('');
    setAddGoogleMeet(false);
    setAllDay(false);
    setStartDate(dateKey);
    setEndDate(dateKey);
    setStartTime('09:00');
    setEndTime('10:00');
    setReminderMinutes('30');
    setFormError('');
  };

  const openComposer = () => {
    if (!token) {
      setFormError('Connect Google Calendar first.');
      return;
    }
    resetComposer(selected);
    setComposerOpen(true);
  };

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, refresh]);

  useEffect(() => {
    if (!token) {
      setEvents([]);
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    setEvents([]);
    setError('');
    setLoading(true);
    const start = new Date(`${startKey}T00:00:00`);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 42);
    if (token.expiresAt <= Date.now()) {
      setToken(null);
      setError('Your Google session expired. Please connect again.');
      setLoading(false);
      return;
    }
    fetchGoogleCalendarEvents(token.value, start, end, abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setEvents(data);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [token, startKey, refresh]);

  const connect = () => {
    setConnecting(true);
    setError('');
    requestGoogleCalendarToken(clientId)
      .then(setToken)
      .catch((e) => setError(e.message))
      .finally(() => setConnecting(false));
  };

  const ensureToken = () => {
    if (!token) {
      setFormError('Connect Google Calendar first.');
      return null;
    }
    if (token.expiresAt <= Date.now()) {
      setToken(null);
      setFormError('Your Google session expired. Disconnect and connect again.');
      return null;
    }
    return token;
  };

  const handleCreateEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    const active = ensureToken();
    if (!active) return;
    setSaving(true);
    setFormError('');
    try {
      const reminderValue = Number(reminderMinutes);
      const created = await createGoogleCalendarEvent(active.value, {
        summary: eventTitle,
        description: eventNotes,
        location: eventLocation,
        meetingLink,
        guestEmails,
        addGoogleMeet,
        allDay,
        dateKey: startDate,
        endDateKey: endDate,
        startTime,
        endTime,
        reminderMinutes: Number.isFinite(reminderValue) ? reminderValue : 30,
      });
      setEvents((prev) => [...prev, created]);
      if (created.start?.date) setSelected(created.start.date);
      else if (created.start?.dateTime) setSelected(localDateKey(new Date(created.start.dateTime)));
      setComposerOpen(false);
      resetComposer(selected);
    } catch (e: any) {
      setFormError(e?.message || 'Unable to create the event.');
    } finally {
      setSaving(false);
    }
  };

  const handlePushTask = async (task: SpacesTask) => {
    const active = ensureToken();
    if (!active) return;
    const dateKey = taskDateKey(task.dueDate) || selected;
    setPushingTaskId(task.taskId);
    setFormError('');
    try {
      const created = await createGoogleCalendarEvent(active.value, {
        summary: task.title || 'Spaces task',
        description: `Added from Rapid Grow Spaces${task.priority ? ` · Priority: ${task.priority}` : ''}`,
        allDay: true,
        dateKey,
      });
      setEvents((prev) => [...prev, created]);
    } catch (e: any) {
      setFormError(e?.message || 'Unable to add this task to Google Calendar.');
    } finally {
      setPushingTaskId(null);
    }
  };

  const selectedDate = new Date(`${selected}T00:00:00`);
  const dayTasks = tasks.filter((task) => taskDateKey(task.dueDate) === selected);
  const dayEvents = events.filter((event) => eventOccursOn(event, selectedDate));
  const unscheduled = tasks.filter((task) => !taskDateKey(task.dueDate));
  const move = (amount: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(next);
    setSelected(localDateKey(next));
  };

  return (
    <section className="personal-calendar rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <button
            className="personal-view-button"
            onClick={() => {
              setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
              setSelected(localDateKey(new Date()));
            }}
          >
            Today
          </button>
          <button className="personal-view-button" aria-label="Previous month" onClick={() => move(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button className="personal-view-button" aria-label="Next month" onClick={() => move(1)}>
            <ChevronRight size={16} />
          </button>
          <h3 className="text-sm font-semibold text-slate-900">
            {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="personal-view-button"
            aria-label="Refresh Google Calendar"
            disabled={loading || connecting}
            onClick={() => setRefresh((v) => v + 1)}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {token ? (
            <button
              className="personal-view-button"
              onClick={() => {
                setToken(null);
                setEvents([]);
                setError('');
                setFormError('');
              }}
            >
              Disconnect Google Calendar
            </button>
          ) : (
            <button
              className="personal-view-button"
              disabled={!clientId || !ready || connecting}
              aria-busy={connecting}
              onClick={connect}
            >
              {connecting ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}{' '}
              {connecting ? 'Connecting…' : 'Connect Google Calendar'}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-slate-400" /> Task due dates
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-sky-500" /> Google Calendar {token ? '(primary · read/write)' : '(not connected)'}
        </span>
        <span>Times: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
      </div>
      {token && (
        <p className="mx-4 mb-3 text-xs text-slate-500">
          If create fails with permission denied, disconnect and connect again to grant calendar write access.
        </p>
      )}
      {!clientId && (
        <div className="mx-4 mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Connect Google Calendar (one-time setup)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-slate-600">
            <li>
              In Google Cloud, enable <span className="font-medium">Google Calendar API</span> and create an OAuth{' '}
              <span className="font-medium">Web application</span> client.
            </li>
            <li>
              Add authorized JavaScript origin <code className="rounded bg-white px-1 text-[12px]">http://localhost:3000</code>.
            </li>
            <li>
              Set <code className="rounded bg-white px-1 text-[12px]">VITE_GOOGLE_CALENDAR_CLIENT_ID</code> in{' '}
              <code className="rounded bg-white px-1 text-[12px]">.env.local</code>, then restart Vite.
            </li>
          </ol>
          <p className="mt-2 text-slate-500">
            Full steps: <code className="rounded bg-white px-1 text-[12px]">docs/google-calendar-setup.md</code>. Task due
            dates still show below.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="mx-4 mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </p>
      )}
      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-x-auto">
          <div className="min-w-[630px] grid grid-cols-7 border-t border-slate-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                {day}
              </div>
            ))}
            {days.map((day) => {
              const key = localDateKey(day);
              const due = tasks.filter((task) => taskDateKey(task.dueDate) === key);
              const appointments = events.filter((event) => eventOccursOn(event, day));
              const labels = [
                ...due.map((t) => ({ id: t.taskId, title: t.title, task: true as const, status: t.status })),
                ...appointments.map((e) => ({
                  id: e.id,
                  title: e.summary || 'Untitled event',
                  task: false as const,
                  status: null,
                })),
              ];
              const isSelected = selected === key;
              const isToday = key === localDateKey(new Date());
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${day.toLocaleDateString()}, ${due.length} tasks, ${appointments.length} events`}
                  onClick={() => setSelected(key)}
                  className={`min-h-[112px] min-w-0 border-r border-b border-slate-100 p-2 text-left transition-colors hover:bg-slate-50 ${
                    isSelected
                      ? 'bg-rose-50/40 ring-1 ring-inset ring-rose-300'
                      : day.getMonth() !== month.getMonth()
                        ? 'bg-slate-50/70 text-slate-400'
                        : 'bg-white'
                  }`}
                >
                  <span
                    className={`mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday ? 'bg-slate-800 text-white' : 'text-slate-700'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {labels.slice(0, 2).map((item, i) => (
                    <span
                      key={`${item.id}-${i}`}
                      className={`mb-1 flex min-w-0 items-center gap-1 truncate rounded-md px-1.5 py-1 text-[11px] font-medium ${
                        item.task ? TASK_PILL[item.status!] || TASK_PILL.todo : 'bg-sky-50 text-sky-800'
                      }`}
                    >
                      {item.task ? (
                        <StatusIcon status={item.status!} size={11} />
                      ) : (
                        <CalendarDays size={11} className="shrink-0 text-sky-600" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </span>
                  ))}
                  {labels.length > 2 && <span className="text-[11px] text-slate-500">+{labels.length - 2} more</span>}
                </button>
              );
            })}
          </div>
        </div>
        <aside className="min-w-0 border-t border-slate-200 bg-slate-50/40 p-4 xl:border-l xl:border-t-0">
          <h4 className="font-semibold text-slate-900">
            {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </h4>
          <p className="mt-1 mb-4 text-xs text-slate-500">
            {dayTasks.length} tasks · {dayEvents.length} events
          </p>

          <h5 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <TaskTypeIcon size={12} className="text-slate-500" /> Tasks
          </h5>
          {dayTasks.map((task) => (
            <div
              key={task.taskId}
              className="mb-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
            >
              <button type="button" onClick={() => onOpen(task)} className="block w-full text-left transition hover:opacity-90">
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
              {token ? (
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-60"
                  disabled={!!pushingTaskId || saving}
                  onClick={() => void handlePushTask(task)}
                >
                  {pushingTaskId === task.taskId ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CalendarDays size={12} />
                  )}
                  Add to Google
                </button>
              ) : null}
            </div>
          ))}
          {!dayTasks.length && <p className="mb-4 text-sm text-slate-400">No tasks due.</p>}

          <h5 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Google Calendar</h5>
          {loading && (
            <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Loading events…
            </p>
          )}
          {dayEvents.map((event) => {
            const meetUri =
              event.hangoutLink ||
              event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri ||
              '';
            return (
              <div key={event.id} className="mb-2 rounded-lg border border-sky-100 bg-sky-50/60 p-3 text-sm">
                <p className="font-medium text-slate-800">{event.summary || 'Untitled event'}</p>
                <p className="mt-1 text-xs text-sky-700">
                  {event.start.date
                    ? 'All day'
                    : new Date(event.start.dateTime!).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                </p>
                {event.location ? (
                  <p className="mt-1 flex items-start gap-1 text-xs text-slate-600">
                    <MapPin size={11} className="mt-0.5 shrink-0" />
                    <span className="break-all">{event.location}</span>
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {event.htmlLink?.startsWith('https://') && (
                    <a className="text-xs text-sky-700 underline" href={event.htmlLink} target="_blank" rel="noreferrer">
                      Open in Google
                    </a>
                  )}
                  {meetUri.startsWith('https://') && (
                    <a className="text-xs text-sky-700 underline" href={meetUri} target="_blank" rel="noreferrer">
                      Join meeting
                    </a>
                  )}
                </div>
              </div>
            );
          })}
          {!loading && !dayEvents.length && (
            <p className="text-sm text-slate-400">
              {token
                ? error
                  ? 'Events could not be loaded.'
                  : 'No events this day.'
                : 'Connect Google Calendar to see your events.'}
            </p>
          )}

          {token ? (
            <button
              type="button"
              onClick={openComposer}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
            >
              <Plus size={15} />
              Create Google event
            </button>
          ) : (
            <p className="mt-4 text-xs text-slate-500">Connect Google Calendar to add events for this day.</p>
          )}
          {formError && !composerOpen ? (
            <p role="alert" className="mt-2 text-xs text-amber-800">
              {formError}
            </p>
          ) : null}
        </aside>
      </div>
      {unscheduled.length > 0 && (
        <details className="border-t border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">
            Unscheduled tasks ({unscheduled.length})
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {unscheduled.map((task) => (
              <button
                key={task.taskId}
                className="personal-view-button max-w-full truncate inline-flex items-center gap-1.5"
                onClick={() => onOpen(task)}
              >
                <StatusIcon status={task.status} size={12} />
                <span className="truncate">{task.title}</span>
              </button>
            ))}
          </div>
        </details>
      )}

      {composerOpen ? (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={handleCreateEvent}
            className="max-h-[min(92vh,760px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Create event</h3>
              <button
                type="button"
                aria-label="Close"
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => {
                  setComposerOpen(false);
                  setFormError('');
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <label className="block text-xs font-medium text-slate-600">
                Title
                <input
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                  autoFocus
                  maxLength={200}
                  placeholder="Add title"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
                All day
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-600">
                  Start date
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setStartDate(next);
                      if (endDate < next) setEndDate(next);
                    }}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  End date
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300"
                  />
                </label>
              </div>

              {!allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-medium text-slate-600">
                    Start time
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required={!allDay}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-600">
                    End time
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required={!allDay}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300"
                    />
                  </label>
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>

              <label className="block text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={12} /> Location
                </span>
                <input
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  maxLength={300}
                  placeholder="Add location"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300"
                />
              </label>

              <label className="block text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Link2 size={12} /> Meeting / video link
                </span>
                <input
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  maxLength={500}
                  placeholder="https://meet.google.com/… or Zoom link"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={addGoogleMeet}
                  onChange={(e) => setAddGoogleMeet(e.target.checked)}
                />
                <span className="inline-flex items-center gap-1.5">
                  <Video size={14} /> Add Google Meet video conferencing
                </span>
              </label>

              <label className="block text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Users size={12} /> Guests
                </span>
                <textarea
                  value={guestEmails}
                  onChange={(e) => setGuestEmails(e.target.value)}
                  rows={2}
                  placeholder="guest1@email.com, guest2@email.com"
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300"
                />
              </label>

              <label className="block text-xs font-medium text-slate-600">
                Description
                <textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder="Add description"
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300"
                />
              </label>

              <label className="block text-xs font-medium text-slate-600">
                Notification
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300"
                >
                  <option value="0">At time of event</option>
                  <option value="5">5 minutes before</option>
                  <option value="10">10 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                  <option value="1440">1 day before</option>
                </select>
              </label>

              {formError ? (
                <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {formError}
                </p>
              ) : null}
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                onClick={() => {
                  setComposerOpen(false);
                  setFormError('');
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !eventTitle.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
