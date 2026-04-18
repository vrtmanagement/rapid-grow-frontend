import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, RefreshCw, Trash2 } from 'lucide-react';
import Toast from '../components/ui/Toast';
import { apiClearAdminCollection, apiFetchAdminUsage, AdminUsageCollection, AdminUsageSnapshot } from '../services/adminUsageApi';
import {
  formatAllocatedUsageSummary,
  formatStorageSize,
  formatUsageSummary,
  getAllocatedUsagePercent,
  getAllocatedUsageTone,
  getCollectionAllocatedBytes,
  getUsagePercent,
} from '../utils/memoryUsage';

const POLL_INTERVAL_MS = 15000;

interface ConfirmState {
  key: string;
  label: string;
  collectionName: string;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

const loadingCards = Array.from({ length: 6 }, (_, index) => index);

const usageToneClasses: Record<'normal' | 'warning' | 'danger', { bar: string; badge: string; track: string }> = {
  normal: {
    bar: 'bg-emerald-500',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    track: 'bg-emerald-100/80',
  },
  warning: {
    bar: 'bg-amber-500',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    track: 'bg-amber-100/80',
  },
  danger: {
    bar: 'bg-rose-500',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    track: 'bg-rose-100/80',
  },
};

const MemoryUsageView: React.FC = () => {
  const [snapshot, setSnapshot] = useState<AdminUsageSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [clearingKey, setClearingKey] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadUsage = async (options?: { silent?: boolean; signal?: AbortSignal }) => {
    const isSilent = options?.silent ?? false;

    if (isSilent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await apiFetchAdminUsage(options?.signal);
      setSnapshot(response);
      setError('');
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      const message = err?.message || 'Failed to load memory usage';
      setError(message);
    } finally {
      if (isSilent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadUsage({ signal: controller.signal });

    const intervalId = window.setInterval(() => {
      void loadUsage({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  const collections = snapshot?.collections || [];
  const totalUsedLabel = useMemo(() => {
    if (!snapshot) return formatUsageSummary(0, 512 * 1024 * 1024);
    return formatUsageSummary(snapshot.totalSizeBytes, snapshot.limitBytes);
  }, [snapshot]);
  const totalUsagePercent = useMemo(() => {
    if (!snapshot) return 0;
    return getUsagePercent(snapshot.totalSizeBytes, snapshot.limitBytes);
  }, [snapshot]);

  const handleClearRequest = (collection: AdminUsageCollection) => {
    setConfirmState({
      key: collection.key,
      label: collection.label,
      collectionName: collection.collectionName,
    });
  };

  const handleConfirmClear = async () => {
    if (!confirmState) return;

    setClearingKey(confirmState.key);
    try {
      await apiClearAdminCollection(confirmState.key);
      setToast({ type: 'success', message: 'Data cleared successfully' });
      setConfirmState(null);
      await loadUsage({ silent: true });
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to clear data' });
    } finally {
      setClearingKey('');
    }
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} type={toast.type} /> : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Database size={14} className="text-brand-red" />
              Admin Memory Usage
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">Collection usage dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Real-time collection storage visibility with safe cleanup controls for admin-managed data.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 sm:min-w-[280px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total usage</span>
              <button
                type="button"
                onClick={() => void loadUsage({ silent: true })}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
            <p className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{totalUsedLabel}</p>
            <div className="h-2 rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalUsagePercent >= 90 ? 'bg-rose-500' : totalUsagePercent >= 80 ? 'bg-amber-500' : 'bg-brand-red'
                }`}
                style={{ width: `${Math.min(totalUsagePercent, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{collections.length} collections monitored</span>
              <span>{totalUsagePercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </section>

      {error && !snapshot ? (
        <section className="rounded-[28px] border border-rose-200 bg-rose-50/70 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-rose-700">Unable to load usage data</h2>
              <p className="mt-1 text-sm text-rose-600">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadUsage()}
              className="inline-flex items-center justify-center rounded-xl bg-brand-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Try again
            </button>
          </div>
        </section>
      ) : null}

      {error && snapshot ? (
        <section className="rounded-[20px] border border-amber-200 bg-amber-50/70 px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-amber-800">Live refresh issue: {error}</p>
            <p className="text-xs text-amber-700">Showing the most recent successful snapshot.</p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading && !snapshot
          ? loadingCards.map((cardIndex) => (
              <div
                key={`memory-usage-skeleton-${cardIndex}`}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 rounded-full bg-slate-200" />
                    <div className="h-7 w-20 rounded-full bg-slate-100" />
                  </div>
                  <div className="h-8 w-28 rounded-full bg-slate-200" />
                  <div className="h-3 w-full rounded-full bg-slate-100" />
                  <div className="h-10 rounded-2xl bg-slate-100" />
                  <div className="flex justify-between gap-3">
                    <div className="h-4 w-20 rounded-full bg-slate-100" />
                    <div className="h-10 w-28 rounded-xl bg-slate-100" />
                  </div>
                </div>
              </div>
            ))
          : collections.map((collection) => {
              const allocatedBytes = getCollectionAllocatedBytes(collection.key, snapshot?.limitBytes || 0);
              const allocationPercent = getAllocatedUsagePercent(collection.sizeBytes, allocatedBytes);
              const tone = getAllocatedUsageTone(allocationPercent);
              const toneClasses = usageToneClasses[tone];
              const isClearing = clearingKey === collection.key;

              return (
                <article
                  key={collection.key}
                  className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-950">{collection.label}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses.badge}`}>
                      {allocationPercent >= 100 ? 'Over Allocation' : allocationPercent >= 80 ? 'Near Limit' : 'Healthy'}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Documents</p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{collection.count.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Storage used</p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{formatStorageSize(collection.sizeBytes)}</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>{formatAllocatedUsageSummary(collection.sizeBytes, allocatedBytes)}</span>
                      <span className="font-semibold text-slate-700">{allocationPercent.toFixed(1)}%</span>
                    </div>
                    <div className={`h-2.5 rounded-full ${toneClasses.track}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${toneClasses.bar}`}
                        style={{ width: `${Math.min(allocationPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-4 min-h-[64px] text-sm leading-6 text-slate-500">{collection.description}</p>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {allocationPercent >= 80 ? <AlertTriangle size={14} className="text-amber-500" /> : <Database size={14} className="text-slate-400" />}
                      {allocationPercent >= 100
                        ? 'Current usage is above the allocated frontend budget'
                        : allocationPercent >= 80
                        ? 'Current usage is approaching the allocated frontend budget'
                        : 'Current usage is within the allocated frontend budget'}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleClearRequest(collection)}
                      disabled={isClearing}
                      className="inline-flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={15} />
                      {isClearing ? 'Clearing...' : 'Clear Data'}
                    </button>
                  </div>
                </article>
              );
            })}
      </section>

      {snapshot && !collections.length ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">No collections are configured for usage monitoring yet.</p>
        </section>
      ) : null}

      {confirmState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.24)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Trash2 size={18} />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-slate-950">Clear {confirmState.label}?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This will permanently remove all documents from <span className="font-semibold text-slate-900">{confirmState.collectionName}</span>. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                disabled={!!clearingKey}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmClear()}
                disabled={!!clearingKey}
                className="rounded-xl bg-brand-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {clearingKey ? 'Clearing...' : 'Confirm clear'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MemoryUsageView;
