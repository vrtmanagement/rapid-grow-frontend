import React from 'react';
import { createPortal } from 'react-dom';
import { Paperclip, X } from 'lucide-react';
import { getStoredAuthSession } from '../../config/api';
import { FileDropZone } from '../ui/FileDropZone';
import { buildWeeklyTaskCustomFields } from '../../views/spacesViewHelpers';
import {
  buildDefaultTaskCreateRecurrenceDraft,
  clampRecurrenceOccurrences,
  TASK_RECURRENCE_DATE_INTERVAL_CUSTOM_FIELD,
} from '../../utils/spaces/taskRecurrence';
import {
  CREATE_INPUT_CLASS,
  ThemedDatePicker,
  ThemedSelect,
} from './SpacesFormControls';
import SpacesTaskAutomationSection from './SpacesTaskAutomationSection';
import { applyTaskAutomationMode, deriveTaskAutomationMode } from './taskAutomationMode';
import {
  buildEditTaskRecurrenceDraft,
  buildEditTaskRecurrencePayload,
  EDIT_PLANNING_CUSTOM_FIELD_KEYS,
} from './spacesTaskModalsHelpers';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';
import type { SelectOption, SpacesTask, TaskCreateRecurrenceDraft, WeeklyTaskGroup } from '../../types/spaces';

type SpacesTaskEditDrawerProps = Pick<
  SpacesViewController,
  | 'me'
  | 'API_BASE'
  | 'setError'
  | 'mode'
  | 'editingTask'
  | 'editingTaskMode'
  | 'editingTaskDraft'
  | 'setEditingTaskDraft'
  | 'assignableEmployees'
  | 'forceDownloadDocument'
  | 'patchTask'
  | 'setEditingTask'
  | 'projectSelectOptions'
  | 'projectsLoading'
  | 'priorityOptions'
  | 'statusOptions'
  | 'weeklyTaskGroups'
  | 'getDayDisplay'
>;

