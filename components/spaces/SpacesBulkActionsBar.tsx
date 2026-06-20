import React from 'react';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';
import { ThemedDatePicker, ThemedSelect } from './SpacesFormControls';

type SpacesBulkActionsBarProps = Pick<
  SpacesViewController,
  | 'canBulkManageTasks'
  | 'mode'
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
  | 'bulkAssigneeOptions'
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

const REMINDER_OPTIONS = [
  { value: '1', label: 'Every 1 hour' },
  { value: '6', label: 'Every 6 hours' },
  { value: '12', label: 'Every 12 hours' },
  { value: '24', label: 'Every 24 hours' },
  { value: '48', label: 'Every 2 days' },
  { value: '168', label: 'Every 7 days' },
];

const fieldChipClass = (active: boolean) =>
  `inline-flex h-10 min-w-[72px] items-center justify-center rounded-xl border px-3 text-[12px] font-semibold ${
    active
      ? 'border-red-200 bg-red-50 text-brand-red shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
      : 'border-slate-200 bg-slate-50 text-slate-400'
  }`;

const SpacesBulkActionsBar: React.FC<SpacesBulkActionsBarProps> = ({
  canBulkManageTasks,
  mode,
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
  bulkAssigneeOptions,
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

  const hasPendingChanges = Boolean(bulkTouched?.status || bulkTouched?.assigneeId || bulkTouched?.dueDate);

  return (
    <div className="sticky top-0 z-30 overflow-hidden rounded-3xl border border-red-100/90 bg-gradient-to-br from-white via-red-50/35 to-white px-4 py-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:px-5">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-red-200/70 to-transparent" />

      <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-red to-rose-600 text-sm font-bold text-white shadow-[0_8px_20px_rgba(220,38,38,0.28)]">
            {selectedTaskCount}
          </div>
          <div>
            <div className="text-[14px] font-semibold text-slate-900">Selected tasks</div>
            <div className="text-[12px] text-slate-500">
              {selectedTaskCount === 1
                ? 'Showing current values for the selected task. Edit a field, then Save.'
                : 'Apply changes to all selected rows.'}
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(150px,1fr)_auto_minmax(170px,1fr)_auto_minmax(150px,1fr)_auto_auto_auto] md:items-center">
          <ThemedSelect
            value={bulkStatus}
            onChange={(value) => {
              setBulkStatus(value);
              setBulkTouched((prev: any) => ({ ...prev, status: true }));
            }}
            options={statusOptions}
            disabled={bulkSaving}
            compact
            fullWidthCompact
          />
          <div className={fieldChipClass(Boolean(bulkTouched?.status))}>Status</div>

          <ThemedSelect
            value={bulkAssigneeId}
            onChange={(value) => {
              setBulkAssigneeId(value);
              setBulkTouched((prev: any) => ({ ...prev, assigneeId: true }));
            }}
            options={bulkAssigneeOptions}
            disabled={bulkSaving || employeesLoading}
            compact
            fullWidthCompact
          />
          <div className={fieldChipClass(Boolean(bulkTouched?.assigneeId))}>Assignee</div>

          <ThemedDatePicker
            value={bulkDueDate}
            onChange={(value) => {
              setBulkDueDate(value);
              setBulkTouched((prev: any) => ({ ...prev, dueDate: true }));
            }}
            disabled={bulkSaving}
            compact
            fullWidthCompact
          />
          <div className={fieldChipClass(Boolean(bulkTouched?.dueDate))}>Due date</div>

          <button
            type="button"
            onClick={clearSelectedTasks}
            disabled={bulkSaving}
            className="h-10 rounded-xl border border-red-100 bg-white px-3 text-[12px] font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear
          </button>
          <div className="hidden h-10 w-px bg-red-200 md:block" />
          <button
            type="button"
            onClick={saveBulkTaskChanges}
            disabled={bulkSaving || !hasPendingChanges}
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

      {mode !== 'employee' ? (
        <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-red-100/80 pt-4">
          <span className="text-[12px] font-semibold text-slate-700">Checklist reminder gap</span>
          <div className="min-w-[160px]">
            <ThemedSelect
              value={bulkReminderIntervalHours}
              onChange={setBulkReminderIntervalHours}
              options={REMINDER_OPTIONS}
              disabled={bulkSaving}
              compact
              fullWidthCompact
            />
          </div>
          <button
            type="button"
            onClick={sendSelectedTaskChecklist}
            disabled={bulkSaving}
            className="h-10 rounded-xl bg-emerald-600 px-4 text-[12px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bulkSaving ? 'Sending...' : 'Send checklist email'}
          </button>
          {checklistNotice ? <span className="text-[12px] font-medium text-emerald-700">{checklistNotice}</span> : null}
        </div>
      ) : null}
    </div>
  );
};

export default SpacesBulkActionsBar;
