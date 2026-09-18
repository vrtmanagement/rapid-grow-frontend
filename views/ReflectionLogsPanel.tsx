import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Download, ScrollText } from 'lucide-react';
import { ThemedDatePicker, ThemedSelect } from '../components/spaces/SpacesFormControls';
import { getDisplayAvatarUrl } from '../utils/avatar';
import { ReflectionLogSkeleton } from '../components/ui/Skeleton';
import type { ReflectionRecord } from './reflectionViewHelpers';
import {
  buildAllReportsHtml,
  buildDownloadPeriodMenu,
  buildPersonPeriodCompletedHtml,
  downloadWordDoc,
  uniquePeopleFromRecords,
  type DownloadPeriodGranularity,
  type DownloadPeriodOption,
} from './reflectionLogsDownload';

export type ReflectionLogsPanelProps = {
  isAdmin: boolean;
  isLeader: boolean;
  isEmployee: boolean;
  loadingList: boolean;
  logsLoaded: boolean;
  logFilter: 'today' | 'yesterday' | 'all';
  setLogFilter: (value: 'today' | 'yesterday' | 'all') => void;
  selectedLogDate: string;
  setSelectedLogDate: (value: string) => void;
  scope: 'me' | 'team' | 'all';
  setScope: (value: 'me' | 'team' | 'all') => void;
  displayedRecords: ReflectionRecord[];
  loadedRecords: ReflectionRecord[];
  paginatedRecords: ReflectionRecord[];
  employeeOptions: Array<{ empId: string; empName: string; role?: string }>;
  employeeAvatarById: Record<string, string>;
  currentEmpId: string;
  currentUserName: string;
  canEditOrDelete: (record: ReflectionRecord) => boolean;
  handleEditClick: (record: ReflectionRecord) => void;
  setConfirmDelete: (record: ReflectionRecord | null) => void;
  totalPages: number;
  safePage: number;
  setLogsPage: (page: number | ((prev: number) => number)) => void;
  todayKey: string;
  yesterdayKey: string;
};

const PERIOD_GRANULARITY_LABELS: Record<DownloadPeriodGranularity, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const LOGS_PER_PAGE = 5;

const segmentClass = (active: boolean) =>
  `h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors ${
    active ? 'bg-brand-red text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900'
  }`;

const ghostActionClass =
  'inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50';

const primaryActionClass =
  'inline-flex h-9 items-center justify-center gap-2 rounded-full bg-slate-900 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40';

