import React, { useEffect, useState } from 'react';
import {
  createDataExport,
  getAccountClosureStatus,
  listDataExports,
  requestAccountClosure,
} from '../services/p4Api';
import { useI18n } from '../context/I18nContext';

const DataPrivacyView: React.FC = () => {
  const { t } = useI18n();
  const [jobs, setJobs] = useState<any[]>([]);
  const [closure, setClosure] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = () => {
    listDataExports().then((r) => setJobs(r.jobs || [])).catch(() => undefined);
    getAccountClosureStatus().then((r) => setClosure(r.request)).catch(() => undefined);
  };

  useEffect(() => {
    refresh();
  }, []);

  const onExport = async () => {
    setBusy(true);
    setMessage('');
    try {
      const res = await createDataExport();
      const blob = new Blob([JSON.stringify(res.export, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapidgrow-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Export ready and downloaded.');
      refresh();
    } catch (e: any) {
      setMessage(e.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const onClosure = async () => {
    if (!reason.trim()) {
      setMessage('Please provide a reason for account closure.');
      return;
    }
    setBusy(true);
    try {
      await requestAccountClosure(reason.trim());
      setMessage('Account closure scheduled. Data is retained per policy until deletion.');
      refresh();
    } catch (e: any) {
      setMessage(e.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('dataPrivacy')}</h1>
      {message && <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 dark:border-slate-700">
        <h2 className="font-semibold mb-2">{t('exportData')}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Download tasks, employees, CRM leads, goals, and projects as JSON. Existing data is not deleted.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onExport}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Request export'}
        </button>
        {jobs.length > 0 && (
          <ul className="mt-4 text-xs text-slate-500 space-y-1">
            {jobs.map((j) => (
              <li key={j._id}>
                {j.status} — {new Date(j.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50/50 dark:bg-red-950/20 p-6 dark:border-red-900">
        <h2 className="font-semibold text-red-900 dark:text-red-200 mb-2">{t('closeAccount')}</h2>
        <p className="text-sm text-red-800/80 dark:text-red-300/80 mb-3">
          Schedules deletion after the retention period. Export your data first. Deletion runs only when{' '}
          <code className="text-xs">ACCOUNT_DELETION_JOB_ENABLED=true</code> on user-service (off by default).
          Legacy company data is never deleted unless you disable{' '}
          <code className="text-xs">ACCOUNT_DELETION_SKIP_LEGACY</code>.
        </p>
        {closure ? (
          <p className="text-sm">
            Status: <strong>{closure.status}</strong>
            {closure.scheduledDeletionAt &&
              ` — deletion after ${new Date(closure.scheduledDeletionAt).toLocaleDateString()}`}
          </p>
        ) : (
          <>
            <textarea
              className="w-full rounded-lg border border-red-200 p-2 text-sm mb-3 dark:bg-slate-900 dark:border-red-800"
              rows={3}
              placeholder="Reason for closure"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={onClosure}
              className="rounded-lg bg-red-600 px-4 py-2 text-white text-sm hover:bg-red-700 disabled:opacity-50"
            >
              Schedule account closure
            </button>
          </>
        )}
      </section>
    </section>
  );
};

export default DataPrivacyView;
