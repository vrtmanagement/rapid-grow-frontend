/** Notifications shown in the top bar (aligned with App.tsx / api shape). */
export interface AppShellNotification {
  _id: string;
  empId: string;
  title: string;
  message: string;
  type: string;
  route: string;
  dateKey: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  /** Optional payload from API (e.g. leaveId); used only for UI hints when present. */
  metadata?: Record<string, unknown>;
}
