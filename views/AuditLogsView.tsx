import React, { useEffect, useState } from 'react';
import { fetchAuditLogs } from '../services/platformApi';

const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [entityType, setEntityType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAuditLogs({
        limit: 100,
        entityType: entityType || undefined,
      });
      setLogs(res.items || []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [entityType]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Audit log</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Who changed tasks, employees, CRM, and other records in your company.
        </p>
      </header>

      <section className="flex flex-wrap gap-2 items-end">
        <label className="text-sm">
          <span className="block font-semibold mb-1">Filter by type</span>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 dark:bg-slate-900 dark:border-slate-700"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">All</option>
            <option value="task">Tasks</option>
            <option value="employee">Employees</option>
            <option value="crm">CRM</option>
            <option value="goal">Goals</option>
            <option value="permission">Permissions</option>
          </select>
        </label>
        <button
          type="button"
          onClick={load}
          className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm"
        >
          Refresh
        </button>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 overflow-hidden dark:border-slate-700">
        <p className="text-xs text-slate-500 px-4 py-2 border-b border-slate-100 dark:border-slate-800">
          Showing {logs.length} of {total} entries
        </p>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Who</th>
              <th className="p-3">Action</th>
              <th className="p-3">Type</th>
              <th className="p-3">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row._id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 whitespace-nowrap">
                  {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                </td>
                <td className="p-3">{row.actorEmpId || row.actorName || '—'}</td>
                <td className="p-3">{row.action}</td>
                <td className="p-3">{row.entityType}</td>
                <td className="p-3 font-mono text-xs">{row.entityId || '—'}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No audit entries yet. Changes appear after create/update/delete actions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
};

export default AuditLogsView;
