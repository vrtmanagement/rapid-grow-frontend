import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Clock3,
  Eye,
  Loader2,
  Mic,
  MicOff,
  Pencil,
  Save,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { ThemedDatePicker, ThemedSelect } from '../components/spaces/SpacesFormControls';
import { getUserTimeZone } from '../utils/timezone';
import {
  HOURLY_CONTENT_MAX_CLASS,
  WORKDAY_HOURS,
  autoGrowTextarea,
  formatHourLabel,
  formatHourRange,
  getCurrentHourInTz,
  getHourlyDeletedByLabel,
  getHourlyUpdatedByLabel,
  extractVoiceSaveCommand,
  getSpeechRecognitionConstructor,
  insertSpokenAtCaret,
  type HourlyTrackingEntry,
} from './hourlyTrackingHelpers';
import { appToast } from '../components/ui/Toast';

export type HourlyTrackingPanelProps = {
  todayKey: string;
  currentEmpId: string;
  currentUserName: string;
  isAdmin: boolean;
  isLeader?: boolean;
  employeeOptions?: Array<{ empId: string; empName: string; role: string }>;
};

type DraftMap = Record<number, string>;
type SavingMap = Record<number, boolean>;

const ALL_PEOPLE_VALUE = '__all__';
const ALL_DATES_VALUE = '__all_dates__';

function formatDayHeading(dateKey: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(new Date(`${dateKey}T12:00:00`));
}

