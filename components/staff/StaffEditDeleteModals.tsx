import React from 'react';
import { type BackendRole, type EmployeeRow } from './staffViewHelpers';

type StaffEditDeleteModalsProps = { ctx: Record<string, any> };

const StaffEditDeleteModals: React.FC<StaffEditDeleteModalsProps> = ({ ctx }) => {
  const {
    editing,
    setEditing,
    editDraft,
    setEditDraft,
    backendEmpId,
    isAdmin,
    isTeamLead,
    handleSave,
    deleting,
    setDeleting,
    handleDelete,
  } = ctx;

  return (
    <>
{editing && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
    <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
      <div className="mb-6">
        <h3 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">Edit staff</h3>
        <p className="mt-1 text-[14px] text-slate-500">
          Update employee information while keeping the existing access rules intact.
        </p>
      </div>

      <div className="space-y-4">
        {!(backendEmpId && editing.empId === backendEmpId && !isAdmin && !isTeamLead) && (
          <>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-slate-700">Name</label>
              <input
                value={editDraft.empName || ''}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, empName: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">Designation</label>
                <input
                  value={editDraft.designation || ''}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, designation: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">Department</label>
                <input
                  value={editDraft.department || ''}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, department: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">Email</label>
                <input
                  value={editDraft.email || ''}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">Phone</label>
                <input
                  value={editDraft.phone || ''}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">Status</label>
                <select
                  value={editDraft.status || 'active'}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {isAdmin && (
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-slate-700">Role</label>
                  <select
                    value={editDraft.role || 'EMPLOYEE'}
                    onChange={(e) =>
                      setEditDraft((prev) => ({ ...prev, role: e.target.value as BackendRole }))
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
          <label className="mb-1 block text-[13px] font-semibold text-slate-700">New password</label>
          <input
            type="password"
            value={(editDraft as any).password || ''}
            onChange={(e) => setEditDraft((prev) => ({ ...prev, password: e.target.value }))}
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
      <h3 className="mb-2 text-[22px] font-semibold tracking-[-0.02em] text-slate-900">Delete staff</h3>
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
    </>
  );
};

export default StaffEditDeleteModals;
