import type { Goal, PlanningState } from '../types';

export type SpacesMode = 'employee' | 'manager';
export type BackendRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | string;
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskFilterMode = 'all' | 'me' | 'assigned';
export type CreatePanelTab = 'add-task' | 'top-priorities' | 'weekly-tasks';
export type WeeklyRangeFilter = 'this-week' | 'next-week' | 'two-weeks' | 'month';
export type TaskRecurrenceScheduleMode = 'day' | 'date';

export interface SpacesViewProps {
  mode: SpacesMode;
  state?: PlanningState;
  updateState?: (updater: (prev: PlanningState) => PlanningState) => PlanningState;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  vision?: string;
}

export interface EmployeeOption {
  empId: string;
  empName: string;
  avatar?: string;
  role?: BackendRole;
}

export interface SpacesColumn {
  id: string;
  name: string;
}

export interface SpacesComment {
  id: string;
  text: string;
  fromEmpId?: string;
  fromName?: string;
  createdAt: string;
  editedAt?: string;
}

export interface SpacesTaskRecurrence {
  enabled?: boolean;
  frequency?: 'secondly' | 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly' | '';
  interval?: number;
  maxOccurrences?: number;
  generatedCount?: number;
  nextRunAt?: string | null;
  endDate?: string | null;
  sourceTaskId?: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  startMonth?: number | null;
  endMonth?: number | null;
}

export interface SpacesTaskEmailChecklist {
  enabled?: boolean;
  reminderIntervalHours?: number;
  nextReminderAt?: string | null;
  lastSentAt?: string | null;
}

export interface SpacesTask {
  taskId: string;
  title: string;
  description?: string;
  documentUrl?: string;
  documentName?: string;
  documentMimeType?: string;
  projectId?: string;
  projectTaskId?: string;
  assigneeId?: string;
  assigneeName?: string;
  isViewed?: boolean;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  recurrence?: SpacesTaskRecurrence;
  emailChecklist?: SpacesTaskEmailChecklist;
  submittedFromStatus?: string;
  comments: SpacesComment[];
  customFields: Record<string, string>;
  createdByEmpId?: string;
  createdByName?: string;
  createdByRole?: BackendRole;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyTaskGroup {
  week: Goal;
  days: Goal[];
  month?: Goal;
  quarter?: Goal;
  year?: Goal;
  yearId: string;
  quarterId: string;
  monthId: string;
  weekId: string;
  yearLabel: string;
  quarterLabel: string;
  monthLabel: string;
  weekLabel: string;
  quarterNumber: number;
  calendarMonthNumber: number;
  calendarMonthName: string;
  yearWeekNumber: number;
  breadcrumbLabel: string;
  weekRangeLabel: string;
  weekSummaryLabel: string;
  weekStart: Date;
  weekEnd: Date;
  monthIndexInQuarter: number;
  weekIndexInMonth: number;
  isPlaceholderWeek?: boolean;
  weekSelectionKey: string;
}

export interface TaskRecurrenceDraft {
  enabled: boolean;
  scheduleMode: TaskRecurrenceScheduleMode;
  dayOfWeek: string;
  dayOfMonth: string;
  time: string;
  startMonth: string;
  endMonth: string;
  repeatCount: string;
}
