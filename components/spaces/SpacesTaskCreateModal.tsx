import React from 'react';
import { createPortal } from 'react-dom';
import { Paperclip, Plus, X } from 'lucide-react';
import { FileDropZone } from '../ui/FileDropZone';
import { CREATE_INPUT_CLASS, ThemedDatePicker, ThemedSelect } from './SpacesFormControls';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';
import SpacesTaskPlannerFields from './SpacesTaskPlannerFields';
import SpacesTaskCreateRecurrenceFields from './SpacesTaskCreateRecurrenceFields';
import SpacesWeeklyReminderFields from './SpacesWeeklyReminderFields';
import { EMAIL_REMINDER_GAP_OPTIONS } from './spacesEmailReminderOptions';

type SpacesTaskCreateModalProps = Pick<
  SpacesViewController,
  | 'title'
  | 'setTitle'
  | 'description'
  | 'setDescription'
  | 'assigneeId'
  | 'setAssigneeId'
  | 'createAssigneeOptions'
  | 'employeesLoading'
  | 'dueDate'
  | 'setDueDate'
  | 'priority'
  | 'setPriority'
  | 'priorityOptions'
  | 'status'
  | 'setStatus'
  | 'emailChecklistEnabled'
  | 'setEmailChecklistEnabled'
  | 'emailChecklistExternalPerson'
  | 'setEmailChecklistExternalPerson'
  | 'externalAssigneeEmail'
  | 'setExternalAssigneeEmail'
  | 'externalAssigneeName'
  | 'setExternalAssigneeName'
  | 'additionalChecklistTitles'
  | 'setAdditionalChecklistTitles'
  | 'reminderIntervalHours'
  | 'setReminderIntervalHours'
  | 'repeatEveryWeek'
  | 'setRepeatEveryWeek'
  | 'repeatCadence'
  | 'setRepeatCadence'
  | 'repeatWeekDays'
  | 'setRepeatWeekDays'
  | 'repeatWeekTime'
  | 'setRepeatWeekTime'
  | 'repeatOccurrences'
  | 'setRepeatOccurrences'
  | 'taskRecurrence'
  | 'setTaskRecurrence'
  | 'statusOptions'
  | 'selectedProjectId'
  | 'setSelectedProjectId'
  | 'projectSelectOptions'
  | 'projectsLoading'
  | 'taskDocumentFile'
  | 'setTaskDocumentFile'
  | 'saving'
  | 'uploadingTaskDocument'
  | 'error'
  | 'plannerWeekOptions'
  | 'plannerDayOptions'
  | 'plannerSummary'
> & {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  canUseEmailChecklist: boolean;
  addToWeeklyPlanner: boolean;
  setAddToWeeklyPlanner: (value: boolean) => void;
  plannerWeekId: string;
  setPlannerWeekId: (value: string) => void;
  plannerDayId: string;
  setPlannerDayId: (value: string) => void;
  hideWeeklyPlanner?: boolean;
};