const SpacesTaskEditDrawer: React.FC<SpacesTaskEditDrawerProps> = (props) => {
  const {
    me,
    API_BASE,
    setError,
    mode,
    editingTask,
    editingTaskMode,
    editingTaskDraft,
    setEditingTaskDraft,
    assignableEmployees,
    forceDownloadDocument,
    patchTask,
    setEditingTask,
    projectSelectOptions,
    projectsLoading,
    priorityOptions,
    statusOptions,
    weeklyTaskGroups,
    getDayDisplay,
  } = props;
  const [editingTaskDocumentFile, setEditingTaskDocumentFile] = React.useState<File | null>(null);
  const [editingEmailChecklistEnabled, setEditingEmailChecklistEnabled] = React.useState(false);
  const [editingReminderIntervalHours, setEditingReminderIntervalHours] = React.useState('24');
  const [editingRepeatEveryWeek, setEditingRepeatEveryWeek] = React.useState(false);
  const [editingRepeatCadence, setEditingRepeatCadence] = React.useState('week');
  const [editingRepeatWeekDays, setEditingRepeatWeekDays] = React.useState<string[]>(['1']);
  const [editingRepeatWeekTime, setEditingRepeatWeekTime] = React.useState('09:00');
  const [editingRepeatFromDate, setEditingRepeatFromDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [editingRepeatToDate, setEditingRepeatToDate] = React.useState(() => {
    const end = new Date();
    end.setDate(end.getDate() + 28);
    return end.toISOString().slice(0, 10);
  });
  const [editingAdditionalChecklistTitles, setEditingAdditionalChecklistTitles] = React.useState<string[]>([]);
  const [editingTaskRecurrence, setEditingTaskRecurrence] = React.useState<TaskCreateRecurrenceDraft>(() =>
    buildDefaultTaskCreateRecurrenceDraft(),
  );
  const [editingProjectId, setEditingProjectId] = React.useState('');
  const [editingAddToWeeklyPlanner, setEditingAddToWeeklyPlanner] = React.useState(false);
  const [editingPlannerWeekId, setEditingPlannerWeekId] = React.useState('');
  const [editingPlannerDayId, setEditingPlannerDayId] = React.useState('');
  const [editingPlannerQuarterLabel, setEditingPlannerQuarterLabel] = React.useState('');
  const [editingPlannerMonthLabel, setEditingPlannerMonthLabel] = React.useState('');
  const [editingTaskSaving, setEditingTaskSaving] = React.useState(false);
  const [editingTaskUploadingDocument, setEditingTaskUploadingDocument] = React.useState(false);

  const canUseEmailChecklist =
    mode === 'manager' ||
    me.role === 'ADMIN' ||
    me.role === 'SUPER_ADMIN' ||
    me.role === 'TEAM_LEAD';

  const editingAssigneeOptions = React.useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...assignableEmployees.map((employee: any) => ({
        value: employee.empId,
        label: employee.empId === me.id ? `${employee.empName} (You)` : employee.empName || employee.empId,
      })),
    ],
    [assignableEmployees, me.id],
  );

  const parsePlannerLabel = React.useCallback((label: string) => {
    const match = String(label || '').match(/(Q\d+)\s*\/\s*(M\d+)\s*\/\s*(W\d+)/i);
    return {
      quarter: match?.[1] || '',
      month: match?.[2] || '',
      week: match?.[3] || '',
    };
  }, []);

  const editingNormalizedPlannerWeekOptions = React.useMemo<SelectOption[]>(
    () =>
      (weeklyTaskGroups || []).map((group: WeeklyTaskGroup) => ({
        value: group.weekSelectionKey,
        label: `${group.weekSummaryLabel} · ${group.weekRangeLabel}`,
      })),
    [weeklyTaskGroups],
  );

  const editingSelectedPlannerWeekGroup = React.useMemo(
    () =>
      (weeklyTaskGroups || []).find((group: WeeklyTaskGroup) => group.weekSelectionKey === editingPlannerWeekId) || null,
    [editingPlannerWeekId, weeklyTaskGroups],
  );

  const editingPlannerDayOptions = React.useMemo<SelectOption[]>(() => {
    if (!editingSelectedPlannerWeekGroup?.days?.length) return [];
    return editingSelectedPlannerWeekGroup.days.map((day, index) => {
      const info = getDayDisplay(editingSelectedPlannerWeekGroup.weekStart, index);
      return {
        value: day.id,
        label: `${info.weekday} · ${info.dateText}`,
      };
    });
  }, [editingSelectedPlannerWeekGroup, getDayDisplay]);

  const editingPlannerSummary = React.useMemo(() => {
    if (!editingSelectedPlannerWeekGroup) return '';
    const selectedPlannerDay =
      editingSelectedPlannerWeekGroup.days.find((day) => day.id === editingPlannerDayId) ||
      editingSelectedPlannerWeekGroup.days[0] ||
      null;
    if (!selectedPlannerDay) {
      return `${editingSelectedPlannerWeekGroup.weekSummaryLabel} · ${editingSelectedPlannerWeekGroup.weekRangeLabel}`;
    }
    const dayIndex = editingSelectedPlannerWeekGroup.days.findIndex((day) => day.id === selectedPlannerDay.id);
    const dayInfo = getDayDisplay(editingSelectedPlannerWeekGroup.weekStart, Math.max(dayIndex, 0));
    return `${editingSelectedPlannerWeekGroup.weekSummaryLabel} · ${dayInfo.weekday} ${dayInfo.dateText}`;
  }, [editingPlannerDayId, editingSelectedPlannerWeekGroup, getDayDisplay]);

  const editingPlannerQuarterOptions = React.useMemo(() => {
    const unique = new Map<string, SelectOption>();
    editingNormalizedPlannerWeekOptions.forEach((option) => {
      const parsed = parsePlannerLabel(option.label);
      if (parsed.quarter && !unique.has(parsed.quarter)) {
        unique.set(parsed.quarter, { value: parsed.quarter, label: parsed.quarter });
      }
    });
    return Array.from(unique.values());
  }, [editingNormalizedPlannerWeekOptions, parsePlannerLabel]);

  const editingPlannerMonthOptions = React.useMemo(() => {
    const unique = new Map<string, SelectOption>();
    editingNormalizedPlannerWeekOptions.forEach((option) => {
      const parsed = parsePlannerLabel(option.label);
      if (editingPlannerQuarterLabel && parsed.quarter !== editingPlannerQuarterLabel) return;
      if (parsed.month && !unique.has(parsed.month)) {
        unique.set(parsed.month, { value: parsed.month, label: parsed.month });
      }
    });
    return Array.from(unique.values());
  }, [editingNormalizedPlannerWeekOptions, editingPlannerQuarterLabel, parsePlannerLabel]);

  const editingCompactPlannerWeekOptions = React.useMemo(
    () =>
      editingNormalizedPlannerWeekOptions
        .filter((option) => {
          const parsed = parsePlannerLabel(option.label);
          if (editingPlannerQuarterLabel && parsed.quarter !== editingPlannerQuarterLabel) return false;
          if (editingPlannerMonthLabel && parsed.month !== editingPlannerMonthLabel) return false;
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
    [editingNormalizedPlannerWeekOptions, editingPlannerMonthLabel, editingPlannerQuarterLabel, parsePlannerLabel],
  );

  React.useEffect(() => {
    const selectedOption =
      editingNormalizedPlannerWeekOptions.find((option) => option.value === editingPlannerWeekId) ||
      editingNormalizedPlannerWeekOptions[0] ||
      null;
    if (!selectedOption) {
      setEditingPlannerQuarterLabel('');
      setEditingPlannerMonthLabel('');
      return;
    }
    const parsed = parsePlannerLabel(selectedOption.label);
    setEditingPlannerQuarterLabel(parsed.quarter || '');
    setEditingPlannerMonthLabel(parsed.month || '');
  }, [editingNormalizedPlannerWeekOptions, editingPlannerWeekId, parsePlannerLabel]);

  React.useEffect(() => {
    if (!editingSelectedPlannerWeekGroup?.days?.length) return;
    if (editingSelectedPlannerWeekGroup.days.some((day) => day.id === editingPlannerDayId)) return;
    setEditingPlannerDayId(editingSelectedPlannerWeekGroup.days[0]?.id || '');
  }, [editingPlannerDayId, editingSelectedPlannerWeekGroup]);

  React.useEffect(() => {
    if (!editingTask) return;
    const customFields = editingTask.customFields || {};
    const planningWeekId = String(
      customFields.planningWeekId || customFields.weeklyGoalId || customFields.weekGoalKey || '',
    ).trim();
    const planningDayId = String(customFields.dailyGoalId || customFields.dayGoalKey || '').trim();
    const plannerGroup =
      (weeklyTaskGroups || []).find(
        (group: WeeklyTaskGroup) =>
          group.weekId === planningWeekId ||
          group.week.id === planningWeekId ||
          group.weekSelectionKey === planningWeekId,
      ) || null;

    setEditingTaskDocumentFile(null);
    setEditingProjectId(String(editingTask.projectId || '').trim());
    setEditingEmailChecklistEnabled(Boolean(editingTask.emailChecklist?.enabled));
    setEditingReminderIntervalHours(String(editingTask.emailChecklist?.reminderIntervalHours || 24));
    setEditingRepeatEveryWeek(Boolean(editingTask.emailChecklist?.repeatEveryWeek));
    setEditingRepeatCadence(
      editingTask.emailChecklist?.repeatCadence === '5_minutes'
        ? '2_minutes'
        : String(editingTask.emailChecklist?.repeatCadence || 'week'),
    );
    const existingWeekDays = Array.isArray(editingTask.emailChecklist?.repeatWeekDays)
      ? editingTask.emailChecklist.repeatWeekDays
          .map((day) => Number(day))
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
          .map(String)
      : [];
    setEditingRepeatWeekDays(
      existingWeekDays.length
        ? existingWeekDays.slice(0, 6)
        : [String(editingTask.emailChecklist?.repeatWeekDay ?? new Date().getDay())],
    );
    setEditingRepeatWeekTime(String(editingTask.emailChecklist?.repeatWeekTime || '09:00'));
    const today = new Date().toISOString().slice(0, 10);
    const defaultTo = (() => {
      const end = new Date();
      end.setDate(end.getDate() + 28);
      return end.toISOString().slice(0, 10);
    })();
    setEditingRepeatFromDate(String(editingTask.emailChecklist?.repeatFromDate || today).slice(0, 10));
    setEditingRepeatToDate(String(editingTask.emailChecklist?.repeatToDate || defaultTo).slice(0, 10));
    setEditingAdditionalChecklistTitles([]);
    setEditingTaskRecurrence(buildEditTaskRecurrenceDraft(editingTask));
    setEditingAddToWeeklyPlanner(Boolean(plannerGroup));
    setEditingPlannerWeekId(plannerGroup?.weekSelectionKey || '');
    setEditingPlannerDayId(
      plannerGroup?.days.some((day) => day.id === planningDayId)
        ? planningDayId
        : plannerGroup?.days[0]?.id || '',
    );
  }, [editingTask, weeklyTaskGroups]);

  const closeEditingTaskDrawer = React.useCallback(() => {
    if (editingTaskSaving || editingTaskUploadingDocument) return;
    setEditingTask(null);
    setEditingTaskDraft({});
    setEditingTaskDocumentFile(null);
    setEditingAdditionalChecklistTitles([]);
    setEditingTaskSaving(false);
    setEditingTaskUploadingDocument(false);
  }, [
    editingTaskSaving,
    editingTaskUploadingDocument,
    setEditingTask,
    setEditingTaskDraft,
  ]);

  const uploadEditingTaskDocument = React.useCallback(async (file: File | null) => {
    if (!file) return null;
    setEditingTaskUploadingDocument(true);
    const formData = new FormData();
    formData.append('file', file);
    const session = getStoredAuthSession();
    const token = typeof session?.token === 'string' ? session.token : '';
    const response = await fetch(`${API_BASE}/spaces/tasks/upload-document`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const uploaded = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(uploaded.message || 'Failed to upload task document');
    }
    return {
      documentUrl: String(uploaded.documentUrl || ''),
      documentName: String(uploaded.documentName || file.name || ''),
      documentMimeType: String(uploaded.documentMimeType || file.type || ''),
    };
  }, [API_BASE]);

  const saveEditingTask = React.useCallback(async () => {
    if (!editingTask) return;

    const trimmedTitle = String(editingTaskDraft.title || '').trim();
    if (!trimmedTitle) return;
    if (editingEmailChecklistEnabled && !String(editingTaskDraft.assigneeId || '').trim()) {
      setError('Select an assignee before enabling checklist email reminders.');
      return;
    }
    if (editingEmailChecklistEnabled && editingRepeatEveryWeek && (!editingRepeatFromDate || !editingRepeatToDate)) {
      setError('Select from and to dates for the repeat schedule.');
      return;
    }
    if (
      editingEmailChecklistEnabled &&
      editingRepeatEveryWeek &&
      editingRepeatFromDate &&
      editingRepeatToDate &&
      editingRepeatToDate < editingRepeatFromDate
    ) {
      setError('To date must be on or after the from date.');
      return;
    }

    setEditingTaskSaving(true);
    setError(null);
    try {
      const uploadedDocument = editingTaskDocumentFile
        ? await uploadEditingTaskDocument(editingTaskDocumentFile)
        : null;

      const nextCustomFields = { ...(editingTask.customFields || {}) } as Record<string, string>;
      EDIT_PLANNING_CUSTOM_FIELD_KEYS.forEach((key) => {
        delete nextCustomFields[key];
      });
      delete nextCustomFields[TASK_RECURRENCE_DATE_INTERVAL_CUSTOM_FIELD];

      if (editingAddToWeeklyPlanner) {
        const plannerGroup = editingSelectedPlannerWeekGroup;
        const plannerDay =
          plannerGroup?.days.find((day) => day.id === editingPlannerDayId) || plannerGroup?.days[0] || null;
        if (plannerGroup && plannerDay) {
          Object.assign(nextCustomFields, buildWeeklyTaskCustomFields(plannerDay, plannerGroup));
        }
      }
      const recurrencePayload = buildEditTaskRecurrencePayload(editingTaskRecurrence);
      if (editingTaskRecurrence.enabled && editingTaskRecurrence.frequency === 'weekly' && !editingTaskRecurrence.weekDays.length) {
        throw new Error('Select at least one day for a weekly repeating task.');
      }
      if (
        recurrencePayload?.enabled &&
        recurrencePayload.ends?.type === 'after' &&
        recurrencePayload.ends.occurrences != null &&
        clampRecurrenceOccurrences(recurrencePayload.ends.occurrences) < 1
      ) {
        throw new Error('Enter at least one occurrence for the recurrence end rule.');
      }

      const updates: Record<string, unknown> = {
        title: trimmedTitle,
        description: String(editingTaskDraft.description || '').trim(),
        assigneeId: String(editingTaskDraft.assigneeId || '').trim(),
        dueDate: String(editingTaskDraft.dueDate || '').trim(),
        priority: editingTaskDraft.priority || editingTask.priority,
        status: editingTaskDraft.status || editingTask.status,
        projectId: editingProjectId,
        customFields: nextCustomFields,
        recurrence: recurrencePayload,
        emailChecklistEnabled: editingEmailChecklistEnabled,
        repeatEveryWeek: editingRepeatEveryWeek,
        repeatCadence: editingRepeatCadence,
        repeatWeekDay: Number(editingRepeatWeekDays[0]),
        repeatWeekDays: editingRepeatWeekDays.map((day) => Number(day)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).slice(0, 6),
        repeatWeekTime: editingRepeatWeekTime,
        repeatFromDate: editingRepeatFromDate,
        repeatToDate: editingRepeatToDate,
        repeatOccurrences: null,
        reminderIntervalHours: Number(editingReminderIntervalHours) || 24,
      };

      if (uploadedDocument) {
        updates.documentUrl = uploadedDocument.documentUrl;
        updates.documentName = uploadedDocument.documentName;
        updates.documentMimeType = uploadedDocument.documentMimeType;
      } else {
        updates.documentUrl = String(editingTaskDraft.documentUrl || editingTask.documentUrl || '').trim();
        updates.documentName = String(editingTaskDraft.documentName || editingTask.documentName || '').trim();
        updates.documentMimeType = String(
          editingTaskDraft.documentMimeType || editingTask.documentMimeType || '',
        ).trim();
      }

      const ok = await patchTask(editingTask.taskId, updates as Partial<SpacesTask>);
      if (!ok) return;
      closeEditingTaskDrawer();
    } catch (e: any) {
      setError(e?.message || 'Failed to update task');
    } finally {
      setEditingTaskSaving(false);
      setEditingTaskUploadingDocument(false);
    }
  }, [
    closeEditingTaskDrawer,
    editingAddToWeeklyPlanner,
    editingEmailChecklistEnabled,
    editingPlannerDayId,
    editingProjectId,
    editingReminderIntervalHours,
    editingRepeatEveryWeek,
    editingRepeatCadence,
    editingRepeatWeekDays,
    editingRepeatWeekTime,
    editingRepeatFromDate,
    editingRepeatToDate,
    editingSelectedPlannerWeekGroup,
    editingTask,
    editingTaskDocumentFile,
    editingTaskDraft,
    editingTaskRecurrence,
    patchTask,
    setError,
    uploadEditingTaskDocument,
  ]);

  return editingTask
    ? createPortal(
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
            onClick={closeEditingTaskDrawer}
          >
            <div
              className="spaces-task-drawer-panel flex h-full w-full max-w-[880px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
              style={{ animation: 'spacesTaskDrawerSlideIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
              onClick={(event) => event.stopPropagation()}
            >
          <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">Task Hub</div>
              <h3 className="mt-1 text-[30px] font-semibold leading-none text-slate-900">
                {editingTaskMode === 'view' ? 'Task Details' : 'Edit Task'}
              </h3>
            </div>
            <button
              type="button"
              onClick={closeEditingTaskDrawer}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3.5">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_360px]">
                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Task Name *</label>
                    <input
                      value={editingTaskDraft.title || ''}
                      onChange={(e) => setEditingTaskDraft((prev: any) => ({ ...prev, title: e.target.value }))}
                      disabled={editingTaskMode === 'view'}
                      className={CREATE_INPUT_CLASS}
                      placeholder="Enter task name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Description</label>
                    <textarea
                      value={editingTaskDraft.description || ''}
                      onChange={(e) => setEditingTaskDraft((prev: any) => ({ ...prev, description: e.target.value }))}
                      disabled={editingTaskMode === 'view'}
                      className="min-h-[126px] w-full rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-[15px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:bg-slate-50"
                      placeholder="Add task description..."
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Assignee</label>
                      <ThemedSelect
                        value={String(editingTaskDraft.assigneeId || '')}
                        onChange={(value) => setEditingTaskDraft((prev: any) => ({ ...prev, assigneeId: value }))}
                        options={editingAssigneeOptions}
                        placeholder="Unassigned"
                        disabled={editingTaskMode === 'view'}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Due Date</label>
                      <ThemedDatePicker
                        value={String(editingTaskDraft.dueDate || '')}
                        onChange={(value) => setEditingTaskDraft((prev: any) => ({ ...prev, dueDate: value }))}
                        disabled={editingTaskMode === 'view'}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Priority</label>
                      <ThemedSelect
                        value={String(editingTaskDraft.priority || editingTask.priority || 'medium')}
                        onChange={(value) => setEditingTaskDraft((prev: any) => ({ ...prev, priority: value }))}
                        options={priorityOptions}
                        disabled={editingTaskMode === 'view'}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Status</label>
                      <ThemedSelect
                        value={String(editingTaskDraft.status || editingTask.status || 'todo')}
                        onChange={(value) => setEditingTaskDraft((prev: any) => ({ ...prev, status: value }))}
                        options={statusOptions}
                        disabled={editingTaskMode === 'view'}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Project</label>
                    <ThemedSelect
                      value={editingProjectId}
                      onChange={setEditingProjectId}
                      options={projectSelectOptions}
                      placeholder="No project"
                      disabled={editingTaskMode === 'view' || projectsLoading}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Weekly Planner section intentionally commented out per request.
                  <SpacesTaskPlannerFields
                    hideWeeklyPlanner={false}
                    addToWeeklyPlanner={editingAddToWeeklyPlanner}
                    setAddToWeeklyPlanner={setEditingAddToWeeklyPlanner}
                    plannerSummary={editingPlannerSummary}
                    plannerQuarterLabel={editingPlannerQuarterLabel}
                    setPlannerQuarterLabel={setEditingPlannerQuarterLabel}
                    plannerMonthLabel={editingPlannerMonthLabel}
                    setPlannerMonthLabel={setEditingPlannerMonthLabel}
                    normalizedPlannerWeekOptions={editingNormalizedPlannerWeekOptions}
                    parsePlannerLabel={parsePlannerLabel}
                    plannerQuarterOptions={editingPlannerQuarterOptions}
                    plannerMonthOptions={editingPlannerMonthOptions}
                    compactPlannerWeekOptions={editingCompactPlannerWeekOptions}
                    plannerWeekId={editingPlannerWeekId}
                    setPlannerWeekId={setEditingPlannerWeekId}
                    plannerDayOptions={editingPlannerDayOptions}
                    plannerDayId={editingPlannerDayId}
                    setPlannerDayId={setEditingPlannerDayId}
                  />
                  */}

                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700">Document / Attachments</label>
                    <FileDropZone
                      as="label"
                      multiple={false}
                      disabled={editingTaskMode === 'view' || editingTaskSaving || editingTaskUploadingDocument}
                      className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-red-200 bg-slate-50/70 px-5 text-center transition hover:bg-red-50/50"
                      overlayTitle="Drop document here"
                      overlayHint="PDF, DOCX, JPG, PNG, WEBP"
                      onFiles={(files) => setEditingTaskDocumentFile(files[0] || null)}
                    >
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={(e) => setEditingTaskDocumentFile(e.target.files?.[0] || null)}
                      />
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                        <Paperclip size={20} />
                      </div>
                      <div className="mt-3 text-[15px] font-medium text-slate-700">
                        {editingTaskDocumentFile
                          ? editingTaskDocumentFile.name
                          : editingTaskDraft.documentName || 'Click to upload or drag and drop'}
                      </div>
                      <div className="mt-1 text-[12px] text-slate-500">PDF, DOCX, JPG, PNG, WEBP</div>
                      {editingTaskDraft.documentUrl && !editingTaskDocumentFile ? (
                        <button
                          type="button"
                          onClick={async (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            try {
                              await forceDownloadDocument(
                                String(editingTaskDraft.documentUrl || ''),
                                String(editingTaskDraft.documentName || '') || undefined,
                              );
                            } catch (err: any) {
                              setError(err?.message || 'Failed to download document');
                            }
                          }}
                          className="mt-2 text-[12px] font-semibold text-brand-red hover:underline"
                        >
                          Download current attachment
                        </button>
                      ) : null}
                    </FileDropZone>
                  </div>

                  <SpacesTaskAutomationSection
                    canUseEmailChecklist={canUseEmailChecklist}
                    disabled={editingTaskMode === 'view'}
                    mode={deriveTaskAutomationMode({
                      emailChecklistEnabled: editingEmailChecklistEnabled,
                      taskRecurrenceEnabled: editingTaskRecurrence.enabled,
                    })}
                    onModeChange={(nextMode) =>
                      applyTaskAutomationMode(
                        nextMode,
                        {
                          setEmailChecklistEnabled: setEditingEmailChecklistEnabled,
                          setAdditionalChecklistTitles: setEditingAdditionalChecklistTitles,
                          setEmailChecklistExternalPerson: () => {},
                          setExternalAssigneeEmail: () => {},
                          setExternalAssigneeName: () => {},
                          setRepeatEveryWeek: setEditingRepeatEveryWeek,
                        },
                        { setTaskRecurrence: setEditingTaskRecurrence },
                      )
                    }
                    taskTitle={String(editingTaskDraft.title || editingTask.title || '')}
                    emailChecklistExternalPerson={false}
                    setEmailChecklistExternalPerson={() => {}}
                    externalAssigneeEmail=""
                    setExternalAssigneeEmail={() => {}}
                    externalAssigneeName=""
                    setExternalAssigneeName={() => {}}
                    additionalChecklistTitles={editingAdditionalChecklistTitles}
                    setAdditionalChecklistTitles={setEditingAdditionalChecklistTitles}
                    reminderIntervalHours={editingReminderIntervalHours}
                    setReminderIntervalHours={setEditingReminderIntervalHours}
                    repeatEveryWeek={editingRepeatEveryWeek}
                    setRepeatEveryWeek={setEditingRepeatEveryWeek}
                    repeatCadence={editingRepeatCadence}
                    setRepeatCadence={setEditingRepeatCadence}
                    repeatWeekDays={editingRepeatWeekDays}
                    setRepeatWeekDays={setEditingRepeatWeekDays}
                    repeatWeekTime={editingRepeatWeekTime}
                    setRepeatWeekTime={setEditingRepeatWeekTime}
                    repeatFromDate={editingRepeatFromDate}
                    setRepeatFromDate={setEditingRepeatFromDate}
                    repeatToDate={editingRepeatToDate}
                    setRepeatToDate={setEditingRepeatToDate}
                    taskRecurrence={editingTaskRecurrence}
                    setTaskRecurrence={setEditingTaskRecurrence}
                    showExternalAssignee={false}
                    weeklyFieldName="edit-weekly-occurrences"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-3.5 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
            <button
              type="button"
              onClick={closeEditingTaskDrawer}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-[15px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              {editingTaskMode === 'view' ? 'Close' : 'Cancel'}
            </button>
            {editingTaskMode !== 'view' ? (
              <button
                type="button"
                onClick={() => void saveEditingTask()}
                disabled={editingTaskSaving || editingTaskUploadingDocument || !String(editingTaskDraft.title || '').trim()}
                className={`inline-flex items-center gap-2 rounded-full bg-brand-red px-7 py-3 text-[15px] font-black text-white shadow-lg transition-colors hover:bg-brand-navy ${
                  editingTaskSaving || editingTaskUploadingDocument || !String(editingTaskDraft.title || '').trim()
                    ? 'cursor-not-allowed opacity-60'
                    : ''
                }`}
              >
                {editingTaskUploadingDocument ? 'Uploading...' : editingTaskSaving ? 'Saving...' : 'Save Task'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
        </>,
        document.body,
      )
    : null;
};

export default SpacesTaskEditDrawer;
