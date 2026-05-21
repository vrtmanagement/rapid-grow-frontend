import React from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Briefcase,
  CalendarClock,
  CircleCheck,
  CircleX,
  ClipboardList,
  FileText,
  Inbox,
  LayoutGrid,
  LogOut,
  MessageSquare,
  NotebookPen,
  Palmtree,
  Send,
  UserCircle,
  UsersRound,
} from 'lucide-react';
import { getDisplayAvatarUrl } from '../../utils/avatar';
import type { AppShellNotification } from './authenticatedShellTypes';

function getNotificationIconMeta(notification: AppShellNotification): { Icon: LucideIcon; wrapClass: string } {
  const t = String(notification.type || '').trim();
  const titleLower = String(notification.title || '').toLowerCase();
  const routeLower = String(notification.route || '').toLowerCase();
  const meta = notification.metadata && typeof notification.metadata === 'object' ? notification.metadata : {};
  const cat = String((meta as { category?: string }).category || '').toLowerCase();

  if (t === 'daily_review_reminder') {
    return { Icon: CalendarClock, wrapClass: 'bg-violet-100 text-violet-700' };
  }
  if (t === 'leave_request_submitted') {
    return { Icon: Send, wrapClass: 'bg-emerald-100 text-emerald-700' };
  }
  if (t === 'leave_request_review') {
    return { Icon: Inbox, wrapClass: 'bg-amber-100 text-amber-800' };
  }
  if (t === 'leave_request_status') {
    const rejected = titleLower.includes('reject');
    return rejected
      ? { Icon: CircleX, wrapClass: 'bg-rose-100 text-rose-700' }
      : { Icon: CircleCheck, wrapClass: 'bg-emerald-100 text-emerald-700' };
  }

  if (cat === 'leave' || /leave/i.test(notification.title || '') || /leave/i.test(notification.message || '') || routeLower.includes('leave')) {
    return { Icon: Palmtree, wrapClass: 'bg-teal-100 text-teal-700' };
  }
  if (routeLower.includes('attendance')) {
    return { Icon: ClipboardList, wrapClass: 'bg-sky-100 text-sky-700' };
  }
  if (routeLower.includes('review')) {
    return { Icon: NotebookPen, wrapClass: 'bg-violet-100 text-violet-700' };
  }
  if (routeLower.includes('content')) {
    return { Icon: FileText, wrapClass: 'bg-fuchsia-100 text-fuchsia-700' };
  }
  if (routeLower.includes('communication')) {
    return { Icon: MessageSquare, wrapClass: 'bg-blue-100 text-blue-700' };
  }
  if (routeLower.includes('crm')) {
    return { Icon: Briefcase, wrapClass: 'bg-orange-100 text-orange-800' };
  }
  if (routeLower.includes('spaces')) {
    return { Icon: LayoutGrid, wrapClass: 'bg-indigo-100 text-indigo-700' };
  }
  if (routeLower.includes('staff')) {
    return { Icon: UsersRound, wrapClass: 'bg-slate-200 text-slate-700' };
  }

  return { Icon: Bell, wrapClass: 'bg-slate-100 text-slate-600' };
}

interface NotificationBellMenuProps {
  notificationMenuOpen: boolean;
  unreadNotificationCount: number;
  notificationsLoading: boolean;
  notifications: AppShellNotification[];
  setNotificationMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setUserMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openNotification: (notification: AppShellNotification) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
}