const SpacesTaskCreateModal: React.FC<SpacesTaskCreateModalProps> = (props) => {
  const {
    open,
    onClose,
    onSubmit,
    canUseEmailChecklist,
    title,
    setTitle,
    description,
    setDescription,
    assigneeId,
    setAssigneeId,
    createAssigneeOptions,
    employeesLoading,
    dueDate,
    setDueDate,
    priority,
    setPriority,
    priorityOptions,
    status,
    setStatus,
    emailChecklistEnabled,
    setEmailChecklistEnabled,
    emailChecklistExternalPerson,
    setEmailChecklistExternalPerson,
    externalAssigneeEmail,
    setExternalAssigneeEmail,
    externalAssigneeName,
    setExternalAssigneeName,
    additionalChecklistTitles,
    setAdditionalChecklistTitles,
    reminderIntervalHours,
    setReminderIntervalHours,
    repeatEveryWeek,
    setRepeatEveryWeek,
    repeatCadence,
    setRepeatCadence,
    repeatWeekDays,
    setRepeatWeekDays,
    repeatWeekTime,
    setRepeatWeekTime,
    repeatOccurrences,
    setRepeatOccurrences,
    taskRecurrence,
    setTaskRecurrence,
    statusOptions,
    selectedProjectId,
    setSelectedProjectId,
    projectSelectOptions,
    projectsLoading,
    taskDocumentFile,
    setTaskDocumentFile,
    saving,
    uploadingTaskDocument,
    error,
    addToWeeklyPlanner,
    setAddToWeeklyPlanner,
    plannerWeekOptions,
    plannerWeekId,
    setPlannerWeekId,
    plannerDayOptions,
    plannerDayId,
    setPlannerDayId,
    plannerSummary,
    hideWeeklyPlanner = false,
  } = props;

  const normalizedPlannerWeekOptions = React.useMemo(() => {
    const unique = new Map<string, { value: string; label: string }>();
    (plannerWeekOptions || []).forEach((option) => {
      const cleanLabel = String(option?.label || '').replace(/Â·/g, '·').trim();
      if (!cleanLabel || unique.has(cleanLabel)) return;
      unique.set(cleanLabel, { value: option.value, label: cleanLabel });
    });
    return Array.from(unique.values());
  }, [plannerWeekOptions]);

  const parsePlannerLabel = React.useCallback((label: string) => {
    const match = String(label || '').match(/(Q\d+)\s*\/\s*(M\d+)\s*\/\s*(W\d+)/i);
    return {
      quarter: match?.[1] || '',
      month: match?.[2] || '',
      week: match?.[3] || '',
    };
  }, []);

  const [plannerQuarterLabel, setPlannerQuarterLabel] = React.useState('');
  const [plannerMonthLabel, setPlannerMonthLabel] = React.useState('');

  const plannerQuarterOptions = React.useMemo(() => {
    const unique = new Map<string, { value: string; label: string }>();
    normalizedPlannerWeekOptions.forEach((option) => {
      const parsed = parsePlannerLabel(option.label);
      if (parsed.quarter && !unique.has(parsed.quarter)) {
        unique.set(parsed.quarter, { value: parsed.quarter, label: parsed.quarter });
      }
    });
    return Array.from(unique.values());
  }, [normalizedPlannerWeekOptions, parsePlannerLabel]);

  const plannerMonthOptions = React.useMemo(() => {
    const unique = new Map<string, { value: string; label: string }>();
    normalizedPlannerWeekOptions.forEach((option) => {
      const parsed = parsePlannerLabel(option.label);
      if (plannerQuarterLabel && parsed.quarter !== plannerQuarterLabel) return;
      if (parsed.month && !unique.has(parsed.month)) {
        unique.set(parsed.month, { value: parsed.month, label: parsed.month });
      }
    });
    return Array.from(unique.values());
  }, [normalizedPlannerWeekOptions, parsePlannerLabel, plannerQuarterLabel]);

  const compactPlannerWeekOptions = React.useMemo(
    () =>
      normalizedPlannerWeekOptions
        .filter((option) => {
          const parsed = parsePlannerLabel(option.label);
          if (plannerQuarterLabel && parsed.quarter !== plannerQuarterLabel) return false;
          if (plannerMonthLabel && parsed.month !== plannerMonthLabel) return false;
          return true;
        })
        .map((option) => {
          const parsed = parsePlannerLabel(option.label);
          const [, range = ''] = option.label.split('·');
          return {
            value: option.value,
            label: parsed.week ? `${parsed.week} · ${range.trim()}` : option.label,
          };
        }),
    [normalizedPlannerWeekOptions, parsePlannerLabel, plannerMonthLabel, plannerQuarterLabel],
  );

  React.useEffect(() => {
    const selectedOption = normalizedPlannerWeekOptions.find((option) => option.value === plannerWeekId) || normalizedPlannerWeekOptions[0] || null;
    if (!selectedOption) {
      setPlannerQuarterLabel('');
      setPlannerMonthLabel('');
      return;
    }
    const parsed = parsePlannerLabel(selectedOption.label);
    setPlannerQuarterLabel(parsed.quarter || '');
    setPlannerMonthLabel(parsed.month || '');
  }, [normalizedPlannerWeekOptions, parsePlannerLabel, plannerWeekId]);

  if (!open) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes spacesTaskDrawerBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes spacesTaskDrawerSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .spaces-task-drawer-backdrop,
          .spaces-task-drawer-panel {
            animation-duration: 1ms !important;
          }
        }
      `}</style>
      <div
        className="spaces-task-drawer-backdrop fixed inset-0 z-[160] flex justify-end bg-slate-950/35 backdrop-blur-[2px]"
        style={{ animation: 'spacesTaskDrawerBackdropIn 180ms ease-out both' }}
        onClick={onClose}
      >
        <div
          className="spaces-task-drawer-panel flex h-full w-full max-w-[880px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
          style={{ animation: 'spacesTaskDrawerSlideIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
          onClick={(event) => event.stopPropagation()}
        >
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">Task Hub</div>
            <h3 className="mt-1 text-[30px] font-semibold leading-none text-slate-900">Create New Task</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3.5">
          <div className="space-y-3">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_360px]">
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Task Name *</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={CREATE_INPUT_CLASS} placeholder="Enter task name" />
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[126px] w-full rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-[15px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
                    placeholder="Add task description..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Assignee</label>
                    {emailChecklistEnabled && emailChecklistExternalPerson ? (
                      <div className="flex h-[52px] items-center rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 text-[14px] text-emerald-800">
                        Assigned via email below
                      </div>
                    ) : (
                      <ThemedSelect value={assigneeId} onChange={setAssigneeId} options={createAssigneeOptions} placeholder="Unassigned" disabled={employeesLoading} />
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Due Date</label>
                    <ThemedDatePicker value={dueDate} onChange={setDueDate} />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Priority</label>
                    <ThemedSelect value={priority} onChange={setPriority} options={priorityOptions} />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Status</label>
                    <ThemedSelect value={status} onChange={setStatus} options={statusOptions} />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Project</label>
                  <ThemedSelect value={selectedProjectId} onChange={setSelectedProjectId} options={projectSelectOptions} placeholder="No project" disabled={projectsLoading} />
                </div>
              </div>

              <div className="space-y-3">
                {/* Weekly Planner section intentionally commented out per request.
                <SpacesTaskPlannerFields
                  hideWeeklyPlanner={hideWeeklyPlanner}
                  addToWeeklyPlanner={addToWeeklyPlanner}
                  setAddToWeeklyPlanner={setAddToWeeklyPlanner}
                  plannerSummary={plannerSummary}
                  plannerQuarterLabel={plannerQuarterLabel}
                  setPlannerQuarterLabel={setPlannerQuarterLabel}
                  plannerMonthLabel={plannerMonthLabel}
                  setPlannerMonthLabel={setPlannerMonthLabel}
                  normalizedPlannerWeekOptions={normalizedPlannerWeekOptions}
                  parsePlannerLabel={parsePlannerLabel}
                  plannerQuarterOptions={plannerQuarterOptions}
                  plannerMonthOptions={plannerMonthOptions}
                  compactPlannerWeekOptions={compactPlannerWeekOptions}
                  plannerWeekId={plannerWeekId}
                  setPlannerWeekId={setPlannerWeekId}
                  plannerDayOptions={plannerDayOptions}
                  plannerDayId={plannerDayId}
                  setPlannerDayId={setPlannerDayId}
                />
                */}

                <div>
                  <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Document / Attachments</label>
                  <FileDropZone
                    as="label"
                    multiple={false}
                    disabled={saving || uploadingTaskDocument}
                    className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-red-200 bg-slate-50/70 px-5 text-center transition hover:bg-red-50/50"
                    overlayTitle="Drop document here"
                    overlayHint="PDF, DOCX, JPG, PNG, WEBP"
                    onFiles={(files) => setTaskDocumentFile(files[0] || null)}
                  >
                    <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => setTaskDocumentFile(e.target.files?.[0] || null)} />
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                      <Paperclip size={20} />
                    </div>
                    <div className="mt-3 text-[15px] font-medium text-slate-700">
                      {taskDocumentFile ? taskDocumentFile.name : 'Click to upload or drag and drop'}
                    </div>
                    <div className="mt-1 text-[12px] text-slate-500">PDF, DOCX, JPG, PNG, WEBP</div>
                  </FileDropZone>
                </div>

                {canUseEmailChecklist ? <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-700">Automated Mail Checklist</div>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">Email assigned work and repeat only unfinished items.</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={emailChecklistEnabled}
                        onChange={(event) => {
                          const enabled = event.target.checked;
                          setEmailChecklistEnabled(enabled);
                          if (!enabled) {
                            setAdditionalChecklistTitles([]);
                            setEmailChecklistExternalPerson(false);
                            setExternalAssigneeEmail('');
                            setExternalAssigneeName('');
                            setRepeatEveryWeek(false);
                          }
                        }}
                        className="peer sr-only"
                      />
                      <span className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-emerald-600" />
                      <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
                    </label>
                  </div>

                  {emailChecklistEnabled ? (
                    <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                        <div>
                          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-700">Repeat Occurrences</div>
                          <p className="mt-1 text-[11px] text-slate-500">Reactivates this task on the selected repeat interval.</p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input type="checkbox" checked={repeatEveryWeek} onChange={(event) => setRepeatEveryWeek(event.target.checked)} className="peer sr-only" />
                          <span className="h-6 w-10 rounded-full bg-slate-200 transition peer-checked:bg-emerald-600" />
                          <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
                        </label>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-700">Send to external person</div>
                            <p className="mt-1 text-[11px] leading-5 text-slate-500">Assign by email instead of picking a team member.</p>
                          </div>
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={emailChecklistExternalPerson}
                              onChange={(event) => {
                                const enabled = event.target.checked;
                                setEmailChecklistExternalPerson(enabled);
                                if (enabled) {
                                  setAssigneeId('');
                                } else {
                                  setExternalAssigneeEmail('');
                                  setExternalAssigneeName('');
                                }
                              }}
                              className="peer sr-only"
                            />
                            <span className="h-6 w-10 rounded-full bg-slate-200 transition peer-checked:bg-emerald-600" />
                            <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
                          </label>
                        </div>

                        {emailChecklistExternalPerson ? (
                          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                            <div>
                              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Recipient email *</label>
                              <input
                                type="email"
                                value={externalAssigneeEmail}
                                onChange={(event) => setExternalAssigneeEmail(event.target.value)}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                                placeholder="person@example.com"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Recipient name</label>
                              <input
                                value={externalAssigneeName}
                                onChange={(event) => setExternalAssigneeName(event.target.value)}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                                placeholder="Optional — used in the email greeting"
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {repeatEveryWeek ? (
                        <SpacesWeeklyReminderFields
                          repeatCadence={repeatCadence}
                          setRepeatCadence={setRepeatCadence}
                          repeatWeekDays={repeatWeekDays}
                          setRepeatWeekDays={setRepeatWeekDays}
                          repeatWeekTime={repeatWeekTime}
                          setRepeatWeekTime={setRepeatWeekTime}
                          repeatOccurrences={repeatOccurrences}
                          setRepeatOccurrences={setRepeatOccurrences}
                          fieldName="create-weekly-occurrences"
                        />
                      ) : (
                        <div>
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Email Reminder Gap</label>
                          <ThemedSelect
                            value={reminderIntervalHours}
                            onChange={setReminderIntervalHours}
                            options={EMAIL_REMINDER_GAP_OPTIONS}
                            compact={true}
                            fullWidthCompact={true}
                          />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Checklist Tasks</label>
                          <span className="text-[11px] text-slate-400">{1 + additionalChecklistTitles.length}/5</span>
                        </div>
                        <div className="mt-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-[12px] text-slate-600">
                          1. {title.trim() || 'Enter the task name above'}
                        </div>
                        <div className="mt-2 space-y-2">
                          {additionalChecklistTitles.map((taskTitle: string, index: number) => (
                            <div key={`checklist-title-${index}`} className="flex items-center gap-2">
                              <input
                                value={taskTitle}
                                onChange={(event) => {
                                  const next = [...additionalChecklistTitles];
                                  next[index] = event.target.value;
                                  setAdditionalChecklistTitles(next);
                                }}
                                className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                                placeholder={`Checklist task ${index + 2}`}
                              />
                              <button
                                type="button"
                                onClick={() => setAdditionalChecklistTitles(additionalChecklistTitles.filter((_: string, itemIndex: number) => itemIndex !== index))}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                                aria-label={`Remove checklist task ${index + 2}`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        {additionalChecklistTitles.length < 4 ? (
                          <button
                            type="button"
                            onClick={() => setAdditionalChecklistTitles([...additionalChecklistTitles, ''])}
                            className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            <Plus size={13} /> Add checklist task
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div> : null}

                <SpacesTaskCreateRecurrenceFields
                  taskRecurrence={taskRecurrence}
                  setTaskRecurrence={setTaskRecurrence}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-3.5 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-[15px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={
              saving ||
              uploadingTaskDocument ||
              !title.trim() ||
              (emailChecklistEnabled &&
                emailChecklistExternalPerson &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(externalAssigneeEmail.trim()))
            }
            className={`inline-flex items-center gap-2 rounded-full bg-brand-red px-7 py-3 text-[15px] font-black text-white shadow-lg transition-colors hover:bg-brand-navy ${
              saving ||
              uploadingTaskDocument ||
              !title.trim() ||
              (emailChecklistEnabled &&
                emailChecklistExternalPerson &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(externalAssigneeEmail.trim()))
                ? 'cursor-not-allowed opacity-60'
                : ''
            }`}
          >
            <Plus size={16} />
            {uploadingTaskDocument ? 'Uploading...' : saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
        </div>
      </div>
    </>,
    document.body,
  );
};

export default SpacesTaskCreateModal;
