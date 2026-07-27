import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Eye,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { ThemedDatePicker, ThemedSelect } from '../spaces/SpacesFormControls';
import { getDailyDate, getWeekPlan, isSameCalendarDate } from './visionPlanningHelpers';

const VisionDayStagePanel = ({
  selectedWeek,
  selectedMonth,
  selectedQuarter,
  selectedYear,
  selectedDay,
  selectedDayIndex,
  activeDayId,
  setActiveDayId,
  today,
  me,
  isAdmin,
  taskError,
  selectedDayTasks,
  assignableEmployees,
  updateTaskStatus,
  openTaskMenuId,
  setOpenTaskMenuId,
  openTaskEditor,
  deleteTaskFromDay,
  deletingTaskId,
  openTaskViewer,
  showTaskComposer,
  setShowTaskComposer,
  setTaskDraftByDay,
  setEditingTaskId,
  setTaskError,
  editingTask,
  closeTaskComposer,
  selectedTaskDraft,
  updateSelectedDayTaskDraft,
  taskAssigneeOptions,
  taskPriorityOptions,
  taskStatusOptions,
  setTaskDocumentByDay,
  selectedTaskDocument,
  editingTaskDocumentUrl,
  editingTaskDocumentName,
  savingTaskDayId,
  uploadingTaskDocument,
  createTaskForSelectedDay,
  viewingTask,
  setViewingTaskId,
}) => {
  if (!selectedWeek) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm text-slate-500">
        Choose a week first to open the daily execution board.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-900">Task Assignment</p>
            <Link
              to="#"
              onClick={(event) => {
                event.preventDefault();
                if (!selectedDay) return;
                setTaskDraftByDay((prev) => ({
                  ...prev,
                  [selectedDay.id]: prev[selectedDay.id] || {
                    title: selectedDay.text || '',
                    description: `Created from Daily plan: ${selectedWeek.text || 'Weekly Goal'}`,
                    assigneeId: me.empId || '',
                    dueDate: '',
                    priority: 'medium',
                    status: 'todo',
                  },
                }));
                setEditingTaskId('');
                setOpenTaskMenuId('');
                setTaskError('');
                setShowTaskComposer(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              <Plus size={14} />
              Add Task
            </Link>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {selectedWeek.days.map((day, index) => {
              const weekPlan = getWeekPlan(selectedWeek.slotIndex, selectedMonth.timeline, selectedQuarter.timeline);
              const dayDate = weekPlan?.days?.[index] || null;
              const dateLabel = getDailyDate(index + 1, selectedWeek.slotIndex, selectedMonth.timeline, selectedQuarter.timeline);
              const [weekday, rest] = String(dateLabel).split(',');
              const isActive = (activeDayId || selectedWeek.days[0]?.id) === day.id;
              const isToday = !!dayDate && isSameCalendarDate(dayDate, today);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setActiveDayId(day.id)}
                  className={`rounded-md border px-4 py-2 text-left transition ${
                    isActive
                      ? 'border-brand-red bg-red-50 text-brand-red shadow-sm ring-1 ring-red-100'
                      : isToday
                        ? 'border-red-200 bg-gradient-to-br from-red-50 to-amber-50 text-brand-red shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide">{(weekday || '').trim()}</div>
                  <div className="text-xs mt-0.5">{(rest || '').trim()}</div>
                  {isToday ? <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em]">Today</div> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {selectedDay ? (
      <div className="grid max-w-6xl gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tasks on selected date</div>
            {taskError ? (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
                {taskError}
              </div>
            ) : null}
            <div className="mt-4 max-w-[980px] space-y-3">
              {selectedDayTasks.length ? (
                selectedDayTasks.map((task) => {
                  const status = String(task.status || 'todo').toLowerCase();
                  const priority = String(task.priority || 'medium').toLowerCase();
                  const assignee = assignableEmployees.find((emp) => emp.empId === task.assigneeId);
                  const descriptionText = String(task.description || '').trim();
                  const documentUrl = String(task.documentUrl || '').trim();
                  const documentName = String(task.documentName || '').trim() || 'View document';
                  const createdByLabel = String(task.createdByName || task.createdByEmpId || task.createdBy || '').trim() || '—';
                  const statusLabel =
                    status === 'todo'
                      ? 'To Do'
                      : status === 'doing'
                        ? 'Doing'
                        : status === 'review'
                          ? 'Review'
                          : status === 'blocked'
                            ? 'Blocked'
                            : status === 'done'
                              ? 'Done'
                              : String(task.status || 'To Do');
                  const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);
                  const statusPillClass =
                    status === 'done'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : status === 'blocked'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : status === 'review'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : status === 'doing'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200';
                  const priorityPillClass =
                    priority === 'high'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : priority === 'low'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200';
                  return (
                    <div key={task.taskId} className="mr-auto w-full max-w-[620px] rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:w-fit sm:min-w-[520px]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <button
                            type="button"
                            onClick={() => updateTaskStatus(task, status !== 'done')}
                            className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                            aria-label={status === 'done' ? 'Mark as not done' : 'Mark as done'}
                          >
                            {status === 'done' ? (
                              <CheckCircle2 size={18} className="text-emerald-600" />
                            ) : (
                              <Circle size={18} className="text-slate-400" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className={`text-sm font-semibold ${status === 'done' ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>
                                  {task.title || 'Untitled task'}
                                </div>
                                {descriptionText ? (
                                  <p className="mt-1 overflow-hidden text-xs leading-5 text-slate-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                                    {descriptionText}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusPillClass}`}>
                                  {statusLabel}
                                </span>
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityPillClass}`}>
                                  {priorityLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {isAdmin ? (
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setOpenTaskMenuId((current) => (current === task.taskId ? '' : task.taskId))}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                              aria-label="Task actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {openTaskMenuId === task.taskId ? (
                              <div className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
                                <button
                                  type="button"
                                  onClick={() => openTaskEditor(task)}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                >
                                  <Pencil size={14} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteTaskFromDay(task)}
                                  disabled={deletingTaskId === task.taskId}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Trash2 size={14} />
                                  {deletingTaskId === task.taskId ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div className="grid max-w-[360px] grid-cols-1 gap-2.5 text-xs text-slate-500">
                          <div className="flex items-start gap-2">
                            <span className="min-w-[74px] font-semibold text-slate-600">Assignee:</span>
                            <span>{assignee?.empName || task.assigneeId || 'Unassigned'}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="min-w-[74px] font-semibold text-slate-600">Due:</span>
                            <span>{String(task.dueDate || '').trim() || 'Not set'}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="min-w-[74px] font-semibold text-slate-600">Created by:</span>
                            <span>{createdByLabel}</span>
                          </div>
                        </div>
                        <div className="flex min-w-[160px] shrink-0 flex-col items-end gap-3">
                          {documentUrl ? (
                            <a
                              href={documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Paperclip size={14} className="shrink-0 text-slate-500" />
                              <span className="max-w-[180px] truncate">{documentName}</span>
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openTaskViewer(task)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                          >
                            <Eye size={14} />
                           
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-slate-500">No tasks for this date yet. Click Add Task to create one.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {showTaskComposer && selectedDay ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-[56rem] rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl md:p-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <p className="text-[1.75rem] font-semibold leading-none text-slate-900">{editingTask ? 'Edit task' : 'Add task'}</p>
                <p className="text-[13px] text-slate-500">
                  {getDailyDate(selectedDayIndex + 1, selectedWeek.slotIndex, selectedMonth.timeline, selectedQuarter.timeline)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeTaskComposer}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Title</label>
                <input
                  type="text"
                  value={selectedTaskDraft.title}
                  onChange={(event) => updateSelectedDayTaskDraft({ title: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Description</label>
                <textarea
                  value={selectedTaskDraft.description}
                  onChange={(event) => updateSelectedDayTaskDraft({ description: event.target.value })}
                  rows={2}
                  className="w-full min-h-[72px] rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
                  placeholder="Add task description..."
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Assignee</label>
                  <ThemedSelect
                    value={selectedTaskDraft.assigneeId}
                    onChange={(value) => updateSelectedDayTaskDraft({ assigneeId: value })}
                    options={taskAssigneeOptions}
                    placeholder="Select assignee"
                    compact={true}
                    fullWidthCompact={true}
                    denseMenu={true}
                    forceOpenDown={true}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Due date</label>
                  <ThemedDatePicker
                    value={selectedTaskDraft.dueDate}
                    onChange={(value) => updateSelectedDayTaskDraft({ dueDate: value })}
                    compact={true}
                    fullWidthCompact={true}
                    forceOpenDown={true}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Priority</label>
                  <ThemedSelect
                    value={selectedTaskDraft.priority}
                    onChange={(value) => updateSelectedDayTaskDraft({ priority: value })}
                    options={taskPriorityOptions}
                    compact={true}
                    fullWidthCompact={true}
                    denseMenu={true}
                    forceOpenDown={true}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Status</label>
                  <ThemedSelect
                    value={selectedTaskDraft.status}
                    onChange={(value) => updateSelectedDayTaskDraft({ status: value })}
                    options={taskStatusOptions}
                    compact={true}
                    fullWidthCompact={true}
                    denseMenu={true}
                    forceOpenDown={true}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Document</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                  onChange={(event) =>
                    setTaskDocumentByDay((prev) => ({
                      ...prev,
                      [selectedDay.id]: event.target.files?.[0] || null,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-1 file:text-[12px] file:font-semibold file:text-brand-red"
                />
                {selectedTaskDocument ? (
                  <p className="mt-1 text-[11px] text-slate-500 truncate">{selectedTaskDocument.name}</p>
                ) : editingTaskDocumentUrl ? (
                  <a
                    href={editingTaskDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[11px] font-medium text-slate-500 transition hover:text-slate-900"
                  >
                    <Paperclip size={12} />
                    <span className="truncate">{editingTaskDocumentName}</span>
                  </a>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={closeTaskComposer}
                className="rounded-full border border-slate-200 px-5 py-2 text-[14px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createTaskForSelectedDay}
                disabled={savingTaskDayId === selectedDay.id || uploadingTaskDocument || !selectedTaskDraft.title.trim()}
                className="rounded-full bg-brand-red px-6 py-2 text-[14px] font-semibold text-white transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadingTaskDocument ? 'Uploading...' : savingTaskDayId === selectedDay.id ? 'Saving...' : editingTask ? 'Save Changes' : 'Save Task'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {viewingTask ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <p className="text-[1.65rem] font-semibold leading-none text-slate-900">{viewingTask.title || 'Untitled task'}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    {String(viewingTask.status || 'todo').toLowerCase() === 'todo'
                      ? 'To Do'
                      : String(viewingTask.status || 'todo').toLowerCase() === 'doing'
                        ? 'Doing'
                        : String(viewingTask.status || 'todo').toLowerCase() === 'review'
                          ? 'Review'
                          : String(viewingTask.status || 'todo').toLowerCase() === 'blocked'
                            ? 'Blocked'
                            : String(viewingTask.status || 'todo').toLowerCase() === 'done'
                              ? 'Done'
                              : String(viewingTask.status || 'To Do')}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                    {String(viewingTask.priority || 'medium').charAt(0).toUpperCase() + String(viewingTask.priority || 'medium').slice(1)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingTaskId('')}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Description</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {String(viewingTask.description || '').trim() || 'No description added for this task.'}
                </p>
              </div>
              <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Assignee</span>
                  <p className="mt-1 font-medium text-slate-900">
                    {assignableEmployees.find((emp) => emp.empId === viewingTask.assigneeId)?.empName || viewingTask.assigneeId || 'Unassigned'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Due date</span>
                  <p className="mt-1 font-medium text-slate-900">{String(viewingTask.dueDate || '').trim() || 'Not set'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Created by</span>
                  <p className="mt-1 font-medium text-slate-900">
                    {String(viewingTask.createdByName || viewingTask.createdByEmpId || viewingTask.createdBy || '').trim() || '—'}
                  </p>
                </div>
              </div>
              {String(viewingTask.documentUrl || '').trim() ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Document</div>
                  <a
                    href={String(viewingTask.documentUrl || '').trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Paperclip size={15} className="shrink-0 text-slate-500" />
                    <span className="truncate">{String(viewingTask.documentName || '').trim() || 'View document'}</span>
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VisionDayStagePanel;
