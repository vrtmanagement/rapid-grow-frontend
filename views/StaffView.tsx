import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import Toast from '../components/ui/Toast';
import AccessDenied from '../components/AccessDenied';
import { StaffTableSkeleton } from '../components/ui/Skeleton';
import { usePermissions } from '../context/usePermissions';
import { API_BASE, getAuthHeaders } from '../config/api';

type BackendRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | string;

interface EmployeeRow {
  _id: string;
  empId: string;
  empName: string;
  avatar?: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  role?: BackendRole;
  status?: string;
  createdBy?: string;
}

function getBackendInfo() {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return { role: 'EMPLOYEE' as BackendRole, empId: '' };
    const parsed = JSON.parse(raw);
    return {
      role: (parsed?.employee?.role || 'EMPLOYEE') as BackendRole,
      empId: parsed?.employee?.empId || '',
    };
  } catch {
    return { role: 'EMPLOYEE' as BackendRole, empId: '' };
  }
}

function resolveAvatarUrl(rawAvatar?: string | null): string | undefined {
  const avatar = (rawAvatar || '').trim();
  if (!avatar) return undefined;
  if (/^(https?:)?\/\//i.test(avatar) || /^data:/i.test(avatar) || /^blob:/i.test(avatar)) {
    return avatar;
  }

  let apiOrigin = '';
  try {
    apiOrigin = new URL(API_BASE).origin;
  } catch {
    apiOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  }

  if (!apiOrigin) return avatar;
  if (avatar.startsWith('/')) return `${apiOrigin}${avatar}`;
  return `${apiOrigin}/${avatar.replace(/^\.?\//, '')}`;
}

function formatRoleLabel(role?: BackendRole) {
  const normalized = String(role || 'EMPLOYEE').toUpperCase();
  return normalized.replace(/_/g, ' ');
}

function getRoleBadgeClass(role?: BackendRole) {
  switch (String(role || '').toUpperCase()) {
    case 'SUPER_ADMIN':
      return 'border border-brand-red/15 bg-brand-red/8 text-brand-red';
    case 'ADMIN':
      return 'border border-amber-100 bg-amber-50 text-amber-700';
    case 'TEAM_LEAD':
      return 'border border-blue-100 bg-blue-50 text-blue-700';
    default:
      return 'border border-slate-200 bg-slate-100 text-slate-700';
  }
}

function getStatusBadgeClass(status?: string) {
  return String(status || '').toLowerCase() === 'active'
    ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
    : 'border border-slate-200 bg-slate-100 text-slate-600';
}

