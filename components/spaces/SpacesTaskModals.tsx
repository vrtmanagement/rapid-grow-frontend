import React from 'react';
import { createPortal } from 'react-dom';
import { Paperclip, Plus, X } from 'lucide-react';
import { getStoredAuthSession } from '../../config/api';
import { FileDropZone } from '../ui/FileDropZone';
import { buildWeeklyTaskCustomFields } from '../../views/spacesViewHelpers';
import {
  buildCreateTaskRecurrencePayload,
  buildDefaultTaskCreateRecurrenceDraft,
  clampRecurrenceOccurrences,
  normalizeCreateTaskRecurrenceDraft,
  TASK_RECURRENCE_DATE_INTERVAL_CUSTOM_FIELD,
} from '../../utils/spaces/taskRecurrence';
import {
  CREATE_INPUT_CLASS,
  ThemedDatePicker,
  ThemedSelect,
} from './SpacesFormControls';
import SpacesTaskPlannerFields from './SpacesTaskPlannerFields';
import SpacesTaskCreateRecurrenceFields from './SpacesTaskCreateRecurrenceFields';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';
import type { SelectOption, SpacesTask, TaskCreateRecurrenceDraft, WeeklyTaskGroup } from '../../types/spaces';

import SpacesWeeklyReminderFields from './SpacesWeeklyReminderFields';
import { EMAIL_REMINDER_GAP_OPTIONS } from './spacesEmailReminderOptions';

type SpacesTaskModalsProps = Pick<
  SpacesViewController,
  | 'activeCommentTask'
  | 'setCommentTaskId'
  | 'setCommentDraft'
  | 'commentDraft'
  | 'me'
  | 'editingCommentId'
  | 'setEditingCommentId'
  | 'editCommentDraft'
  | 'setEditCommentDraft'
  | 'API_BASE'
  | 'getAuthHeaders'
  | 'setTasks'
  | 'setError'
  | 'mode'
  | 'modalStatus'
  | 'setModalStatus'
  | 'handleAddComment'
  | 'submittingComment'
  | 'columnToDelete'
  | 'setColumnToDelete'
  | 'setColumns'
  | 'sortedTasks'
  | 'commentToDeleteId'
  | 'setCommentToDeleteId'
  | 'deleteTaskModal'
  | 'setDeleteTaskModal'
  | 'bulkDeleteTaskModalOpen'
  | 'setBulkDeleteTaskModalOpen'
  | 'selectedTaskCount'
  | 'bulkSaving'
  | 'deleteSelectedTasks'
  | 'rejectTaskModal'
  | 'rejectFeedbackDraft'
  | 'setRejectFeedbackDraft'
  | 'rejectingTask'
  | 'confirmRejectTask'
  | 'editingTask'
  | 'editingTaskMode'
  | 'editingTaskDraft'
  | 'setEditingTaskDraft'
  | 'assignableEmployees'
  | 'forceDownloadDocument'
  | 'patchTask'
  | 'deleteTask'
  | 'setEditingTask'
  | 'projectSelectOptions'
  | 'projectsLoading'
  | 'priorityOptions'
  | 'statusOptions'
  | 'weeklyTaskGroups'
  | 'getDayDisplay'
>;

const EDIT_PLANNING_CUSTOM_FIELD_KEYS = [
  'planningSource',
  'monthGoalKey',
  'monthGoalLabel',
  'weekGoalKey',
  'weekGoalLabel',
  'dayGoalKey',
  'dayGoalLabel',
  'monthlyGoalId',
  'weeklyGoalId',
  'dailyGoalId',
  'quarterlyGoalId',
  'yearlyGoalId',
  'weeklyGoalText',
  'dailyGoalText',
  'planningYearId',
  'planningYearLabel',
  'planningQuarterId',
  'planningQuarterLabel',
  'planningMonthId',
  'planningMonthLabel',
  'planningWeekId',
  'planningWeekLabel',
  'planningWeekRange',
  'planningDayLabel',
  'planningBreadcrumb',
  'weekChainKey',
  'dayChainKey',
];

