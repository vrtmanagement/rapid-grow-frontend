import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Paperclip, Plus, X } from 'lucide-react';
import { FileDropZone } from '../ui/FileDropZone';
import { CREATE_INPUT_CLASS, ThemedSelect } from './SpacesFormControls';
import {
  buildMonthGoalContextFromKeys,
  CalendarMonth,
  getDaysForWeek,
  getPlanableCalendarMonths,
  getWeeksForMonth,
  MonthGoalTaskDraft,
  validateMonthGoalTaskDraft,
} from './monthGoalsHelpers';
import type { MonthGoalContext } from './monthGoalsHelpers';

export type CreateMonthGoalTaskPayload = {
  title: string;
  description: string;
  assigneeId: string;
  taskDocumentFile: File | null;
  context: MonthGoalContext;
};

type SpacesMonthGoalAddFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateMonthGoalTaskPayload) => Promise<void>;
  canPickSchedule: boolean;
  canPickAssignee: boolean;
  employeeId: string;
  allowedAssigneeIds: Set<string>;
  createAssigneeOptions: Array<{ value: string; label: string }>;
  employeesLoading: boolean;
  assignmentHint?: string;
  saving: boolean;
  uploadingDocument: boolean;
  initialMonthKey?: string;
  initialWeekKey?: string;
};

