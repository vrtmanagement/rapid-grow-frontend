import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchSuperAdminTenant,
  fetchSuperAdminTenants,
  updateTenantStatus,
} from '../services/p4Api';

const LEGACY_COMPANY_ID = 'legacy-company';

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

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

  const registeredTenants = useMemo(
    () =>
      tenants
        .filter((tenant) => tenant.companyId !== LEGACY_COMPANY_ID && tenant.registeredVia !== 'legacy')
        .sort((a, b) => Number(a.orgNumber || 0) - Number(b.orgNumber || 0)),
    [tenants],
  );

  const toggleStatus = async (companyId: string, current: string) => {
    const next = current === 'suspended' ? 'active' : 'suspended';
    await updateTenantStatus(companyId, next as 'active' | 'suspended');
    load();
    if (selectedId === companyId) setSelectedId(companyId);
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Super Admin</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Self-registered organizations appear here only. Each workspace is isolated as Org 1, Org 2, Org 3, and so on.
        </p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Registered workspaces</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {registeredTenants.length} self-serve organization{registeredTenants.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-left">
              <tr>
                <th className="p-3">Org</th>
                <th className="p-3">Company</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Status</th>
                <th className="p-3">Users</th>
                <th className="p-3">Registered</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {registeredTenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    No self-registered workspaces yet.
                  </td>
                </tr>
              ) : (
                registeredTenants.map((tenant) => (
                  <tr key={tenant.companyId} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-3 font-semibold text-brand-red">
                      {tenant.orgNumber ? `Org ${tenant.orgNumber}` : '—'}
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{tenant.name || tenant.companyId}</p>
                      <p className="text-xs text-slate-500">{tenant.industry || '—'} · {tenant.size || '—'}</p>
                    </td>
                    <td className="p-3">
                      <p>{tenant.ownerName || '—'}</p>
                      <p className="text-xs text-slate-500">{tenant.ownerEmail || '—'}</p>
                    </td>
                    <td className="p-3 capitalize">{tenant.plan}</td>
                    <td className="p-3 capitalize">{tenant.status}</td>
                    <td className="p-3">{tenant.activeUsers ?? tenant.usageSnapshot?.activeUsers ?? '—'}</td>
                    <td className="p-3">{formatDate(tenant.createdAt)}</td>
                    <td className="p-3 space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        className="text-indigo-600 hover:underline"
                        onClick={() => setSelectedId(tenant.companyId)}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="text-amber-700 hover:underline"
                        onClick={() => toggleStatus(tenant.companyId, tenant.status)}
                      >
                        {tenant.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detail?.company && (
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 dark:border-slate-700">
          <h2 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">Tenant detail</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500">Organization</p>
              <p className="mt-1 font-semibold">
                {detail.company.orgNumber ? `Org ${detail.company.orgNumber}` : detail.company.name}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500">Plan</p>
              <p className="mt-1 font-semibold capitalize">{detail.company.plan}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500">Workspace ID</p>
              <p className="mt-1 font-semibold break-all">{detail.company.companyId}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500">Registered</p>
              <p className="mt-1 font-semibold">{formatDate(detail.company.createdAt)}</p>
            </div>
          </div>
          <pre className="mt-4 text-xs overflow-auto bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
            {JSON.stringify(detail, null, 2)}
          </pre>
        </section>
      )}
    </section>
  );
};

export default SuperAdminView;