export const NotificationBellMenu: React.FC<NotificationBellMenuProps> = ({
  notificationMenuOpen,
  unreadNotificationCount,
  notificationsLoading,
  notifications,
  setNotificationMenuOpen,
  setUserMenuOpen,
  openNotification,
  markNotificationRead,
}) => (
  <div className="relative">
    <button
      type="button"
      onClick={() => {
        setNotificationMenuOpen((value) => !value);
        setUserMenuOpen(false);
      }}
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
      aria-label="Notifications"
      aria-expanded={notificationMenuOpen}
      aria-haspopup="true"
    >
      <Bell size={18} />
      {unreadNotificationCount > 0 && (
        <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-brand-red px-1.5 py-0.5 text-center text-[11px] font-semibold text-white shadow-sm">
          {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
        </span>
      )}
    </button>
    {notificationMenuOpen && createPortal(
      <>
        <div className="fixed inset-0 z-[9998]" aria-hidden onClick={() => setNotificationMenuOpen(false)} />
        <div className="fixed right-4 top-20 z-[9999] w-[min(100vw-1.25rem,28rem)] overflow-hidden rounded-2xl bg-white shadow-[0_22px_50px_rgba(15,23,42,0.16)] dark:bg-slate-900 sm:right-8">
          <div className="border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 sm:px-5 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                <p className="text-xs text-slate-500">
                  {unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'All caught up'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationMenuOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {notificationsLoading ? (
              <div className="px-4 py-6 text-sm text-slate-500 sm:px-5">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500 sm:px-5">No notifications available.</div>
            ) : (
              notifications.map((notification) => {
                const { Icon, wrapClass } = getNotificationIconMeta(notification);
                const rowTint = notification.isRead ? '' : 'bg-red-50/50';
                return (
                  <div
                    key={notification._id}
                    className={`border-b border-slate-100 last:border-b-0 ${rowTint}`}
                  >
                    <button
                      type="button"
                      onClick={() => void openNotification(notification)}
                      className={`flex w-full items-start gap-3 px-4 py-4 text-left transition sm:px-5 ${
                        notification.isRead ? 'hover:bg-slate-50/90' : 'hover:bg-red-50/70'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${wrapClass}`}>
                        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold leading-snug text-slate-900">{notification.title}</span>
                          {!notification.isRead ? (
                            <span className="mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-brand-red shadow-sm" aria-hidden />
                          ) : null}
                        </span>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{notification.message}</p>
                        <p className="mt-2 text-[12px] font-medium text-slate-400">
                          {new Date(notification.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: true })}
                        </p>
                      </span>
                    </button>
                    {!notification.isRead ? (
                      <div className="flex justify-end px-4 pb-3 sm:px-5">
                        <button
                          type="button"
                          onClick={() => void markNotificationRead(notification._id)}
                          className="text-xs font-semibold text-brand-red hover:text-slate-900"
                        >
                          Mark as read
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </>,
      document.body,
    )}
  </div>
);

interface UserAccountMenuProps {
  userMenuOpen: boolean;
  setUserMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNotificationMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userName: string;
  userRole: string;
  userAvatar?: string;
  onLogout: () => void;
}

export const UserAccountMenu: React.FC<UserAccountMenuProps> = ({
  userMenuOpen,
  setUserMenuOpen,
  setNotificationMenuOpen,
  userName,
  userRole,
  userAvatar,
  onLogout,
}) => (
  <div className="relative">
    <button
      type="button"
      onClick={() => {
        setUserMenuOpen((v) => !v);
        setNotificationMenuOpen(false);
      }}
      className="flex items-center gap-4 rounded-xl py-1 pr-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
      aria-expanded={userMenuOpen}
      aria-haspopup="true"
    >
      <div className="text-right">
        <div className="text-sm font-medium leading-tight text-slate-900">{userName}</div>
        <div className="mt-0.5 text-xs text-brand-red">{userRole}</div>
      </div>
      <img
        src={getDisplayAvatarUrl(userAvatar, userName)}
        className="h-11 w-11 rounded-full border-2 border-white bg-slate-50 object-cover shadow-md dark:border-slate-800 dark:bg-slate-900"
        alt=""
      />
    </button>
    {userMenuOpen && createPortal(
      <>
        <div className="fixed inset-0 z-[9998]" aria-hidden onClick={() => setUserMenuOpen(false)} />
        <div className="fixed right-8 top-20 z-[9999] w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => { setUserMenuOpen(false); window.location.hash = '#/profile'; }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-slate-700 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <UserCircle size={18} className="text-slate-500" />
            Profile
          </button>
          <button
            type="button"
            onClick={() => { setUserMenuOpen(false); onLogout(); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-slate-700 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <LogOut size={18} className="text-slate-500" />
            Logout
          </button>
        </div>
      </>,
      document.body
    )}
  </div>
);
