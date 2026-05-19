import React, { useEffect, useState } from 'react';
import {
  fetchSuperAdminTenant,
  fetchSuperAdminTenants,
  updateTenantStatus,
} from '../services/p4Api';

const SuperAdminView: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [error, setError] = useState('');

  const load = () => {
    fetchSuperAdminTenants()
      .then((res) => setTenants(res.tenants || []))
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchSuperAdminTenant(selectedId)
      .then((res) => setDetail(res))
      .catch((e) => setError(e.message));
  }, [selectedId]);

  const toggleStatus = async (companyId: string, current: string) => {
    const next = current === 'suspended' ? 'active' : 'suspended';
    await updateTenantStatus(companyId, next as 'active' | 'suspended');
    load();
    if (selectedId === companyId) setSelectedId(companyId);
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Super Admin</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left">
            <tr>
              <th className="p-3">Company</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Status</th>
              <th className="p-3">Users</th>
              <th className="p-3">AI calls</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.companyId} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 font-medium">{t.name || t.companyId}</td>
                <td className="p-3">{t.plan}</td>
                <td className="p-3">{t.status}</td>
                <td className="p-3">{t.activeUsers ?? t.usageSnapshot?.activeUsers ?? '—'}</td>
                <td className="p-3">{t.usageSnapshot?.aiCallsThisMonth ?? '—'}</td>
                <td className="p-3 space-x-2">
                  <button
                    type="button"
                    className="text-indigo-600 hover:underline"
                    onClick={() => setSelectedId(t.companyId)}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    className="text-amber-700 hover:underline"
                    onClick={() => toggleStatus(t.companyId, t.status)}
                  >
                    {t.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {detail?.tenant && (
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 dark:border-slate-700">
          <h2 className="font-semibold mb-2">Tenant detail</h2>
          <pre className="text-xs overflow-auto bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
            {JSON.stringify(detail, null, 2)}
          </pre>
        </section>
      )}
    </section>
  );
};

export default SuperAdminView;
