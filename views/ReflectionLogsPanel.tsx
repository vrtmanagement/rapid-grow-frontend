import React from 'react';
import { ScrollText } from 'lucide-react';
import { ThemedDatePicker } from '../components/spaces/SpacesFormControls';
import { getDisplayAvatarUrl } from '../utils/avatar';
import { ReflectionLogSkeleton } from '../components/ui/Skeleton';
import type { ReflectionRecord } from './reflectionViewHelpers';

export type ReflectionLogsPanelProps = {
  isAdmin: boolean;
  isLeader: boolean;
  loadingList: boolean;
  logsLoaded: boolean;
  logFilter: 'today' | 'yesterday' | 'all';
  setLogFilter: (value: 'today' | 'yesterday' | 'all') => void;
  selectedLogDate: string;
  setSelectedLogDate: (value: string) => void;
  scope: 'me' | 'team' | 'all';
  setScope: (value: 'me' | 'team' | 'all') => void;
  displayedRecords: ReflectionRecord[];
  paginatedRecords: ReflectionRecord[];
  employeeAvatarById: Record<string, string>;
  canEditOrDelete: (record: ReflectionRecord) => boolean;
  handleEditClick: (record: ReflectionRecord) => void;
  setConfirmDelete: (record: ReflectionRecord | null) => void;
  totalPages: number;
  safePage: number;
  setLogsPage: (page: number | ((prev: number) => number)) => void;
};

const LOGS_PER_PAGE = 5;

export const ReflectionLogsPanel: React.FC<ReflectionLogsPanelProps> = ({
  isAdmin,
  isLeader,
  loadingList,
  logsLoaded,
  logFilter,
  setLogFilter,
  selectedLogDate,
  setSelectedLogDate,
  scope,
  setScope,
  displayedRecords,
  paginatedRecords,
  employeeAvatarById,
  canEditOrDelete,
  handleEditClick,
  setConfirmDelete,
  totalPages,
  safePage,
  setLogsPage,
}) => (
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
        Showing {(safePage - 1) * LOGS_PER_PAGE + 1}-
        {Math.min(safePage * LOGS_PER_PAGE, displayedRecords.length)} of {displayedRecords.length}
      </p>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => setLogsPage((prev) => Math.max(1, prev - 1))}
          disabled={safePage === 1}
          className="px-3 py-1.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
        >
          Previous
        </button>
        <span className="text-xs text-slate-600 px-2">
          Page {safePage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setLogsPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={safePage >= totalPages}
          className="px-3 py-1.5 rounded-full border border-brand-red/30 text-brand-red hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
        >
          Next
        </button>
      </div>
    </div>
  )}
  </div>
);