function parseRecurrenceTimeLabel(nextRunAt?: string, fallback = '09:00') {
  const parsed = nextRunAt ? new Date(nextRunAt) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return fallback;
  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
}

function buildEditTaskRecurrenceDraft(task?: SpacesTask | null): TaskCreateRecurrenceDraft {
  const base = buildDefaultTaskCreateRecurrenceDraft();
  const recurrence = task?.recurrence;
  if (!recurrence?.enabled) return base;

  const endsType = recurrence.ends?.type || (recurrence.endDate ? 'on_date' : recurrence.maxOccurrences ? 'after' : 'never');
  const frequency = String(recurrence.frequency || '').trim().toLowerCase();
  return normalizeCreateTaskRecurrenceDraft({
    ...base,
    enabled: true,
    frequency: frequency === 'weekly' || frequency === 'monthly' ? frequency : 'daily',
    interval: Number(recurrence.interval || 1),
    weekDays:
      Array.isArray(recurrence.week_days) && recurrence.week_days.length
        ? recurrence.week_days
        : recurrence.dayOfWeek != null
          ? [Number(recurrence.dayOfWeek)]
          : base.weekDays,
    monthDay: Number(recurrence.month_day || recurrence.dayOfMonth || base.monthDay),
    time: String(recurrence.time || parseRecurrenceTimeLabel(recurrence.nextRunAt || undefined, base.time)),
    ends: {
      type: endsType === 'on_date' || endsType === 'after' ? endsType : 'never',
      date:
        recurrence.ends?.date ||
        (recurrence.endDate ? new Date(recurrence.endDate).toISOString().slice(0, 10) : null),
      occurrences:
        recurrence.ends?.occurrences ??
        (Number(recurrence.maxOccurrences || 0) > 0 ? Number(recurrence.maxOccurrences) : base.ends.occurrences),
    },
  });
}

function buildEditTaskRecurrencePayload(taskRecurrence: TaskCreateRecurrenceDraft) {
  return buildCreateTaskRecurrencePayload(taskRecurrence) || { enabled: false };
}