const StaffView: React.FC = () => {
  const { hasPermission } = usePermissions();
  const backendInfo = useMemo(() => getBackendInfo(), []);
  const backendRole = backendInfo.role;
  const backendEmpId = backendInfo.empId;

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<EmployeeRow>>({});
  const [deleting, setDeleting] = useState<EmployeeRow | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN';
  const isTeamLead = backendRole === 'TEAM_LEAD';

  const canEditRow = (row: EmployeeRow) => {
    if (!hasPermission('EMPLOYEE_UPDATE')) return false;
    if (isAdmin) return true;
    if (isTeamLead) {
      if (backendEmpId && row.empId === backendEmpId) return true;
      return (row.role || '').toUpperCase() === 'EMPLOYEE';
    }
    if (backendEmpId && row.empId === backendEmpId) return true;
    return false;
  };

  const canDeleteRow = (row: EmployeeRow) => {
    if (!hasPermission('EMPLOYEE_DELETE')) return false;
    if (isAdmin) return true;
    if (isTeamLead) {
      if (backendEmpId && row.empId === backendEmpId) return true;
      return (row.role || '').toUpperCase() === 'EMPLOYEE';
    }
    if (backendEmpId && row.empId === backendEmpId) return true;
    return false;
  };

  const load = async () => {
    if (!hasPermission('STAFF_VIEW')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load staff');
      }
      const data = await res.json();
      const list: EmployeeRow[] = Array.isArray(data) ? data : [];
      setRows(list);
    } catch (e: any) {
      setError(e?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [hasPermission]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!hasPermission('STAFF_VIEW')) {
    return <AccessDenied />;
  }

  const handleStartEdit = (row: EmployeeRow) => {
    if (!canEditRow(row)) return;
    setEditing(row);
    setEditDraft(
      backendEmpId && row.empId === backendEmpId && !isAdmin && !isTeamLead
        ? {}
        : {
            empName: row.empName,
            designation: row.designation,
            department: row.department,
            email: row.email,
            phone: row.phone,
            status: row.status,
            role: row.role,
          },
    );
  };

  const handleSave = async () => {
    if (!editing) return;
    setError(null);
    try {
      const body: any = { ...editDraft };
      if (!isAdmin) {
        delete body.role;
      }
      if (!body.password || !String(body.password).trim()) {
        delete body.password;
      }

      const res = await fetch(`${API_BASE}/employees/${editing._id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update staff');
      }

      setRows((prev) => prev.map((r) => (r._id === data._id ? data : r)));
      setToast({ type: 'success', message: 'User details updated successfully.' });
      setEditing(null);
      setEditDraft({});
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'User details could not be updated.' });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/employees/${deleting._id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete staff');
      }
      setRows((prev) => prev.filter((r) => r._id !== deleting._id));
      setToast({ type: 'success', message: 'Employee deleted successfully.' });
      setDeleting(null);
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Employee could not be deleted.' });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in duration-700">
      {toast && <Toast type={toast.type} message={toast.message} />}

      <div className="rounded-[28px] border border-slate-200/80 bg-white/90 px-7 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="h-1.5 w-8 rounded-full bg-brand-red" />
              <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Staff Directory
              </span>
            </div>
            <h2 className="text-[38px] font-semibold leading-none tracking-[-0.03em] text-slate-900">
              Staff
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-500">
              View all Admins, Team Leads, and Employees in one clean directory.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
                Team members
              </h3>
              <p className="mt-1 text-[14px] text-slate-500">
                Review employee details, roles, departments, and current status.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
              {loading ? 'Loading' : `${rows.length} members`}
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-white">
              <tr className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <th className="min-w-[240px] px-6 py-4">Name</th>
                <th className="min-w-[120px] px-4 py-4">Emp ID</th>
                <th className="min-w-[140px] px-4 py-4">Role</th>
                <th className="min-w-[160px] px-4 py-4">Designation</th>
                <th className="min-w-[160px] px-4 py-4">Department</th>
                <th className="min-w-[220px] px-4 py-4">Email</th>
                <th className="min-w-[140px] px-4 py-4">Phone</th>
                <th className="min-w-[120px] px-4 py-4">Status</th>
                <th className="w-[130px] px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <StaffTableSkeleton rows={6} />
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-[15px] text-slate-500" colSpan={9}>
                    No staff found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const editable = canEditRow(row);
                  const avatarSrc =
                    resolveAvatarUrl(row.avatar) ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                      (row.empName || 'User').replace(/\s/g, ''),
                    )}`;

                  return (
                    <tr
                      key={row._id}
                      className="border-b border-slate-100 transition hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-sm">
                            <img
                              src={avatarSrc}
                              alt={row.empName}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-semibold text-slate-900">
                              {row.empName}
                            </div>
                            <div className="mt-0.5 text-[12px] text-slate-500">
                              {row.designation || 'Team member'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[13px] font-medium text-slate-700">
                        {row.empId}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${getRoleBadgeClass(
                            row.role,
                          )}`}
                        >
                          {formatRoleLabel(row.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[13px] text-slate-700">
                        {row.designation || '--'}
                      </td>
                      <td className="px-4 py-4 text-[13px] text-slate-700">
                        {row.department || '--'}
                      </td>
                      <td className="px-4 py-4 text-[13px] text-slate-700">
                        {row.email || '--'}
                      </td>
                      <td className="px-4 py-4 text-[13px] text-slate-700">
                        {row.phone || '--'}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${getStatusBadgeClass(
                            row.status,
                          )}`}
                        >
                          {row.status || '--'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editable ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(row)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            {canDeleteRow(row) && (
                              <button
                                type="button"
                                onClick={() => setDeleting(row)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm transition hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">View only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="mb-6">
              <h3 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
                Edit staff
              </h3>
              <p className="mt-1 text-[14px] text-slate-500">
                Update employee information while keeping the existing access rules intact.
              </p>
            </div>

            <div className="space-y-4">
              {!(backendEmpId && editing.empId === backendEmpId && !isAdmin && !isTeamLead) && (
                <>
                  <div>
                    <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                      Name
                    </label>
                    <input
                      value={editDraft.empName || ''}
                      onChange={(e) =>
                        setEditDraft((prev) => ({ ...prev, empName: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                        Designation
                      </label>
                      <input
                        value={editDraft.designation || ''}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, designation: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                        Department
                      </label>
                      <input
                        value={editDraft.department || ''}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, department: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                        Email
                      </label>
                      <input
                        value={editDraft.email || ''}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                        Phone
                      </label>
                      <input
                        value={editDraft.phone || ''}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                        Status
                      </label>
                      <select
                        value={editDraft.status || 'active'}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, status: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    {isAdmin && (
                      <div>
                        <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                          Role
                        </label>
                        <select
                          value={editDraft.role || 'EMPLOYEE'}
                          onChange={(e) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              role: e.target.value as BackendRole,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                        >
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="TEAM_LEAD">TEAM_LEAD</option>
                          <option value="EMPLOYEE">EMPLOYEE</option>
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                  New password
                </label>
                <input
                  type="password"
                  value={(editDraft as any).password || ''}
                  onChange={(e) =>
                    setEditDraft((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder={
                    backendEmpId && editing.empId === backendEmpId && !isAdmin && !isTeamLead
                      ? 'Enter your new password'
                      : 'Leave blank to keep existing password'
                  }
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setEditDraft({});
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-brand-red px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-navy"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <h3 className="mb-2 text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
              Delete staff
            </h3>
            <p className="mb-6 text-[14px] leading-6 text-slate-600">
              Are you sure you want to delete &quot;{deleting.empName}&quot; ({deleting.empId})?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-full bg-brand-red px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-navy"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffView;
