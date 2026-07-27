import type { PlanningState } from '../types';
import type { DailyCompletedTaskSyncItem } from '../services/reviewMatrixAccomplishmentSync';

export type ReflectionPanel = 'form' | 'logs';

export interface ReflectionViewProps {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  loading?: boolean;
}

export interface ReflectionRecord {
  _id: string;
  empId: string;
  empName: string;
  role: string;
  accomplishments: string;
  challenges: string;
  unfinished: string;
  energyPeaks: string;
  bigRocksTomorrow: string;
  date: string;
  createdAt: string;
  updatedAt?: string;
  lastEditedByName?: string;
  lastEditedByEmpId?: string;
  avatar?: string;
}

export interface DailyReflectionSyncResponse {
  date: string;
  reviewMatrixId: string;
  syncSource: string;
  lastSyncedAt?: string | null;
  importedTaskIds?: string[];
  dismissedTaskIds?: string[];
  importedTaskCount?: number;
  totalCompletedTaskCount?: number;
  tasks?: DailyCompletedTaskSyncItem[];
}

export function getIndiaDateKey(offsetDays = 0): string {
  const baseDate = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(baseDate);
  const year = parts.find((part) => part.type === 'year')?.value || '0000';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}


