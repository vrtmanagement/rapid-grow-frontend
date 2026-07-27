/**
 * Barrel re-exports for Spaces view helpers.
 * Implementation lives in focused modules under views/.
 */
export type {
  BackendRole,
  CreatePanelTab,
  EmployeeOption,
  ProjectOption,
  SpacesColumn,
  SpacesComment,
  SpacesMode,
  SpacesTask,
  TaskFilterMode,
  TaskPriority,
  TaskStatus,
  WeeklyRangeFilter,
  WeeklyTaskGroup,
} from '../types/spaces';

export {
  buildEmployeeNameLookup,
  resolveEmployeeDisplayName,
  resolveAssigneeLabel,
  enrichTasksWithEmployeeNames,
  isTaskAssignedToViewer,
  safeJsonParse,
  getLoggedInEmployee,
  normalizeRole,
} from './spacesEmployeeHelpers';

export {
  isSubmittedStatus,
  getTaskHubStatusSortRank,
  normalizeTaskStatus,
  TASKHUB_TOP_PRIORITY_LIMIT,
  COMMAND_MATRIX_DISPLAY_LIMIT,
  compareTopPriorityTasks,
  buildTopPriorityTasksForAssignee,
  buildCommandMatrixTopPriorityTasks,
} from './spacesTaskStatusHelpers';

export {
  normalizeTaskForUi,
  getRecurringSourceTaskId,
  isRecurringSeriesTask,
  isRecurringSeriesActive,
  getReviewerLabel,
  getPriorityRowClass,
  getTaskRowClassesForView,
  findScrollableContainer,
  projectCharterPayloadFromBackendProject,
} from './spacesTaskNormalizeHelpers';

export {
  getDownloadableUrl,
  ensureDownloadFileName,
  getTaskAttachments,
  forceDownloadDocument,
} from './spacesAttachmentHelpers';

export {
  getWeekBreadcrumb,
  getSundayStart,
  getDayDisplay,
  getWeekStartDate,
  buildWeeklyTaskGroups,
  buildWeeklyTaskCustomFields,
  createDaysForWeekHelper,
  ensureWeeklyGroupPersistedHelper,
  toggleDailyHelper,
} from './spacesWeeklyHelpers';

export {
  shouldHideAdminTaskFromViewer,
  isTaskLockedForView,
  canEditTaskForView,
  canDeleteTaskForView,
  canValidateTaskForView,
  canCommentOnTaskForView,
  canEditDueDateForView,
  canChangeStatusForView,
  upsertTaskByIdHelper,
  assigneeOptionsForTaskHelper,
  handleAddColumnHelper,
} from './spacesPermissionsHelpers';
