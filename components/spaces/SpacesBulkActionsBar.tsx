import React from 'react';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';

type SpacesBulkActionsBarProps = Pick<
  SpacesViewController,
  | 'canBulkManageTasks'
  | 'selectedTaskCount'
  | 'bulkStatus'
  | 'setBulkStatus'
  | 'bulkTouched'
  | 'setBulkTouched'
  | 'bulkSaving'
  | 'statusOptions'
  | 'bulkAssigneeId'
  | 'setBulkAssigneeId'
  | 'employeesLoading'
  | 'assignableEmployees'
  | 'me'
  | 'bulkDueDate'
  | 'setBulkDueDate'
  | 'clearSelectedTasks'
  | 'saveBulkTaskChanges'
  | 'setDeleteTaskModal'
  | 'setBulkDeleteTaskModalOpen'
  | 'bulkReminderIntervalHours'
  | 'setBulkReminderIntervalHours'
  | 'sendSelectedTaskChecklist'
  | 'checklistNotice'
>;

const SpacesBulkActionsBar: React.FC<SpacesBulkActionsBarProps> = ({
  canBulkManageTasks,
  selectedTaskCount,
  bulkStatus,
  setBulkStatus,
  bulkTouched,
  setBulkTouched,
  bulkSaving,
  statusOptions,
  bulkAssigneeId,
  setBulkAssigneeId,
  employeesLoading,
  assignableEmployees,
  me,
  bulkDueDate,
  setBulkDueDate,
  clearSelectedTasks,
  saveBulkTaskChanges,
  setDeleteTaskModal,
  setBulkDeleteTaskModalOpen,
  bulkReminderIntervalHours,
  setBulkReminderIntervalHours,
  sendSelectedTaskChecklist,
  checklistNotice,
}) => {
  if (!canBulkManageTasks || selectedTaskCount <= 0) return null;

  return (
    <div className="sticky top-0 z-30 rounded-2xl border border-red-100 bg-red-50/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-red text-sm font-semibold text-white">
            {selectedTaskCount}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-slate-900">Selected tasks</div>
            <div className="text-[12px] text-slate-500">Apply changes to all selected rows.</div>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(150px,1fr)_auto_minmax(170px,1fr)_auto_minmax(150px,1fr)_auto_auto_auto] md:items-center">
          <select
            value={bulkStatus}
            onChange={(event) => {
              setBulkStatus(event.target.value);
              setBulkTouched((prev: any) => ({ ...prev, status: true }));
            }}
            disabled={bulkSaving}
            className="h-10 rounded-xl border border-red-100 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 disabled:opacity-60"
          >
            {statusOptions.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className={`h-10 rounded-xl border px-3 py-2 text-[12px] font-semibold ${bulkTouched?.status ? 'border-red-200 bg-red-100 text-brand-red' : 'border-slate-200 bg-white text-slate-400'}`}>
            Status
          </div>
          <select
            value={bulkAssigneeId}
            onChange={(event) => {
              setBulkAssigneeId(event.target.value);
              setBulkTouched((prev: any) => ({ ...prev, assigneeId: true }));
            }}
            disabled={bulkSaving || employeesLoading}
            className="h-10 rounded-xl border border-red-100 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 disabled:opacity-60"
          >
            <option value="">Unassigned</option>
            {assignableEmployees.map((employee: any) => (
              <option key={employee.empId} value={employee.empId}>
                {employee.empId === me.id ? `${employee.empName} (You)` : employee.empName || employee.empId}
              </option>
            ))}
          </select>
          <div className={`h-10 rounded-xl border px-3 py-2 text-[12px] font-semibold ${bulkTouched?.assigneeId ? 'border-red-200 bg-red-100 text-brand-red' : 'border-slate-200 bg-white text-slate-400'}`}>
            Assignee
          </div>
          <input
            type="date"
            value={bulkDueDate}
            onChange={(event) => {
              setBulkDueDate(event.target.value);
              setBulkTouched((prev: any) => ({ ...prev, dueDate: true }));
            }}
            disabled={bulkSaving}
            className="h-10 rounded-xl border border-red-100 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 disabled:opacity-60"
          />
          <div className={`h-10 rounded-xl border px-3 py-2 text-[12px] font-semibold ${bulkTouched?.dueDate ? 'border-red-200 bg-red-100 text-brand-red' : 'border-slate-200 bg-white text-slate-400'}`}>
            Due date
          </div>
          <button type="button" onClick={clearSelectedTasks} disabled={bulkSaving} className="h-10 rounded-xl border border-red-100 bg-white px-3 text-[12px] font-semibold text-slate-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
            Clear
          </button>
          <div className="hidden h-10 w-px bg-red-200 md:block" />
          <button
            type="button"
            onClick={saveBulkTaskChanges}
            disabled={bulkSaving || !bulkTouched || (!bulkTouched.status && !bulkTouched.assigneeId && !bulkTouched.dueDate)}
            className="h-10 rounded-xl bg-slate-900 px-4 text-[12px] font-semibold text-white transition hover:bg-brand-red disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bulkSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteTaskModal(null);
              setBulkDeleteTaskModalOpen(true);
            }}
            disabled={bulkSaving}
            className="h-10 rounded-xl bg-brand-red px-3 text-[12px] font-semibold text-white transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-red-100 pt-3">
        <span className="text-[12px] font-semibold text-slate-700">Checklist reminder gap</span>
        <select
          value={bulkReminderIntervalHours}
          onChange={(event) => setBulkReminderIntervalHours(event.target.value)}
          disabled={bulkSaving}
          className="h-10 rounded-xl border border-red-100 bg-white px-3 text-[13px] text-slate-700"
        >
          <option value="1">Every 1 hour</option>
          <option value="6">Every 6 hours</option>
          <option value="12">Every 12 hours</option>
          <option value="24">Every 24 hours</option>
          <option value="48">Every 2 days</option>
          <option value="168">Every 7 days</option>
        </select>
        <button
          type="button"
          onClick={sendSelectedTaskChecklist}
          disabled={bulkSaving}
          className="h-10 rounded-xl bg-emerald-600 px-4 text-[12px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {bulkSaving ? 'Sending...' : 'Send checklist email'}
        </button>
        {checklistNotice ? <span className="text-[12px] text-emerald-700">{checklistNotice}</span> : null}
      </div>
    </div>
  );
};

export default SpacesBulkActionsBar;