const SpacesTaskModals: React.FC<SpacesTaskModalsProps> = (props) => {
  const {
    activeCommentTask,
    setCommentTaskId,
    setCommentDraft,
    commentDraft,
    me,
    editingCommentId,
    setEditingCommentId,
    editCommentDraft,
    setEditCommentDraft,
    API_BASE,
    getAuthHeaders,
    setTasks,
    setError,
    mode,
    modalStatus,
    setModalStatus,
    handleAddComment,
    submittingComment,
    columnToDelete,
    setColumnToDelete,
    setColumns,
    sortedTasks,
    commentToDeleteId,
    setCommentToDeleteId,
    deleteTaskModal,
    setDeleteTaskModal,
    bulkDeleteTaskModalOpen,
    setBulkDeleteTaskModalOpen,
    selectedTaskCount,
    bulkSaving,
    deleteSelectedTasks,
    rejectTaskModal,
    rejectFeedbackDraft,
    setRejectFeedbackDraft,
    rejectingTask,
    confirmRejectTask,
    editingTask,
    editingTaskMode,
    editingTaskDraft,
    setEditingTaskDraft,
    assignableEmployees,
    forceDownloadDocument,
    patchTask,
    deleteTask,
    setEditingTask,
    projectSelectOptions,
    projectsLoading,
    priorityOptions,
    statusOptions,
    weeklyTaskGroups,
    getDayDisplay,
  } = props;
  const [isDeletingTask, setIsDeletingTask] = React.useState(false);
  const [editingTaskDocumentFile, setEditingTaskDocumentFile] = React.useState<File | null>(null);
  const [editingEmailChecklistEnabled, setEditingEmailChecklistEnabled] = React.useState(false);
  const [editingReminderIntervalHours, setEditingReminderIntervalHours] = React.useState('24');
  const [editingRepeatEveryWeek, setEditingRepeatEveryWeek] = React.useState(false);
  const [editingRepeatCadence, setEditingRepeatCadence] = React.useState('week');
  const [editingRepeatWeekDay, setEditingRepeatWeekDay] = React.useState('1');
  const [editingRepeatWeekTime, setEditingRepeatWeekTime] = React.useState('09:00');
  const [editingRepeatOccurrences, setEditingRepeatOccurrences] = React.useState('unlimited');
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
    if (!deleteTaskModal) {
      setIsDeletingTask(false);
    }
  }, [deleteTaskModal]);

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
    setEditingRepeatWeekDay(String(editingTask.emailChecklist?.repeatWeekDay ?? new Date().getDay()));
    setEditingRepeatWeekTime(String(editingTask.emailChecklist?.repeatWeekTime || '09:00'));
    setEditingRepeatOccurrences(editingTask.emailChecklist?.repeatOccurrences == null ? 'unlimited' : String(editingTask.emailChecklist.repeatOccurrences));
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
        repeatWeekDay: Number(editingRepeatWeekDay),
        repeatWeekTime: editingRepeatWeekTime,
        repeatOccurrences: editingRepeatOccurrences === 'unlimited' ? null : Number(editingRepeatOccurrences),
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
    editingRepeatWeekDay,
    editingRepeatWeekTime,
    editingRepeatOccurrences,
    editingSelectedPlannerWeekGroup,
    editingTask,
    editingTaskDocumentFile,
    editingTaskDraft,
    editingTaskRecurrence,
    patchTask,
    setError,
    uploadEditingTaskDocument,
  ]);

  return (
    <>
      {activeCommentTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => {
            setCommentTaskId(null);
            setCommentDraft('');
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[13px] text-slate-500">Comments</div>
                <div className="text-lg font-bold text-slate-900">{activeCommentTask.title}</div>
              </div>
              <button type="button" className="w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-50" onClick={() => { setCommentTaskId(null); setCommentDraft(''); }}>
                <X size={14} strokeWidth={2} className="mx-auto text-slate-700" />
              </button>
            </div>
            <div className="p-6 space-y-3 overflow-auto max-h-[55vh]">
              {(activeCommentTask.comments || []).length === 0 ? (
                <div className="text-slate-500 text-sm">No comments yet.</div>
              ) : (
                activeCommentTask.comments
                  .slice()
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((c: any) => {
                    const canEditComment = c.fromEmpId === me.id;
                    const isEditing = editingCommentId === c.id;
                    return (
                      <div key={c.id} className="border border-slate-200 rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-slate-700">{c.fromName || c.fromEmpId || 'User'}</span>
                            {c.editedAt && <span className="text-[10px] text-slate-400">(edited)</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">{new Date(c.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: true })}</span>
                            {canEditComment && (
                              <>
                                <button type="button" onClick={() => { setEditingCommentId(c.id); setEditCommentDraft(c.text); }} className="text-[11px] text-slate-500 hover:text-brand-red">Edit</button>
                                <button type="button" onClick={() => setCommentToDeleteId(c.id)} className="text-[11px] text-red-500 hover:text-red-600">Delete</button>
                              </>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="mt-1 space-y-2">
                            <textarea value={editCommentDraft} onChange={(e) => setEditCommentDraft(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" rows={2} />
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => { setEditingCommentId(null); setEditCommentDraft(''); }} className="px-3 py-1.5 rounded-full border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50">Cancel</button>
                              <button
                                type="button"
                                disabled={!editCommentDraft.trim()}
                                onClick={async () => {
                                  const text = editCommentDraft.trim();
                                  if (!text || !activeCommentTask) return;
                                  try {
                                    const res = await fetch(`${API_BASE}/spaces/tasks/${activeCommentTask.taskId}/comments/${c.id}`, {
                                      method: 'PATCH',
                                      headers: getAuthHeaders(),
                                      body: JSON.stringify({ text }),
                                    });
                                    const data = await res.json().catch(() => ({}));
                                    if (!res.ok) throw new Error(data.message || 'Failed to update comment');
                                    setTasks((prev: any[]) => prev.map((t: any) => t.taskId === activeCommentTask.taskId ? { ...t, comments: Array.isArray(data.comments) ? data.comments : [] } : t));
                                    setEditingCommentId(null);
                                    setEditCommentDraft('');
                                  } catch (e: any) {
                                    setError(e?.message || 'Failed to update comment');
                                  }
                                }}
                                className={`px-4 py-1.5 rounded-full bg-brand-red text-white text-[12px] font-semibold hover:bg-brand-navy ${!editCommentDraft.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[13px] text-slate-800 whitespace-pre-wrap">{c.text}</div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
            <div className="p-6 border-t border-slate-100 space-y-3">
              {mode === 'employee' && (
                <div className="flex items-center gap-3">
                  <label className="text-[13px] font-semibold text-slate-700">
                    Status
                    <select value={modalStatus} onChange={(e) => setModalStatus(e.target.value)} className="ml-2 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white">
                      <option value="todo">To Do</option>
                      <option value="doing">Doing</option>
                      <option value="review">Submitted</option>
                      {mode !== 'employee' && <option value="done">Done</option>}
                      <option value="blocked">Blocked</option>
                    </select>
                  </label>
                </div>
              )}
              <div className="flex gap-3">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                  placeholder="Add a comment or task update..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <button type="button" onClick={handleAddComment} disabled={!commentDraft.trim() || submittingComment} className={`px-6 py-3 rounded-2xl bg-brand-red text-white font-bold hover:bg-brand-navy transition-colors ${!commentDraft.trim() || submittingComment ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  {submittingComment ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {columnToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove field</h3>
            <p className="text-[14px] text-slate-600 mb-6">Are you sure you want to remove &quot;{columnToDelete.name}&quot; from all tasks?</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setColumnToDelete(null)} className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  if (!columnToDelete) return;
                  try {
                    const res = await fetch(`${API_BASE}/spaces/columns/${columnToDelete.id}`, { method: 'DELETE', headers: getAuthHeaders() });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.message || 'Failed to remove field');
                    setColumns(Array.isArray(data.columns) ? data.columns : []);
                    const newTasks = sortedTasks.map((t: any) => {
                      const { [columnToDelete.id]: _omit, ...rest } = t.customFields || {};
                      return { ...t, customFields: rest };
                    });
                    setTasks(newTasks);
                  } catch (e: any) {
                    setError(e?.message || 'Failed to remove field');
                  } finally {
                    setColumnToDelete(null);
                  }
                }}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {activeCommentTask && commentToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete comment</h3>
            <p className="text-[14px] text-slate-600 mb-6">Are you sure you want to delete this comment?</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setCommentToDeleteId(null)} className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  if (!activeCommentTask || !commentToDeleteId) return;
                  try {
                    const res = await fetch(`${API_BASE}/spaces/tasks/${activeCommentTask.taskId}/comments/${commentToDeleteId}`, { method: 'DELETE', headers: getAuthHeaders() });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.message || 'Failed to delete comment');
                    setTasks((prev: any[]) => prev.map((t: any) => t.taskId === activeCommentTask.taskId ? { ...t, comments: Array.isArray(data.comments) ? data.comments : [] } : t));
                  } catch (e: any) {
                    setError(e?.message || 'Failed to delete comment');
                  } finally {
                    setCommentToDeleteId(null);
                  }
                }}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteTaskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setBulkDeleteTaskModalOpen(false)}
        >
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-200 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Delete selected tasks</h3>
              <button
                type="button"
                onClick={() => setBulkDeleteTaskModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[14px] text-slate-600 mb-6">
              Are you sure you want to delete {selectedTaskCount} selected task{selectedTaskCount === 1 ? '' : 's'}? You can close this dialog and deletion will continue in the background.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkDeleteTaskModalOpen(false)}
                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
              <button
                type="button"
                disabled={bulkSaving}
                onClick={() => {
                  setBulkDeleteTaskModalOpen(false);
                  void deleteSelectedTasks();
                }}
                className="inline-flex min-w-[96px] items-center justify-center gap-2 rounded-full bg-brand-red px-5 py-2 text-[13px] font-semibold text-white hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-80"
              >
                {bulkSaving ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Yes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTaskModal && !bulkDeleteTaskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => {
            if (isDeletingTask) return;
            setDeleteTaskModal(null);
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-200 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete task</h3>
            <p className="text-[14px] text-slate-600 mb-6">Are you sure you want to delete &quot;{deleteTaskModal.title}&quot;?</p>
            <div className="flex justify-end gap-3">
              <button type="button" disabled={isDeletingTask} onClick={() => setDeleteTaskModal(null)} className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
              <button
                type="button"
                disabled={isDeletingTask}
                onClick={async () => {
                  if (!deleteTaskModal?.taskId || isDeletingTask) return;
                  setIsDeletingTask(true);
                  try {
                    const ok = await deleteTask(deleteTaskModal.taskId);
                    if (ok) {
                      setDeleteTaskModal(null);
                    }
                  } catch (e: any) {
                    setError(e?.message || 'Failed to delete task');
                  } finally {
                    setIsDeletingTask(false);
                  }
                }}
                className="inline-flex min-w-[116px] items-center justify-center gap-2 rounded-full bg-brand-red px-5 py-2 text-[13px] font-semibold text-white hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-80"
              >
                {isDeletingTask ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-slate-200 p-6">
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-slate-900">Send task back for updates</h3>
              <p className="mt-2 text-[14px] leading-6 text-slate-600">Share a clear reason for rejection and mention what needs to be updated before the employee submits this task again.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 mb-4">
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Task</div>
              <div className="mt-1 text-[15px] font-medium text-slate-900">{rejectTaskModal.title}</div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">Rejection feedback</label>
              <textarea value={rejectFeedbackDraft} onChange={(e) => setRejectFeedbackDraft(e.target.value)} rows={5} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red resize-none" placeholder="Example: The task is not ready for approval yet. Please attach the final update, correct the due-date deliverable, and confirm the client-facing notes are completed." />
              <p className="mt-2 text-[12px] text-slate-500">This feedback will be added to the task comments for the employee.</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setRejectTaskModal(null); setRejectFeedbackDraft(''); }} className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={!rejectFeedbackDraft.trim() || rejectingTask} onClick={confirmRejectTask} className={`px-5 py-2 rounded-full bg-amber-500 text-white text-[13px] font-semibold hover:bg-amber-600 ${!rejectFeedbackDraft.trim() || rejectingTask ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {rejectingTask ? 'Sending...' : 'Send Back'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTask
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

                          {canUseEmailChecklist ? (
                            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-3.5">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-700">Automated Mail Checklist</div>
                                  <p className="mt-1 text-[12px] leading-5 text-slate-500">Email assigned work and repeat only unfinished items.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center">
                                  <input
                                    type="checkbox"
                                    checked={editingEmailChecklistEnabled}
                                    onChange={(event) => {
                                      const enabled = event.target.checked;
                                     setEditingEmailChecklistEnabled(enabled);
                                     if (!enabled) {
                                       setEditingAdditionalChecklistTitles([]);
                                       setEditingRepeatEveryWeek(false);
                                     }
                                    }}
                                    disabled={editingTaskMode === 'view'}
                                    className="peer sr-only"
                                  />
                                  <span className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-emerald-600" />
                                  <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
                                </label>
                              </div>

                              {editingEmailChecklistEnabled ? (
                                <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                                    <div>
                                      <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-700">Repeat Occurrences</div>
                                      <p className="mt-1 text-[11px] text-slate-500">Reactivates this task on the selected repeat interval.</p>
                                    </div>
                                    <label className="relative inline-flex cursor-pointer items-center">
                                      <input type="checkbox" checked={editingRepeatEveryWeek} onChange={(event) => setEditingRepeatEveryWeek(event.target.checked)} disabled={editingTaskMode === 'view'} className="peer sr-only" />
                                      <span className="h-6 w-10 rounded-full bg-slate-200 transition peer-checked:bg-emerald-600" />
                                      <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
                                    </label>
                                  </div>
                                  {editingRepeatEveryWeek ? (
                                    <SpacesWeeklyReminderFields
                                      repeatCadence={editingRepeatCadence}
                                      setRepeatCadence={setEditingRepeatCadence}
                                      repeatWeekDay={editingRepeatWeekDay}
                                      setRepeatWeekDay={setEditingRepeatWeekDay}
                                      repeatWeekTime={editingRepeatWeekTime}
                                      setRepeatWeekTime={setEditingRepeatWeekTime}
                                      repeatOccurrences={editingRepeatOccurrences}
                                      setRepeatOccurrences={setEditingRepeatOccurrences}
                                      disabled={editingTaskMode === 'view'}
                                      fieldName="edit-weekly-occurrences"
                                    />
                                  ) : (
                                    <div>
                                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Email Reminder Gap</label>
                                      <ThemedSelect
                                        value={editingReminderIntervalHours}
                                        onChange={setEditingReminderIntervalHours}
                                        options={EMAIL_REMINDER_GAP_OPTIONS}
                                        compact={true}
                                        fullWidthCompact={true}
                                        disabled={editingTaskMode === 'view'}
                                      />
                                    </div>
                                  )}

                                  <div>
                                    <div className="flex items-center justify-between gap-2">
                                      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Checklist Tasks</label>
                                      <span className="text-[11px] text-slate-400">{1 + editingAdditionalChecklistTitles.length}/5</span>
                                    </div>
                                    <div className="mt-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-[12px] text-slate-600">
                                      1. {String(editingTaskDraft.title || '').trim() || 'Enter the task name above'}
                                    </div>
                                    <div className="mt-2 space-y-2">
                                      {editingAdditionalChecklistTitles.map((taskTitle: string, index: number) => (
                                        <div key={`edit-checklist-title-${index}`} className="flex items-center gap-2">
                                          <input
                                            value={taskTitle}
                                            onChange={(event) => {
                                              const next = [...editingAdditionalChecklistTitles];
                                              next[index] = event.target.value;
                                              setEditingAdditionalChecklistTitles(next);
                                            }}
                                            disabled={editingTaskMode === 'view'}
                                            className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:bg-slate-50"
                                            placeholder={`Checklist task ${index + 2}`}
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingAdditionalChecklistTitles(
                                                editingAdditionalChecklistTitles.filter((_: string, itemIndex: number) => itemIndex !== index),
                                              )
                                            }
                                            disabled={editingTaskMode === 'view'}
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-60"
                                            aria-label={`Remove checklist task ${index + 2}`}
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    {editingAdditionalChecklistTitles.length < 4 ? (
                                      <button
                                        type="button"
                                        onClick={() => setEditingAdditionalChecklistTitles([...editingAdditionalChecklistTitles, ''])}
                                        disabled={editingTaskMode === 'view'}
                                        className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-60"
                                      >
                                        <Plus size={13} /> Add checklist task
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <SpacesTaskCreateRecurrenceFields
                            taskRecurrence={editingTaskRecurrence}
                            setTaskRecurrence={setEditingTaskRecurrence}
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
        : null}
    </>
  );
};

export default SpacesTaskModals;