const SpacesMonthGoalAddForm: React.FC<SpacesMonthGoalAddFormProps> = ({
  open,
  onClose,
  onSubmit,
  canPickSchedule,
  canPickAssignee,
  employeeId,
  allowedAssigneeIds,
  createAssigneeOptions,
  employeesLoading,
  assignmentHint,
  saving,
  uploadingDocument,
  initialMonthKey,
  initialWeekKey,
}) => {
  const planableMonths = useMemo(() => getPlanableCalendarMonths(), []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState(employeeId);
  const [taskDocumentFile, setTaskDocumentFile] = useState<File | null>(null);
  const [monthKey, setMonthKey] = useState('');
  const [weekKey, setWeekKey] = useState('');
  const [dayKey, setDayKey] = useState('');
  const [formError, setFormError] = useState('');

  const selectedMonth = useMemo(
    () => planableMonths.find((month) => month.key === monthKey) || planableMonths[0] || null,
    [monthKey, planableMonths],
  );

  const weekOptions = useMemo(() => {
    if (!selectedMonth) return [];
    return getWeeksForMonth(selectedMonth).map((week) => ({
      value: week.key,
      label: week.label,
    }));
  }, [selectedMonth]);

  const dayOptions = useMemo(() => {
    if (!selectedMonth || !weekKey) return [];
    const week = getWeeksForMonth(selectedMonth).find((item) => item.key === weekKey);
    if (!week) return [];
    return getDaysForWeek(week).map((day) => ({
      value: day.key,
      label: `${day.label}, ${day.dateLabel}`,
    }));
  }, [selectedMonth, weekKey]);

  const assigneeOptions = useMemo(() => {
    if (canPickAssignee) {
      return createAssigneeOptions.filter((option) => option.value !== '');
    }
    const selfOption = createAssigneeOptions.find((option) => option.value === employeeId);
    return [{ value: employeeId, label: selfOption?.label || 'You' }];
  }, [canPickAssignee, createAssigneeOptions, employeeId]);

  const scheduleSummary = useMemo(() => {
    if (!selectedMonth) return 'Select month, week, and day';
    const week = getWeeksForMonth(selectedMonth).find((item) => item.key === weekKey);
    const day = week ? getDaysForWeek(week).find((item) => item.key === dayKey) : null;
    return [selectedMonth.label, week?.label, day ? `${day.label}, ${day.dateLabel}` : '']
      .filter(Boolean)
      .join(' · ');
  }, [selectedMonth, weekKey, dayKey]);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setAssigneeId(canPickAssignee ? '' : employeeId);
    setTaskDocumentFile(null);
    setFormError('');
    const month = initialMonthKey || planableMonths[0]?.key || '';
    setMonthKey(month);
    const monthObj = planableMonths.find((item) => item.key === month) || planableMonths[0];
    if (monthObj) {
      const weeks = getWeeksForMonth(monthObj);
      const today = new Date();
      const week =
        weeks.find((item) => item.key === initialWeekKey) ||
        weeks.find((item) => today >= item.startDate && today <= item.endDate) ||
        weeks[0];
      setWeekKey(week?.key || '');
      const days = week ? getDaysForWeek(week) : [];
      const day =
        (initialWeekKey
          ? days[0]
          : days.find((item) => item.date.toDateString() === today.toDateString())) || days[0];
      setDayKey(day?.key || '');
    } else {
      setWeekKey('');
      setDayKey('');
    }
  }, [open, canPickAssignee, employeeId, initialMonthKey, initialWeekKey, planableMonths]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving && !uploadingDocument) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, saving, uploadingDocument]);

  useEffect(() => {
    if (!open || !selectedMonth) return;
    const weeks = getWeeksForMonth(selectedMonth);
    if (!weeks.some((week) => week.key === weekKey)) {
      const firstWeek = weeks[0];
      setWeekKey(firstWeek?.key || '');
      const firstDay = firstWeek ? getDaysForWeek(firstWeek)[0] : null;
      setDayKey(firstDay?.key || '');
    }
  }, [open, selectedMonth, weekKey]);

  useEffect(() => {
    if (!open || !selectedMonth || !weekKey) return;
    const week = getWeeksForMonth(selectedMonth).find((item) => item.key === weekKey);
    if (!week) return;
    const days = getDaysForWeek(week);
    if (!days.some((day) => day.key === dayKey)) {
      setDayKey(days[0]?.key || '');
    }
  }, [open, selectedMonth, weekKey, dayKey]);

  useEffect(() => {
    if (!open) return undefined;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  const monthOptions = useMemo(
    () =>
      planableMonths.map((month: CalendarMonth) => ({
        value: month.key,
        label: `${month.label} ${month.yearLabel}`,
      })),
    [planableMonths],
  );

  const handleSubmit = async () => {
    setFormError('');

    const draft: MonthGoalTaskDraft = {
      title,
      description,
      assigneeId: canPickAssignee ? assigneeId : employeeId,
      taskDocumentFile,
      monthKey,
      weekKey,
      dayKey,
    };

    const errors = validateMonthGoalTaskDraft(draft, {
      canPickSchedule: true,
      canPickAssignee,
      employeeId,
      allowedAssigneeIds,
    });
    if (errors.length) {
      setFormError(errors[0]);
      return;
    }

    const context = buildMonthGoalContextFromKeys(monthKey, weekKey, dayKey);
    if (!context) {
      setFormError('Could not resolve the planning schedule for this task.');
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        assigneeId: canPickAssignee ? assigneeId : employeeId,
        taskDocumentFile,
        context,
      });
      onClose();
    } catch (e: any) {
      setFormError(e?.message || 'Failed to create month goal task.');
    }
  };

  if (!open) return null;

  const handleClose = () => {
    if (saving || uploadingDocument) return;
    onClose();
  };

  return createPortal(
    <>
      <style>{`
        @keyframes spacesMonthGoalDrawerBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spacesMonthGoalDrawerSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .spaces-month-goal-drawer-backdrop,
          .spaces-month-goal-drawer-panel {
            animation-duration: 1ms !important;
          }
        }
      `}</style>
      <div
        className="spaces-month-goal-drawer-backdrop fixed inset-0 z-[200] bg-slate-950/35 backdrop-blur-[2px]"
        style={{ animation: 'spacesMonthGoalDrawerBackdropIn 180ms ease-out both' }}
        aria-hidden
        onClick={handleClose}
      />
      <div
        className="spaces-month-goal-drawer-panel fixed inset-y-0 right-0 z-[201] flex h-full w-full max-w-[760px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
        style={{ animation: 'spacesMonthGoalDrawerSlideIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spaces-month-goal-drawer-title"
      >
          <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">Month Goals</div>
              <h3 id="spaces-month-goal-drawer-title" className="mt-1 text-[30px] font-semibold leading-none text-slate-900">Add Monthly Goal</h3>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close month goal form"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3.5">
            <div className="space-y-3">
              {formError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{formError}</div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_300px]">
                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Task Name *</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={CREATE_INPUT_CLASS}
                      placeholder="Enter task name"
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={saving}
                      placeholder="Add task description..."
                      className="min-h-[126px] w-full rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-[15px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Document / Attachments</label>
                    <FileDropZone
                      as="label"
                      multiple={false}
                      disabled={saving || uploadingDocument}
                      className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-red-200 bg-slate-50/70 px-5 text-center transition hover:bg-red-50/50"
                      overlayTitle="Drop document here"
                      overlayHint="PDF, DOCX, JPG, PNG, WEBP · max 10 MB"
                      onFiles={(files) => setTaskDocumentFile(files[0] || null)}
                    >
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        disabled={saving || uploadingDocument}
                        onChange={(e) => setTaskDocumentFile(e.target.files?.[0] || null)}
                      />
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                        <Paperclip size={20} />
                      </div>
                      <div className="mt-3 text-[15px] font-medium text-slate-700">
                        {taskDocumentFile ? taskDocumentFile.name : 'Click to upload or drag and drop'}
                      </div>
                      <div className="mt-1 text-[12px] text-slate-500">PDF, DOCX, JPG, PNG, WEBP · max 10 MB</div>
                    </FileDropZone>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="flex items-start gap-2">
                      <CalendarDays size={16} className="mt-0.5 shrink-0 text-brand-red" />
                      <div>
                        <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-700">Goal Schedule</div>
                        <p className="mt-1 text-[12px] leading-5 text-slate-500">
                          Pick month, week, and day for this goal task.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-3 border-t border-slate-200 pt-3">
                      <div className="rounded-2xl border border-red-100 bg-red-50/70 px-3 py-2.5">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-red">Selected</div>
                        <div className="mt-1 text-[13px] font-semibold text-slate-900">{scheduleSummary}</div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Month *</label>
                        <ThemedSelect
                          value={monthKey}
                          onChange={setMonthKey}
                          options={monthOptions}
                          compact={true}
                          fullWidthCompact={true}
                          denseMenu={true}
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Week *</label>
                        <ThemedSelect
                          value={weekKey}
                          onChange={setWeekKey}
                          options={weekOptions}
                          placeholder="Week"
                          compact={true}
                          fullWidthCompact={true}
                          denseMenu={true}
                          disabled={!weekOptions.length || saving}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Day *</label>
                        <ThemedSelect
                          value={dayKey}
                          onChange={setDayKey}
                          options={dayOptions}
                          placeholder="Day"
                          compact={true}
                          fullWidthCompact={true}
                          denseMenu={true}
                          disabled={!dayOptions.length || saving}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Assignee</label>
                    <ThemedSelect
                      value={canPickAssignee ? assigneeId : employeeId}
                      onChange={setAssigneeId}
                      options={assigneeOptions}
                      placeholder="Select assignee"
                      disabled={!canPickAssignee || employeesLoading || saving}
                    />
                    {assignmentHint ? <p className="mt-1.5 text-[11px] text-slate-500">{assignmentHint}</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-3.5 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-[15px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                saving ||
                uploadingDocument ||
                !title.trim() ||
                (canPickAssignee && !assigneeId) ||
                !monthKey ||
                !weekKey ||
                !dayKey
              }
              className={`inline-flex items-center gap-2 rounded-full bg-brand-red px-7 py-3 text-[15px] font-black text-white shadow-lg transition-colors hover:bg-brand-navy ${
                saving || uploadingDocument || !title.trim() ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <Plus size={16} />
              {uploadingDocument ? 'Uploading...' : saving ? 'Creating...' : 'Add Goal Task'}
            </button>
          </div>
        </div>
    </>,
    document.body,
  );
};

export default SpacesMonthGoalAddForm;
