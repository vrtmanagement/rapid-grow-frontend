import React from 'react';
import { createPortal } from 'react-dom';
import { Bell, LogOut, UserCircle } from 'lucide-react';

interface AppNotification {
  _id: string;
  title: string;
  message: string;
  route: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellMenuProps {
  notificationMenuOpen: boolean;
  unreadNotificationCount: number;
  notificationsLoading: boolean;
  notifications: AppNotification[];
  setNotificationMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setUserMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openNotification: (notification: AppNotification) => Promise<void>;
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
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
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
        <div className="fixed right-8 top-20 z-[9999] w-[24rem] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_22px_50px_rgba(15,23,42,0.16)]">
          <div className="border-b border-slate-100 px-5 py-4">
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

          <div className="max-h-[26rem] overflow-y-auto px-3 py-3">
            {notificationsLoading ? (
              <div className="px-3 py-6 text-sm text-slate-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="px-3 py-6 text-sm text-slate-500">No notifications available.</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`mb-3 rounded-[20px] border px-4 py-4 last:mb-0 ${
                    notification.isRead ? 'border-slate-200 bg-slate-50' : 'border-brand-red/20 bg-red-50/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void openNotification(notification)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                        <p className="mt-2 text-[12px] font-medium text-slate-400">
                          {new Date(notification.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: true })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-brand-red shadow-sm" />
                      )}
                    </div>
                  </button>
                  {!notification.isRead && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void markNotificationRead(notification._id);
                        }}
                        className="text-xs font-semibold text-brand-red hover:text-slate-900"
                      >
                        Mark as read
                      </button>
                    </div>
                  )}
                </div>
              ))
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
      className="flex items-center gap-4 rounded-xl py-1 pr-1 transition-colors hover:bg-slate-50"
      aria-expanded={userMenuOpen}
      aria-haspopup="true"
    >
      <div className="text-right">
        <div className="text-sm font-medium leading-tight text-slate-900">{userName}</div>
        <div className="mt-0.5 text-xs text-brand-red">{userRole}</div>
      </div>
      <img
        src={
          userAvatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            (userName || 'User').replace(/\s/g, ''),
          )}`
        }
        className="h-11 w-11 rounded-full border-2 border-white bg-slate-50 object-cover shadow-md"
        alt=""
      />
    </button>
    {userMenuOpen && createPortal(
      <>
        <div className="fixed inset-0 z-[9998]" aria-hidden onClick={() => setUserMenuOpen(false)} />
        <div className="fixed right-8 top-20 z-[9999] w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
          <button
            type="button"
            onClick={() => { setUserMenuOpen(false); window.location.hash = '#/profile'; }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-slate-700 transition-colors hover:bg-slate-50"
          >
            <UserCircle size={18} className="text-slate-500" />
            Core Identity
          </button>
          <button
            type="button"
            onClick={() => { setUserMenuOpen(false); onLogout(); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-slate-700 transition-colors hover:bg-slate-50"
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