export const ReflectionLogsPanel: React.FC<ReflectionLogsPanelProps> = ({
  isAdmin,
  isLeader,
  isEmployee,
  loadingList,
  logsLoaded,
  logFilter,
  setLogFilter,
  selectedLogDate,
  setSelectedLogDate,
  scope,
  setScope,
  displayedRecords,
  loadedRecords,
  paginatedRecords,
  employeeOptions,
  employeeAvatarById,
  currentEmpId,
  currentUserName,
  canEditOrDelete,
  handleEditClick,
  setConfirmDelete,
  totalPages,
  safePage,
  setLogsPage,
  todayKey,
}) => {
  const peopleFromRecords = useMemo(() => uniquePeopleFromRecords(loadedRecords), [loadedRecords]);
  const people = useMemo(() => {
    if (isAdmin) {
      return employeeOptions.length ? employeeOptions : peopleFromRecords;
    }

    if (isLeader) {
      const fromApi = employeeOptions.filter((person) => {
        const role = String(person.role || '').toUpperCase();
        return person.empId === currentEmpId || role === 'EMPLOYEE';
      });
      if (fromApi.length) return fromApi;

      const merged = new Map<string, { empId: string; empName: string }>();
      if (currentEmpId) {
        merged.set(currentEmpId, {
          empId: currentEmpId,
          empName: currentUserName || currentEmpId,
        });
      }
      peopleFromRecords.forEach((person) => merged.set(person.empId, person));
      return Array.from(merged.values()).sort((a, b) => a.empName.localeCompare(b.empName));
    }

    if (currentEmpId) {
      const selfFromRecords = peopleFromRecords.find((person) => person.empId === currentEmpId);
      if (selfFromRecords) return [selfFromRecords];
      const selfFromOptions = employeeOptions.find((person) => person.empId === currentEmpId);
      if (selfFromOptions) return [selfFromOptions];
      return [{ empId: currentEmpId, empName: currentUserName || currentEmpId }];
    }

    return [];
  }, [currentEmpId, currentUserName, employeeOptions, isAdmin, isLeader, peopleFromRecords]);

  const periodMenu = useMemo(() => buildDownloadPeriodMenu(todayKey), [todayKey]);
  const defaultPeriod = periodMenu.weekly[0] || null;
  const [downloadEmpId, setDownloadEmpId] = useState('');
  const [selectedPeriodOption, setSelectedPeriodOption] = useState<DownloadPeriodOption | null>(defaultPeriod);
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [hoveredGranularity, setHoveredGranularity] = useState<DownloadPeriodGranularity>('weekly');
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const periodDropdownRef = useRef<HTMLDivElement | null>(null);
  const showDownloads = isAdmin || isLeader || isEmployee;
  const canPickPerson = isAdmin || isLeader;

  useEffect(() => {
    setSelectedPeriodOption((previous) => {
      if (previous) {
        const stillExists = [...periodMenu.weekly, ...periodMenu.monthly].some(
          (option) => option.value === previous.value,
        );
        if (stillExists) return previous;
      }
      return periodMenu.weekly[0] || periodMenu.monthly[0] || null;
    });
  }, [periodMenu]);

  useEffect(() => {
    if (!downloadMessage) return undefined;
    const timer = window.setTimeout(() => setDownloadMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [downloadMessage]);

  useEffect(() => {
    if (!periodMenuOpen) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!periodDropdownRef.current?.contains(target)) {
        setPeriodMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [periodMenuOpen]);

  const selectedPersonId = isEmployee && currentEmpId
    ? currentEmpId
    : downloadEmpId && people.some((person) => person.empId === downloadEmpId)
      ? downloadEmpId
      : people[0]?.empId || '';

  const selectedPeriod = selectedPeriodOption?.bucket || null;
  const hoveredOptions = periodMenu[hoveredGranularity] || [];

  const runDownload = (filename: string, html: string, emptyMessage: string) => {
    if (!displayedRecords.length) {
      setDownloadMessage(emptyMessage);
      return;
    }
    downloadWordDoc(filename, html);
    setDownloadMessage('Downloaded');
  };

  const personOptions = people.map((person) => ({
    value: person.empId,
    label: `${person.empName} (${person.empId})`,
  }));

  const downloadPersonPeriod = () => {
    if (!selectedPersonId || !selectedPeriod) return;
    const person = people.find((entry) => entry.empId === selectedPersonId);
    const slug = (person?.empName || selectedPersonId).replace(/[^\w-]+/g, '_');
    const personRecords = loadedRecords.filter((record) => record.empId === selectedPersonId);
    if (!personRecords.length) {
      setDownloadMessage(
        isAdmin
          ? 'No reports to download. Choose Everyone, then pick a person.'
          : isLeader
            ? 'No reports to download. Choose My team, then pick a person.'
            : 'No reports to download yet.',
      );
      return;
    }
    const periodSlug = selectedPeriod.kind === 'month' ? 'monthly' : 'weekly';
    downloadWordDoc(
      `${slug}-${periodSlug}-completed-tasks-${selectedPeriod.start}.doc`,
      buildPersonPeriodCompletedHtml(loadedRecords, selectedPersonId, selectedPeriod),
    );
    setDownloadMessage('Downloaded');
  };

  return (
  <div className="mx-auto max-w-6xl space-y-5">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-brand-red">
            <ScrollText size={18} />
          </span>
          <div>
            <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">Reflection Logs</h3>
            <p className="text-[12px] text-slate-500">
              {loadingList ? 'Loading…' : `${displayedRecords.length} report${displayedRecords.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
        {downloadMessage ? (
          <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${
            downloadMessage.startsWith('Downloaded')
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}>
            {downloadMessage}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                setLogFilter('today');
                setSelectedLogDate('');
              }}
              className={segmentClass(logFilter === 'today' && !selectedLogDate)}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setLogFilter('yesterday');
                setSelectedLogDate('');
              }}
              className={segmentClass(logFilter === 'yesterday' && !selectedLogDate)}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => {
                setLogFilter('all');
                setSelectedLogDate('');
              }}
              className={segmentClass(logFilter === 'all' && !selectedLogDate)}
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
                setLogFilter('all');
              }}
            />
          </div>

          {(isAdmin || isLeader) && (
            <div className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-1">
              <button type="button" onClick={() => setScope('me')} className={segmentClass(scope === 'me')}>
                Just mine
              </button>
              {isAdmin ? (
                <button type="button" onClick={() => setScope('all')} className={segmentClass(scope === 'all')}>
                  Everyone
                </button>
              ) : (
                <button type="button" onClick={() => setScope('team')} className={segmentClass(scope === 'team')}>
                  My team
                </button>
              )}
            </div>
          )}
        </div>

        {showDownloads && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() =>
                runDownload(
                  `all-reflection-reports-${todayKey}.doc`,
                  buildAllReportsHtml(displayedRecords),
                  'No reports to download. Change the filters first.',
                )
              }
              className={ghostActionClass}
            >
              <Download size={14} />
              {isEmployee ? 'My reports' : 'All reports'}
            </button>
            <div className="flex min-w-[240px] flex-1 flex-wrap items-center gap-2 sm:justify-end">
              {canPickPerson ? (
                <div className="w-full min-w-[200px] sm:w-[240px]">
                  <ThemedSelect
                    compact
                    fullWidthCompact
                    denseMenu
                    forceOpenDown
                    placeholder="Choose person"
                    value={selectedPersonId}
                    options={personOptions}
                    onChange={setDownloadEmpId}
                    disabled={personOptions.length === 0}
                  />
                </div>
              ) : null}
              <div ref={periodDropdownRef} className="relative w-full min-w-[210px] sm:w-[280px]">
                <button
                  type="button"
                  onClick={() => {
                    setPeriodMenuOpen((previous) => !previous);
                    setHoveredGranularity(selectedPeriod?.kind === 'month' ? 'monthly' : 'weekly');
                  }}
                  className={`flex h-9 w-full items-center justify-between rounded-full border bg-white px-3.5 text-left text-[13px] font-semibold outline-none transition-all ${
                    periodMenuOpen
                      ? 'border-brand-red text-slate-900 shadow-[0_8px_24px_rgba(239,68,68,0.12)] ring-2 ring-brand-red/10'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={periodMenuOpen}
                >
                  <span className="truncate">
                    {selectedPeriodOption?.buttonLabel || 'Choose period'}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`ml-2 shrink-0 text-slate-400 transition-transform ${
                      periodMenuOpen ? 'rotate-180 text-brand-red' : ''
                    }`}
                  />
                </button>

                {periodMenuOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-2 flex overflow-hidden rounded-[1.1rem] border border-slate-200 bg-white/95 shadow-[0_22px_48px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                    <div className="w-[126px] border-r border-slate-100 p-1.5">
                      {(Object.keys(PERIOD_GRANULARITY_LABELS) as DownloadPeriodGranularity[]).map((granularity) => (
                        <button
                          key={granularity}
                          type="button"
                          onMouseEnter={() => setHoveredGranularity(granularity)}
                          onFocus={() => setHoveredGranularity(granularity)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors ${
                            hoveredGranularity === granularity
                              ? 'bg-brand-red/6 text-brand-red'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{PERIOD_GRANULARITY_LABELS[granularity]}</span>
                          <ChevronRight size={14} className="opacity-60" />
                        </button>
                      ))}
                    </div>
                    <div className="max-h-72 w-[230px] overflow-y-auto p-1.5">
                      {hoveredOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setSelectedPeriodOption(option);
                            setPeriodMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-[13px] transition-colors ${
                            selectedPeriodOption?.value === option.value
                              ? 'bg-brand-red/6 text-brand-red'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{option.label}</span>
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              selectedPeriodOption?.value === option.value ? 'bg-brand-red' : 'bg-transparent'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                disabled={!selectedPersonId || !selectedPeriod}
                onClick={downloadPersonPeriod}
                className={primaryActionClass}
              >
                <Download size={14} />
                {isEmployee
                  ? selectedPeriod?.kind === 'month'
                    ? 'My month'
                    : 'My week'
                  : selectedPeriod?.kind === 'month'
                    ? 'This person’s month'
                    : 'This person’s week'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {displayedRecords.length === 0 && !loadingList ? (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-slate-500">
          {logsLoaded
            ? 'No reports match these filters.'
            : 'No reflections yet. Submit one from Daily Report.'}
        </p>
      </div>
    ) : (
      <div className="space-y-3">
        {loadingList ? (
          <ReflectionLogSkeleton count={5} />
        ) : paginatedRecords.map((r) => {
          const avatarSrc = getDisplayAvatarUrl(r.avatar || employeeAvatarById[r.empId], r.empName || r.empId);
          return (
            <article key={r._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={avatarSrc}
                    alt={r.empName}
                    className="h-10 w-10 rounded-full border border-slate-200 bg-slate-50 object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {r.empName} <span className="font-medium text-slate-400">({r.empId})</span>
                    </p>
                    <p className="text-[12px] text-slate-500">
                      {r.role} · {r.date}
                      {r.updatedAt && r.updatedAt !== r.createdAt ? (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          Edited{r.lastEditedByName ? ` by ${r.lastEditedByName}` : ''}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                {canEditOrDelete(r) && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditClick(r)}
                      className="h-8 rounded-full border border-slate-200 px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(r)}
                      className="h-8 rounded-full border border-red-200 px-3 text-[12px] font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="grid gap-4 text-sm text-slate-700 md:grid-cols-2">
                {r.accomplishments && (
                  <div>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Accomplishments</span>
                    <p className="whitespace-pre-line">{r.accomplishments}</p>
                  </div>
                )}
                {r.challenges && (
                  <div>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Challenges</span>
                    <p className="whitespace-pre-line">{r.challenges}</p>
                  </div>
                )}
                {r.unfinished && (
                  <div>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Unfinished</span>
                    <p className="whitespace-pre-line">{r.unfinished}</p>
                  </div>
                )}
                {r.energyPeaks && (
                  <div>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Energy peaks</span>
                    <p className="whitespace-pre-line">{r.energyPeaks}</p>
                  </div>
                )}
                {r.bigRocksTomorrow && (
                  <div className="md:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Tomorrow</span>
                    <p className="whitespace-pre-line">{r.bigRocksTomorrow}</p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    )}

    {!loadingList && displayedRecords.length > 0 && (
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-[12px] text-slate-500">
          {(safePage - 1) * LOGS_PER_PAGE + 1}–{Math.min(safePage * LOGS_PER_PAGE, displayedRecords.length)} of {displayedRecords.length}
        </p>
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLogsPage((prev) => Math.max(1, prev - 1))}
            disabled={safePage === 1}
            className="h-8 rounded-full border border-slate-200 px-3 text-[12px] font-semibold text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-[12px] text-slate-500">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setLogsPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safePage >= totalPages}
            className="h-8 rounded-full border border-slate-200 px-3 text-[12px] font-semibold text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    )}
  </div>
  );
};