export const HourlyTrackingPanel: React.FC<HourlyTrackingPanelProps> = ({
  todayKey,
  currentEmpId,
  currentUserName,
  isAdmin,
  isLeader = false,
  employeeOptions = [],
}) => {
  const timeZone = getUserTimeZone();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [pinnedDate, setPinnedDate] = useState(todayKey);
  const [selectedEmpId, setSelectedEmpId] = useState(currentEmpId);
  const [entries, setEntries] = useState<HourlyTrackingEntry[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [editingHour, setEditingHour] = useState<number | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [multiDayDrafts, setMultiDayDrafts] = useState<Record<string, string>>({});
  const [savingByHour, setSavingByHour] = useState<SavingMap>({});
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listeningHour, setListeningHour] = useState<number | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<HourlyTrackingEntry | null>(null);
  const [showAllToOthers, setShowAllToOthers] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  /**
   * Live voice insert anchor. When the user moves the cursor / presses Enter while
   * listening, we re-anchor here so new words go to the new caret — not the old line.
   */
  const voiceInsertRef = useRef<{
    hour: number;
    before: string;
    after: string;
    /** Skip speech results already baked into the textarea (after a re-anchor). */
    startResultIndex: number;
    lastResultsLength: number;
    /** Ignore selection events caused by our own setSelectionRange after insert. */
    ignoreSelect: boolean;
  }>({
    hour: -1,
    before: '',
    after: '',
    startResultIndex: 0,
    lastResultsLength: 0,
    ignoreSelect: false,
  });
  /** Bumps on each new listen so a late onend from an old session cannot wipe the new caret. */
  const voiceSessionRef = useRef(0);

  const canSeeOthers = isAdmin || isLeader || showAllToOthers;
  const viewingAllDates = selectedDate === ALL_DATES_VALUE;
  const viewingAll = selectedEmpId === ALL_PEOPLE_VALUE;
  const viewingSelf = !viewingAll && selectedEmpId === currentEmpId;
  const isToday = !viewingAllDates && selectedDate === todayKey;
  const canMutateDay = viewingSelf && !viewingAllDates && (isAdmin || isToday);
  const canAdminMutateAny = isAdmin;
  const canMutate = canAdminMutateAny || canMutateDay;
  const currentHour = getCurrentHourInTz(timeZone);
  /** Single-day fillable grid only for yourself on one day. */
  const showFillableDayGrid = viewingSelf && !viewingAllDates && !viewingAll;

  const peopleFromEntries = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      if (!entry.empId) continue;
      map.set(entry.empId, entry.empName || entry.empId);
    }
    return map;
  }, [entries]);

  const personOptions = useMemo(() => {
    const byId = new Map<string, string>();
    byId.set(currentEmpId, `${currentUserName || 'Me'} (you)`);

    employeeOptions.forEach((emp) => {
      if (emp.empId === currentEmpId) return;
      if (showAllToOthers || isAdmin || (isLeader && (emp.role === 'EMPLOYEE' || emp.role === 'TEAM_LEAD'))) {
        byId.set(emp.empId, emp.empName);
      }
    });

    peopleFromEntries.forEach((name, empId) => {
      if (!byId.has(empId)) {
        byId.set(empId, empId === currentEmpId ? `${name} (you)` : name);
      }
    });

    const people = Array.from(byId.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (!canSeeOthers) return people.filter((option) => option.value === currentEmpId);

    return [{ value: ALL_PEOPLE_VALUE, label: 'All' }, ...people];
  }, [employeeOptions, currentEmpId, currentUserName, showAllToOthers, isAdmin, isLeader, peopleFromEntries, canSeeOthers]);

  const peopleGroups = useMemo(() => {
    const groups = new Map<string, { empId: string; empName: string; entries: HourlyTrackingEntry[] }>();
    for (const entry of entries) {
      if (!viewingAllDates && entry.date !== selectedDate) continue;
      const existing = groups.get(entry.empId);
      if (existing) {
        existing.entries.push(entry);
      } else {
        groups.set(entry.empId, {
          empId: entry.empId,
          empName: entry.empName || entry.empId,
          entries: [entry],
        });
      }
    }
    return Array.from(groups.values()).sort((a, b) => a.empName.localeCompare(b.empName));
  }, [entries, selectedDate, viewingAllDates]);

  const personDayGroups = useMemo(() => {
    if (viewingAll) return [];
    const byDate = new Map<string, HourlyTrackingEntry[]>();
    for (const entry of entries) {
      if (entry.empId !== selectedEmpId) continue;
      if (!viewingAllDates && entry.date !== selectedDate) continue;
      const list = byDate.get(entry.date) || [];
      list.push(entry);
      byDate.set(entry.date, list);
    }
    return Array.from(byDate.entries())
      .map(([date, dayEntries]) => ({
        date,
        entries: [...dayEntries].sort((a, b) => a.hour - b.hour),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, selectedEmpId, selectedDate, viewingAll, viewingAllDates]);

  const entryByHour = useMemo(() => {
    const map = new Map<number, HourlyTrackingEntry>();
    if (viewingAll || viewingAllDates) return map;
    for (const entry of entries) {
      if (entry.empId === selectedEmpId && entry.date === selectedDate) {
        map.set(entry.hour, entry);
      }
    }
    return map;
  }, [entries, selectedEmpId, selectedDate, viewingAll, viewingAllDates]);

  const filledCount = viewingAll
    ? peopleGroups.reduce((sum, group) => sum + group.entries.length, 0)
    : viewingAllDates
      ? personDayGroups.reduce((sum, group) => sum + group.entries.length, 0)
      : WORKDAY_HOURS.filter((hour) => entryByHour.has(hour)).length;
  const progressDenom = viewingAll
    ? Math.max(peopleGroups.length, 1) * WORKDAY_HOURS.length
    : WORKDAY_HOURS.length;
  const progressPct = viewingAllDates && !viewingAll
    ? 100
    : Math.min(100, Math.round((filledCount / Math.max(progressDenom, 1)) * 100));
  const showOnlySubmitted = (!viewingSelf && !viewingAll) || viewingAllDates;
  const hoursToRender = showOnlySubmitted
    ? WORKDAY_HOURS.filter((hour) => entryByHour.has(hour))
    : [...WORKDAY_HOURS];
  const selectedPersonName = viewingAll
    ? 'All people'
    : personOptions.find((option) => option.value === selectedEmpId)?.label ||
      employeeOptions.find((emp) => emp.empId === selectedEmpId)?.empName ||
      selectedEmpId;

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setListeningHour(null);
  }, []);

  useEffect(() => {
    setVoiceSupported(!!getSpeechRecognitionConstructor());
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (!personOptions.some((option) => option.value === selectedEmpId)) {
      setSelectedEmpId(canSeeOthers ? ALL_PEOPLE_VALUE : currentEmpId);
    }
  }, [personOptions, selectedEmpId, canSeeOthers, currentEmpId]);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const listScope = isAdmin || showAllToOthers ? 'all' : isLeader ? 'team' : 'me';
      const params = new URLSearchParams({
        scope: listScope,
      });
      if (!viewingAllDates) {
        params.set('date', selectedDate);
      }
      if (!canSeeOthers) {
        params.set('empId', currentEmpId);
      }
      const res = await fetch(`${API_BASE}/hourly-tracking?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load hourly tracking');
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data?.entries) ? data.entries : [];
      if (typeof data?.showAllToOthers === 'boolean') {
        setShowAllToOthers(data.showAllToOthers);
      }
      setEntries(list);
      setDrafts({});
      setMultiDayDrafts({});
      setEditingHour(null);
      setEditingEntryId(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load hourly tracking';
      appToast.error(message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, viewingAllDates, currentEmpId, isAdmin, isLeader, showAllToOthers, canSeeOthers]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const setShowAllToOthersValue = async (next: boolean) => {
    if (!isAdmin || savingSetting || next === showAllToOthers) return;
    setSavingSetting(true);
    try {
      const res = await fetch(`${API_BASE}/hourly-tracking/settings`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ showAllToOthers: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update setting');
      }
      const data = await res.json();
      setShowAllToOthers(!!data.showAllToOthers);
      appToast.success(
        data.showAllToOthers
          ? 'Show all data enabled — everyone can view all hourly logs, including admins.'
          : 'Show all data disabled — people only see their normal team scope.',
      );
      if (data.showAllToOthers) {
        setSelectedEmpId(ALL_PEOPLE_VALUE);
      }
      await loadEntries();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to update setting';
      appToast.error(message);
    } finally {
      setSavingSetting(false);
    }
  };

  const getDraftValue = (hour: number) => {
    if (drafts[hour] !== undefined) return drafts[hour];
    return entryByHour.get(hour)?.content || '';
  };

  const setDraftValue = (hour: number, value: string) => {
    setDrafts((prev) => ({ ...prev, [hour]: value }));
  };

  const handleSubmitHour = async (hour: number, contentOverride?: string) => {
    const existing = entryByHour.get(hour);
    const canCreate = viewingSelf && canMutate;
    const canUpdate = existing ? canEditEntry(existing) : false;
    if (existing ? !canUpdate : !canCreate) return;

    const content = (contentOverride ?? getDraftValue(hour)).trim();
    if (!content) {
      appToast.error('Write what you completed in this hour before submitting.');
      return;
    }

    setSavingByHour((prev) => ({ ...prev, [hour]: true }));
    stopListening();

    try {
      if (existing && editingHour === hour) {
        const res = await fetch(`${API_BASE}/hourly-tracking/${existing._id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ content }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to update entry');
        }
        const data = await res.json();
        const updated = data.entry as HourlyTrackingEntry;
        setEntries((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        appToast.success(`Updated ${formatHourLabel(hour)}`);
      } else if (existing) {
        appToast.error('This hour is already saved. Tap edit to change it.');
        return;
      } else {
        const res = await fetch(`${API_BASE}/hourly-tracking`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            hour,
            content,
            ...(isAdmin ? { date: selectedDate } : {}),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to save entry');
        }
        const data = await res.json();
        const created = data.entry as HourlyTrackingEntry;
        setEntries((prev) => {
          const without = prev.filter(
            (item) => !(item.empId === created.empId && item.date === created.date && item.hour === created.hour),
          );
          return [...without, created];
        });
        appToast.success(`Saved ${formatHourLabel(hour)}`);
      }

      setDrafts((prev) => {
        const next = { ...prev };
        delete next[hour];
        return next;
      });
      setEditingHour(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save hourly entry';
      appToast.error(message);
    } finally {
      setSavingByHour((prev) => ({ ...prev, [hour]: false }));
    }
  };

  const handleDelete = async (entry: HourlyTrackingEntry) => {
    const allowed =
      isAdmin || (entry.empId === currentEmpId && entry.date === todayKey);
    if (!allowed) return;
    try {
      const res = await fetch(`${API_BASE}/hourly-tracking/${entry._id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete entry');
      }
      const data = await res.json().catch(() => ({}));
      if (data?.action === 'soft_deleted' && data?.entry) {
        const softDeleted = data.entry as HourlyTrackingEntry;
        setEntries((prev) => prev.map((item) => (item._id === softDeleted._id ? softDeleted : item)));
        appToast.success(`Deleted ${formatHourLabel(entry.hour)}`);
      } else {
        setEntries((prev) => prev.filter((item) => item._id !== entry._id));
        appToast.success(`Removed ${formatHourLabel(entry.hour)}`);
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[entry.hour];
        return next;
      });
      if (editingHour === entry.hour) setEditingHour(null);
      if (editingEntryId === entry._id) setEditingEntryId(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to delete hourly entry';
      appToast.error(message);
    }
  };

  const captureVoiceCaret = (hour: number, options?: { reanchorSpeech?: boolean }) => {
    const el = textareaRefs.current[hour];
    // Prefer live textarea value + selection — that is the real cursor.
    const text = el ? el.value : getDraftValue(hour);
    const start =
      el && typeof el.selectionStart === 'number' ? el.selectionStart : text.length;
    const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : start;
    const before = text.slice(0, Math.max(0, start));
    const after = text.slice(Math.max(start, end));
    const prev = voiceInsertRef.current;
    voiceInsertRef.current = {
      hour,
      before,
      after,
      // After Enter / click to a new spot, skip speech already in the box so new
      // words land at this caret only (e.g. the next line).
      startResultIndex: options?.reanchorSpeech ? prev.lastResultsLength : prev.startResultIndex,
      lastResultsLength: prev.lastResultsLength,
      ignoreSelect: prev.ignoreSelect,
    };
  };

  const startListening = (hour: number) => {
    if (!canMutate || !viewingSelf) return;
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      appToast.error('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (listeningHour === hour) {
      stopListening();
      return;
    }

    // Stop any prior session without letting its late onend wipe this caret.
    const previousRecognition = recognitionRef.current;
    recognitionRef.current = null;
    try {
      previousRecognition?.stop();
    } catch {
      // ignore
    }
    setListeningHour(null);

    // Always refresh from the real cursor (mousedown already tried; do it again).
    captureVoiceCaret(hour);
    let insertBefore =
      voiceInsertRef.current.hour === hour ? voiceInsertRef.current.before : getDraftValue(hour);
    let insertAfter = voiceInsertRef.current.hour === hour ? voiceInsertRef.current.after : '';

    if (entryByHour.has(hour) && editingHour !== hour) {
      const content = entryByHour.get(hour)?.content || '';
      setEditingHour(hour);
      setDraftValue(hour, content);
      // Opening edit from a saved card: no textarea caret yet — insert at end.
      insertBefore = content;
      insertAfter = '';
    }

    voiceInsertRef.current = {
      hour,
      before: insertBefore,
      after: insertAfter,
      startResultIndex: 0,
      lastResultsLength: 0,
      ignoreSelect: false,
    };
    const sessionId = ++voiceSessionRef.current;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    // en-US usually returns clearer punctuation (. ? ! ,) from Chrome/Edge.
    recognition.lang = 'en-US';

    recognition.onresult = (event: {
      results: ArrayLike<{ 0?: { transcript?: string }; isFinal?: boolean }>;
    }) => {
      if (voiceSessionRef.current !== sessionId) return;

      const anchor = voiceInsertRef.current;
      anchor.lastResultsLength = event.results.length;

      let transcript = '';
      for (let i = anchor.startResultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript || '';
        // Keep a space between successive speech chunks when the engine omits one.
        if (transcript && piece && !/\s$/.test(transcript) && !/^\s/.test(piece)) {
          transcript += ' ';
        }
        transcript += piece;
      }

      const lastResult = event.results[event.results.length - 1];
      const lastIsFinal = Boolean(lastResult?.isFinal);
      const { spokenWithoutCommand, shouldSave } = extractVoiceSaveCommand(transcript);
      // Never type the "submit/update" command into the box — strip it as soon as we hear it.
      const spokenForBox = shouldSave ? spokenWithoutCommand : transcript;

      const { text: next, cursor } = insertSpokenAtCaret(anchor.before, spokenForBox, anchor.after);
      setDraftValue(hour, next);

      if (shouldSave && lastIsFinal) {
        // End this voice session, then submit/update with the cleaned content.
        voiceSessionRef.current += 1;
        try {
          recognition.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
        setListeningHour(null);
        void handleSubmitHour(hour, next);
        return;
      }

      // Keep the visible caret right after the words just spoken (don't treat as user re-anchor).
      anchor.ignoreSelect = true;
      requestAnimationFrame(() => {
        if (voiceSessionRef.current !== sessionId) return;
        const el = textareaRefs.current[hour];
        if (!el) {
          anchor.ignoreSelect = false;
          return;
        }
        el.focus();
        el.setSelectionRange(cursor, cursor);
        autoGrowTextarea(el);
        requestAnimationFrame(() => {
          anchor.ignoreSelect = false;
        });
      });
    };

    recognition.onerror = (event: { error?: string }) => {
      if (voiceSessionRef.current !== sessionId) return;
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      appToast.error('Voice input stopped. You can type instead.');
      setListeningHour(null);
    };

    recognition.onend = () => {
      if (voiceSessionRef.current !== sessionId) return;
      setListeningHour((prev) => (prev === hour ? null : prev));
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      // Leave caret after the inserted speech so the next Voice tap continues from there
      // unless the user clicks a new cursor position first.
      captureVoiceCaret(hour);
    };

    recognitionRef.current = recognition;
    setListeningHour(hour);
    try {
      recognition.start();
    } catch {
      appToast.error('Could not start microphone. Check browser permissions.');
      setListeningHour(null);
    }
  };

  const dateLabel = viewingAllDates
    ? 'All days'
    : new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone,
      }).format(new Date(`${selectedDate}T12:00:00`));

  const canEditEntry = (entry?: HourlyTrackingEntry) => {
    if (!entry) return canMutate && viewingSelf;
    if (entry.isDeleted) {
      // Owner (same day) or admin can restore a soft-deleted entry.
      if (isAdmin) return true;
      return entry.empId === currentEmpId && entry.date === todayKey;
    }
    if (isAdmin) return true;
    return entry.empId === currentEmpId && entry.date === todayKey;
  };

  const handleUpdateExistingEntry = async (entry: HourlyTrackingEntry) => {
    if (!canEditEntry(entry)) return;
    const content = String(multiDayDrafts[entry._id] ?? entry.content).trim();
    if (!content) {
      appToast.error('Content cannot be empty.');
      return;
    }
    setSavingEntryId(entry._id);
    try {
      const res = await fetch(`${API_BASE}/hourly-tracking/${entry._id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update entry');
      }
      const data = await res.json();
      const updated = data.entry as HourlyTrackingEntry;
      setEntries((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      setEditingEntryId(null);
      setMultiDayDrafts((prev) => {
        const next = { ...prev };
        delete next[entry._id];
        return next;
      });
      appToast.success(`Updated ${formatHourLabel(entry.hour)}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to update hourly entry';
      appToast.error(message);
    } finally {
      setSavingEntryId(null);
    }
  };

  const renderSubmittedEntryRow = (entry: HourlyTrackingEntry) => {
    const isEditing = editingEntryId === entry._id;
    const isSaving = savingEntryId === entry._id;
    const value = multiDayDrafts[entry._id] ?? entry.content;
    const updatedBy = getHourlyUpdatedByLabel(entry);
    const deletedBy = getHourlyDeletedByLabel(entry);
    const entryEditable = canEditEntry(entry);
    const isDeleted = !!entry.isDeleted;

    if (isDeleted) {
      return (
        <div
          key={entry._id}
          className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
        >
          <div className="shrink-0">
            <span className="inline-flex rounded-lg bg-slate-400 px-2.5 py-1 text-xs font-semibold text-white">
              {formatHourLabel(entry.hour)}
            </span>
            <p className="mt-1 text-[11px] font-medium text-slate-400">{formatHourRange(entry.hour)}</p>
          </div>
          <span className="inline-flex rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
            {deletedBy}
          </span>
        </div>
      );
    }

    return (
      <div key={entry._id} className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
        <div className="shrink-0 space-y-1.5 sm:w-[150px]">
          <span className="inline-flex rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
            {formatHourLabel(entry.hour)}
          </span>
          <p className="text-[11px] font-medium text-slate-400">{formatHourRange(entry.hour)}</p>
        </div>
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={value}
                ref={(el) => autoGrowTextarea(el)}
                onChange={(e) => {
                  setMultiDayDrafts((prev) => ({ ...prev, [entry._id]: e.target.value }));
                  autoGrowTextarea(e.currentTarget);
                }}
                rows={2}
                className={`w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/15 ${HOURLY_CONTENT_MAX_CLASS}`}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleUpdateExistingEntry(entry)}
                  disabled={isSaving || !value.trim()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-red px-3 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingEntryId(null);
                    setMultiDayDrafts((prev) => {
                      const next = { ...prev };
                      delete next[entry._id];
                      return next;
                    });
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{entry.content}</p>
              {updatedBy && (
                <span className="mt-2 inline-flex max-w-full rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {updatedBy}
                </span>
              )}
            </>
          )}
        </div>
        {!isEditing && entryEditable && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingEntryId(entry._id);
                setMultiDayDrafts((prev) => ({ ...prev, [entry._id]: entry.content }));
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(entry)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl scroll-mt-24 pt-2 [&_button:not(:disabled)]:cursor-pointer [&_button:disabled]:cursor-not-allowed">
      <div className="rounded-[1.75rem] border border-slate-200/90 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden rounded-t-[1.75rem] border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 px-6 py-7 text-white sm:px-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 12% 20%, rgba(239,68,68,0.35), transparent 42%), radial-gradient(circle at 88% 10%, rgba(248,250,252,0.12), transparent 35%)',
            }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-300">Hourly tracking</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">What did you ship this hour?</h2>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Log productive work from 8:00 AM to 12:00 AM. Keep it short — one clear outcome per slot.
              </p>
              <p className="mt-3 text-xs font-medium text-slate-400">
                {dateLabel}
                {canSeeOthers ? ` · ${selectedPersonName}` : ''}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                <Clock3 size={14} className="text-red-300" />
                Total
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums tracking-tight">{filledCount}</span>
                <span className="text-sm font-medium text-slate-400">
                  {viewingAll
                    ? `entries · ${peopleGroups.length} people`
                    : viewingAllDates
                      ? 'entries across all days'
                      : `/ ${WORKDAY_HOURS.length} hours`}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-400 to-rose-300 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {!canMutate && viewingSelf && (
            <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100">
              <Sparkles size={13} />
              Past day is view-only. Only admins can edit or delete completed days.
            </div>
          )}
          {!viewingSelf && !viewingAll && (
            <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-100">
              <Eye size={13} />
              Viewing submitted hours only
              {isAdmin ? ' — you can edit or delete as admin.' : '.'}
            </div>
          )}
          {viewingAll && (
            <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-100">
              <Users size={13} />
              {viewingAllDates
                ? 'Showing all people across all days — open a person to view their logs'
                : 'Showing all people for this day — open a person to view their logs'}
            </div>
          )}
          {viewingAllDates && !viewingAll && (
            <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-xs font-medium text-violet-100">
              <Clock3 size={13} />
              Showing all days for {selectedPersonName}
            </div>
          )}
        </div>

        <div className="space-y-4 p-5 sm:p-7">
          <div className="relative z-30 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            {!viewingAll && canSeeOthers && (
              <button
                type="button"
                onClick={() => {
                  setEditingHour(null);
                  setEditingEntryId(null);
                  setSelectedEmpId(ALL_PEOPLE_VALUE);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}

            <div className="flex min-w-[220px] flex-1 flex-col gap-1.5 sm:max-w-[280px]">
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Day</label>
              <span className="flex h-9 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div
                  className={`shrink-0 cursor-pointer transition ${
                    !viewingAllDates
                      ? 'bg-brand-red [&_button]:h-9 [&_button]:min-w-[118px] [&_button]:rounded-none [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-2.5 [&_button]:text-[11px] [&_button]:font-bold [&_button]:shadow-none [&_button]:ring-0 [&_button]:!text-white [&_button_span]:!text-white [&_svg]:!text-white'
                      : 'bg-transparent [&_button]:h-9 [&_button]:min-w-[118px] [&_button]:rounded-none [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-2.5 [&_button]:text-[11px] [&_button]:font-bold [&_button]:text-slate-400 [&_button]:shadow-none [&_button]:ring-0 [&_svg]:text-slate-400'
                  }`}
                  onMouseDown={() => {
                    if (viewingAllDates) setSelectedDate(pinnedDate || todayKey);
                  }}
                >
                  <ThemedDatePicker
                    pill
                    forceOpenDown
                    value={viewingAllDates ? pinnedDate : selectedDate}
                    onChange={(value) => {
                      const next = value || todayKey;
                      setPinnedDate(next);
                      setSelectedDate(next);
                    }}
                  />
                </div>
                {canSeeOthers && (
                  <>
                    <span className="w-px shrink-0 self-stretch bg-slate-200" aria-hidden />
                    <button
                      type="button"
                      onClick={() => {
                        if (!viewingAllDates) setPinnedDate(selectedDate);
                        setSelectedDate(ALL_DATES_VALUE);
                      }}
                      className={`inline-flex h-full min-w-0 flex-1 items-center justify-center px-3 text-[11px] font-bold uppercase tracking-wide transition ${
                        viewingAllDates
                          ? 'bg-brand-red text-white'
                          : 'bg-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                      }`}
                      title="Show data for all days"
                    >
                      All Days
                    </button>
                  </>
                )}
              </span>
            </div>

            {canSeeOthers && (
              <div className="min-w-[220px] flex-1 sm:max-w-[280px]">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Person
                </label>
                <ThemedSelect
                  compact
                  fullWidthCompact
                  denseMenu
                  forceOpenDown
                  value={selectedEmpId}
                  options={personOptions}
                  onChange={setSelectedEmpId}
                  placeholder="Choose person"
                />
              </div>
            )}

            {isAdmin && (
              <div
                className={`inline-flex h-10 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm ${
                  savingSetting ? 'opacity-60' : ''
                }`}
                title="When enabled, all people (including admins) can view everyone’s hourly tracking"
              >
                {savingSetting ? <Loader2 size={15} className="animate-spin text-slate-500" /> : <Users size={15} className="text-slate-500" />}
                <span>Show all data to others</span>
                <span className="inline-flex h-7 overflow-hidden rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => void setShowAllToOthersValue(true)}
                    disabled={savingSetting || showAllToOthers}
                    className={`inline-flex cursor-pointer items-center px-2 text-[11px] font-bold uppercase tracking-wide transition disabled:cursor-default ${
                      showAllToOthers ? 'bg-emerald-600 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-50'
                    }`}
                    aria-pressed={showAllToOthers}
                    aria-label="Turn show all data on"
                  >
                    On
                  </button>
                  <span className="w-px self-stretch bg-slate-200" aria-hidden />
                  <button
                    type="button"
                    onClick={() => void setShowAllToOthersValue(false)}
                    disabled={savingSetting || !showAllToOthers}
                    className={`inline-flex cursor-pointer items-center px-2 text-[11px] font-bold uppercase tracking-wide transition disabled:cursor-default ${
                      !showAllToOthers ? 'bg-brand-red text-white' : 'bg-transparent text-slate-400 hover:bg-slate-50'
                    }`}
                    aria-pressed={!showAllToOthers}
                    aria-label="Turn show all data off"
                  >
                    Off
                  </button>
                </span>
              </div>
            )}
          </div>

          {showAllToOthers && !isAdmin && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Company sharing is on — you can browse everyone’s hourly tracking, including admins.
            </div>
          )}


          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Loading hourly boxes…
            </div>
          ) : viewingAll ? (
            <div className="space-y-3">
              {peopleGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  {viewingAllDates ? 'No hourly entries yet.' : 'No hourly entries for this day yet.'}
                </div>
              ) : (
                peopleGroups.map((group) => {
                  const dayCount = new Set(group.entries.map((entry) => entry.date)).size;
                  return (
                    <button
                      key={group.empId}
                      type="button"
                      onClick={() => setSelectedEmpId(group.empId)}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:border-brand-red/30 hover:bg-red-50/30"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {group.empName}
                          {group.empId === currentEmpId ? ' (you)' : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {group.entries.length} entr{group.entries.length === 1 ? 'y' : 'ies'}
                          {viewingAllDates ? ` · ${dayCount} day${dayCount === 1 ? '' : 's'}` : ` · ${group.entries.length} / ${WORKDAY_HOURS.length} hours`}
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        Open
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : viewingAllDates || !showFillableDayGrid ? (
            <div className="space-y-4">
              {personDayGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  {viewingAllDates
                    ? 'No submitted hours for this person yet.'
                    : 'No submitted hours for this person on this day.'}
                </div>
              ) : (
                personDayGroups.map((dayGroup) => (
                  <div key={dayGroup.date} className="overflow-hidden rounded-2xl border border-emerald-200/70 bg-emerald-50/20">
                    <div className="border-b border-emerald-100 bg-emerald-50/60 px-4 py-2.5">
                      <p className="text-sm font-semibold text-slate-900">{formatDayHeading(dayGroup.date, timeZone)}</p>
                      <p className="text-xs text-slate-500">
                        {dayGroup.entries.length} submitted hour{dayGroup.entries.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="bg-white/70">{dayGroup.entries.map((entry) => renderSubmittedEntryRow(entry))}</div>
                  </div>
                ))
              )}
            </div>
          ) : hoursToRender.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No submitted hours for this person on this day.
            </div>
          ) : (
            <div className="space-y-3">
              {hoursToRender.map((hour) => {
                const saved = entryByHour.get(hour);
                const isEditing = editingHour === hour;
                const isCurrent = isToday && hour === currentHour && viewingSelf;
                const isListening = listeningHour === hour;
                const isSaving = !!savingByHour[hour];
                const value = getDraftValue(hour);
                const isDeleted = !!saved?.isDeleted;
                const showEditor = isEditing || (viewingSelf && !saved);
                const entryEditable = canEditEntry(saved);
                const updatedBy = getHourlyUpdatedByLabel(saved);
                const deletedBy = getHourlyDeletedByLabel(saved);

                if (isDeleted && saved) {
                  return (
                    <div
                      key={hour}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                    >
                      <div>
                        <span className="inline-flex rounded-xl bg-slate-400 px-3 py-1.5 text-sm font-semibold text-white">
                          {formatHourLabel(hour)}
                        </span>
                        <p className="mt-1 text-[11px] font-medium text-slate-400">{formatHourRange(hour)}</p>
                      </div>
                      <span className="inline-flex rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        {deletedBy}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={hour}
                    className={`group relative rounded-2xl border transition-all duration-300 ${
                      isCurrent
                        ? 'border-brand-red/40 bg-gradient-to-r from-red-50/80 via-white to-white shadow-[0_10px_30px_rgba(220,38,38,0.08)]'
                        : saved
                          ? 'border-emerald-200/70 bg-emerald-50/30'
                          : 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch sm:gap-4 sm:p-4">
                      <div className="flex shrink-0 items-center gap-3 sm:w-[150px] sm:flex-col sm:items-start sm:justify-center sm:gap-1.5">
                        <div
                          className={`inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold tabular-nums ${
                            isCurrent
                              ? 'bg-brand-red text-white'
                              : saved
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-slate-700 ring-1 ring-slate-200'
                          }`}
                        >
                          {formatHourLabel(hour)}
                        </div>
                        <p className="text-[11px] font-medium text-slate-400">{formatHourRange(hour)}</p>
                        {isCurrent && (
                          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-red sm:inline">
                            Now
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {showEditor ? (
                          <div className="relative">
                            <textarea
                              value={value}
                              ref={(el) => {
                                textareaRefs.current[hour] = el;
                                autoGrowTextarea(el);
                              }}
                              onChange={(e) => {
                                const el = e.currentTarget;
                                setDraftValue(hour, el.value);
                                autoGrowTextarea(el);
                                // Enter / typing while mic is on: move insert point to the new cursor
                                // immediately so the next spoken words stay on this line.
                                if (listeningHour === hour) {
                                  const start = el.selectionStart ?? el.value.length;
                                  const end = el.selectionEnd ?? start;
                                  const prev = voiceInsertRef.current;
                                  voiceInsertRef.current = {
                                    hour,
                                    before: el.value.slice(0, start),
                                    after: el.value.slice(end),
                                    startResultIndex: prev.lastResultsLength,
                                    lastResultsLength: prev.lastResultsLength,
                                    ignoreSelect: prev.ignoreSelect,
                                  };
                                }
                              }}
                              onInput={(e) => autoGrowTextarea(e.currentTarget)}
                              onClick={() => {
                                if (voiceInsertRef.current.ignoreSelect) return;
                                captureVoiceCaret(hour, {
                                  reanchorSpeech: listeningHour === hour,
                                });
                              }}
                              onKeyUp={(e) => {
                                if (voiceInsertRef.current.ignoreSelect) return;
                                // Arrow keys / Home / End / Enter move the real caret.
                                if (
                                  listeningHour === hour ||
                                  e.key === 'Enter' ||
                                  e.key.startsWith('Arrow') ||
                                  e.key === 'Home' ||
                                  e.key === 'End'
                                ) {
                                  captureVoiceCaret(hour, {
                                    reanchorSpeech: listeningHour === hour,
                                  });
                                } else if (listeningHour !== hour) {
                                  captureVoiceCaret(hour);
                                }
                              }}
                              onSelect={() => {
                                if (voiceInsertRef.current.ignoreSelect) return;
                                captureVoiceCaret(hour, {
                                  reanchorSpeech: listeningHour === hour,
                                });
                              }}
                              disabled={(!canMutate && !(isAdmin && isEditing)) || isSaving}
                              rows={2}
                              placeholder="What productive work did you complete in this hour?"
                              className={`w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-12 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/15 disabled:cursor-not-allowed disabled:bg-slate-50 ${HOURLY_CONTENT_MAX_CLASS}`}
                            />
                            {voiceSupported && viewingSelf && canMutate && (
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  // Keep textarea selection/cursor when clicking Voice.
                                  e.preventDefault();
                                  e.stopPropagation();
                                  captureVoiceCaret(hour);
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  startListening(hour);
                                }}
                                disabled={isSaving}
                                aria-label={isListening ? 'Stop voice input' : 'Start voice to text'}
                                title={isListening ? 'Stop voice input' : 'Voice to text — tap and speak'}
                                className={`absolute right-2 top-2 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition ${
                                  isListening
                                    ? 'bg-brand-red text-white shadow-lg shadow-red-500/35 animate-pulse'
                                    : 'bg-red-100 text-brand-red hover:bg-red-200/80'
                                }`}
                              >
                                {isListening ? (
                                  <MicOff size={14} strokeWidth={2.5} />
                                ) : (
                                  <Mic size={14} strokeWidth={2.5} className="text-brand-red" />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="min-w-0 py-0.5">
                            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
                              {saved?.content}
                            </p>
                            {updatedBy && (
                              <span className="mt-2 inline-flex max-w-full rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                {updatedBy}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:justify-center">
                        {showEditor ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleSubmitHour(hour)}
                              disabled={isSaving || !value.trim() || (!canMutate && !(isAdmin && isEditing))}
                              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-red to-rose-600 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                              {saved ? 'Update' : 'Submit'}
                            </button>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  stopListening();
                                  setEditingHour(null);
                                  setDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[hour];
                                    return next;
                                  });
                                }}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                title="Cancel edit"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </>
                        ) : (
                          entryEditable &&
                          saved && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingHour(hour);
                                  setDraftValue(hour, saved.content || '');
                                }}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(saved)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )
                        )}
                        {saved && !entryEditable && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                            Locked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="pt-2 text-center text-xs text-slate-400">
            Tip: tap Voice and speak. Say “submit this” or “update this record” at the end to save. Employees can edit or delete only on the same day.
          </p>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h4 className="text-lg font-semibold text-slate-900">Delete this hour?</h4>
            <p className="mt-2 text-sm text-slate-600">
              Remove the {formatHourLabel(confirmDelete.hour)} entry for {confirmDelete.date}?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const toDelete = confirmDelete;
                  setConfirmDelete(null);
                  await handleDelete(toDelete);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700"
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

export default HourlyTrackingPanel;
