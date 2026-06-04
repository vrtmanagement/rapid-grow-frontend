import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Filter, RefreshCw, X } from 'lucide-react';
import { ThemedSelect } from '../components/spaces/SpacesFormControls';
import { fetchAuditLogs } from '../services/platformApi';

const PAGE_SIZE = 20;

type AuditLogRow = {
  _id: string;
  createdAt?: string;
  actorDisplayName?: string;
  actorRoleLabel?: string;
  actionLabel?: string;
  entityTypeLabel?: string;
  entityDisplayName?: string;
};

type FilterOption = { value: string; label: string };

type AppliedFilters = {
  entityType: string;
  action: string;
};

const EMPTY_FILTERS: AppliedFilters = {
  entityType: '',
  action: '',
};

type AuditLogsViewProps = {
  embedded?: boolean;
};

const AuditLogsView: React.FC<AuditLogsViewProps> = ({ embedded = false }) => {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityTypeOptions, setEntityTypeOptions] = useState<FilterOption[]>([]);
  const [actionOptions, setActionOptions] = useState<FilterOption[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [draftFilters, setDraftFilters] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const activeFilterCount = useMemo(
    () => [appliedFilters.entityType, appliedFilters.action].filter(Boolean).length,
    [appliedFilters],
  );

  const rowOffset = (page - 1) * PAGE_SIZE;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAuditLogs({
        page,
        limit: PAGE_SIZE,
        entityType: appliedFilters.entityType || undefined,
        action: appliedFilters.action || undefined,
      });
      setLogs(Array.isArray(res.items) ? (res.items as AuditLogRow[]) : []);
      setTotal(Number(res.total || 0));
      setTotalPages(Math.max(1, Number(res.totalPages || 1)));
      if (Array.isArray(res.entityTypeOptions) && res.entityTypeOptions.length) {
        setEntityTypeOptions(res.entityTypeOptions);
      }
      if (Array.isArray(res.actionOptions) && res.actionOptions.length) {
        setActionOptions(res.actionOptions);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({ ...draftFilters });
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [page, totalPages]);

  const entityTypeSelectOptions = useMemo(
    () => [{ value: '', label: 'All types' }, ...entityTypeOptions],
    [entityTypeOptions],
  );

  const actionSelectOptions = useMemo(
    () => [{ value: '', label: 'All actions' }, ...actionOptions],
    [actionOptions],
  );

  return (
    <section className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl space-y-6'}>
      {embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-slate-600">
            Track who changed tasks, employees, expenses, attendance, CRM, and other records.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      ) : (
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit log</h1>
            <p className="mt-1 text-sm text-slate-600">
              Track who changed tasks, employees, expenses, attendance, CRM, and other records.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </header>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-brand-red/10 px-2 py-0.5 text-xs font-semibold text-brand-red">
                {activeFilterCount} active
              </span>
            ) : null}
          </span>
          <ChevronDown size={18} className={`text-slate-500 transition ${filtersOpen ? 'rotate-180' : ''}`} />
        </button>

        {filtersOpen ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <div className="grid grid-cols-1 gap-3 rounded-[26px] border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Record type
                </span>
                <ThemedSelect
                  value={draftFilters.entityType}
                  onChange={(value) => setDraftFilters((prev) => ({ ...prev, entityType: value }))}
                  options={entityTypeSelectOptions}
                  placeholder="All types"
                  compact
                  fullWidthCompact
                  forceOpenDown
                />
              </label>

              <label className="block min-w-0">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Action
                </span>
                <ThemedSelect
                  value={draftFilters.action}
                  onChange={(value) => setDraftFilters((prev) => ({ ...prev, action: value }))}
                  options={actionSelectOptions}
                  placeholder="All actions"
                  compact
                  fullWidthCompact
                  forceOpenDown
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red/90"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <X size={14} />
                Clear
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>
            {loading
              ? 'Loading audit entries…'
              : `Showing ${logs.length ? rowOffset + 1 : 0}–${rowOffset + logs.length} of ${total} entries`}
          </span>
          <span className="text-xs text-slate-500">{PAGE_SIZE} records per page</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-600">When</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Who</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Action</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Record</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-t border-slate-100">
                      {Array.from({ length: 5 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                : logs.map((row) => (
                    <tr key={row._id} className="border-t border-slate-100 align-top hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.actorDisplayName || 'Unknown user'}</p>
                        {row.actorRoleLabel ? (
                          <p className="text-xs text-slate-500">{row.actorRoleLabel}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {row.actionLabel || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.entityTypeLabel || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.entityDisplayName || '—'}</td>
                    </tr>
                  ))}

              {!loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No audit entries match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <div className="flex flex-wrap items-center gap-1">
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  disabled={loading}
                  onClick={() => setPage(pageNumber)}
                  className={`min-w-[2.25rem] rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    pageNumber === page
                      ? 'bg-brand-red text-white'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        ) : null}
      </section>
    </section>
  );
};

export default AuditLogsView;
