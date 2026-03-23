import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { Pencil, Trash2, UserCircle } from 'lucide-react';
import { usePermissions } from '../context/PermissionContext';
import AccessDenied from '../components/AccessDenied';

type BackendRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | string;

interface EmployeeRow {
  _id: string;
  empId: string;
  empName: string;
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

  const isAdmin = backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN';
  const isTeamLead = backendRole === 'TEAM_LEAD';

  const canEditRow = (row: EmployeeRow) => {
    if (!hasPermission('EMPLOYEE_UPDATE')) return false;
    if (isAdmin) return true;
    if (isTeamLead) {
      // Team lead can edit themselves and employees
      if (backendEmpId && row.empId === backendEmpId) return true;
      return (row.role || '').toUpperCase() === 'EMPLOYEE';
    }
    // Employee can edit their own record (for password change)
    if (backendEmpId && row.empId === backendEmpId) return true;
    return false;
  };

  const canDeleteRow = (row: EmployeeRow) => {
    if (!hasPermission('EMPLOYEE_DELETE')) return false;
    if (isAdmin) return true;
    if (isTeamLead) {
      // Team lead can delete themselves and employees
      if (backendEmpId && row.empId === backendEmpId) return true;
      return (row.role || '').toUpperCase() === 'EMPLOYEE';
    }
    // Employee: allow deleting only themselves (if backend permits)
    if (backendEmpId && row.empId === backendEmpId) return true;
    return false;
  };

  const load = async () => {
    if (!hasPermission('EMPLOYEE_LIST')) return;
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
      setEditing(null);
      setEditDraft({});
    } catch (e: any) {
      setError(e?.message || 'Failed to update staff');
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
      setDeleting(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete staff');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1.5 w-8 bg-brand-red rounded-full" />
            <span className="text-[15px] text-slate-500">Staff Directory</span>
          </div>
          <h2 className="text-4xl text-slate-900 leading-none">Staff</h2>
          <p className="text-slate-500 text-lg mt-3">
            View all Admins, Team Leads, and Employees.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-[15px]">
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[12px] font-bold text-slate-600 uppercase tracking-[0.12em]">
                <th className="px-4 py-3 min-w-[200px]">Name</th>
                <th className="px-4 py-3 min-w-[120px]">Emp ID</th>
                <th className="px-4 py-3 min-w-[140px]">Role</th>
                <th className="px-4 py-3 min-w-[160px]">Designation</th>
                <th className="px-4 py-3 min-w-[160px]">Department</th>
                <th className="px-4 py-3 min-w-[200px]">Email</th>
                <th className="px-4 py-3 min-w-[140px]">Phone</th>
                <th className="px-4 py-3 min-w-[100px]">Status</th>
                <th className="px-4 py-3 w-[120px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={9}>
                    Loading staff...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-slate-500" colSpan={9}>
                    No staff found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const editable = canEditRow(row);
                  return (
                    <tr key={row._id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <UserCircle size={18} className="text-slate-400" />
                          </div>
                          <div>
                            <div className="text-[14px] font-semibold text-slate-900">
                              {row.empName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-700">{row.empId}</td>
                      <td className="px-4 py-3 text-[13px] text-slate-700">
                        {(row.role || '').toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-700">
                        {row.designation || '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-700">
                        {row.department || '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-700">
                        {row.email || '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-700">
                        {row.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px]">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold ${
                            (row.status || '').toLowerCase() === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {row.status || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editable ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(row)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            {canDeleteRow(row) && (
                              <button
                                type="button"
                                onClick={() => setDeleting(row)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-100 text-red-500 hover:bg-red-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit staff</h3>
            <div className="space-y-4">
              {!(backendEmpId && editing.empId === backendEmpId && !isAdmin && !isTeamLead) && (
                <>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                      Name
                    </label>
                    <input
                      value={editDraft.empName || ''}
                      onChange={(e) =>
                        setEditDraft((prev) => ({ ...prev, empName: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                        Designation
                      </label>
                      <input
                        value={editDraft.designation || ''}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, designation: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                        Department
                      </label>
                      <input
                        value={editDraft.department || ''}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, department: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        value={editDraft.email || ''}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                        Phone
                      </label>
                      <input
                        value={editDraft.phone || ''}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                        Status
                      </label>
                      <select
                        value={editDraft.status || 'active'}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, status: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    {isAdmin && (
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1">
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
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
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
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  New password
                </label>
                <input
                  type="password"
                  value={(editDraft as any).password || ''}
                  onChange={(e) =>
                    setEditDraft((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
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
                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete staff</h3>
            <p className="text-[14px] text-slate-600 mb-6">
              Are you sure you want to delete &quot;{deleting.empName}&quot; ({deleting.empId})?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
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

