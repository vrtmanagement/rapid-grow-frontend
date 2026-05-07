import React from 'react';
import { X } from 'lucide-react';

interface AppNotification {
  _id: string;
  route: string;
}

interface GlobalLeaveToast {
  title: string;
  message: string;
  tone: 'info' | 'success' | 'warning';
}

interface GlobalTaskToast {
  title: string;
  message: string;
  tone: 'info' | 'success' | 'warning';
  route: string;
}

interface GlobalReminderToast {
  notificationId: string;
  title: string;
  message: string;
  route: string;
  autoHideMs?: number;
}

interface GlobalAppToastsProps {
  globalLeaveToast: GlobalLeaveToast | null;
  globalTaskToast: GlobalTaskToast | null;
  globalReminderToast: GlobalReminderToast | null;
  notifications: AppNotification[];
  notificationToastTopClass: string;
  openNotification: (notification: AppNotification) => Promise<void>;
  setGlobalTaskToast: (value: GlobalTaskToast | null) => void;
  setGlobalReminderToast: (value: GlobalReminderToast | null) => void;
  dismissGlobalReminderToast: (value: GlobalReminderToast | null) => void;
}

const GlobalAppToasts: React.FC<GlobalAppToastsProps> = ({
  globalLeaveToast,
  globalTaskToast,
  globalReminderToast,
  notifications,
  notificationToastTopClass,
  openNotification,
  setGlobalTaskToast,
  setGlobalReminderToast,
  dismissGlobalReminderToast,
}) => (
  <>
    {globalLeaveToast ? (
      <div className="fixed right-6 top-6 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
        <div
          className={`max-w-sm rounded-[24px] border bg-white px-5 py-4 shadow-[0_22px_50px_rgba(15,23,42,0.16)] ${
            globalLeaveToast.tone === 'success'
              ? 'border-emerald-200'
              : globalLeaveToast.tone === 'warning'
                ? 'border-rose-200'
                : 'border-sky-200'
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-[0.14em] ${
              globalLeaveToast.tone === 'success'
                ? 'text-emerald-600'
                : globalLeaveToast.tone === 'warning'
                  ? 'text-rose-600'
                  : 'text-sky-600'
            }`}
          >
            Live update
          </p>
          <p className="mt-2 text-base font-semibold text-slate-950">{globalLeaveToast.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{globalLeaveToast.message}</p>
        </div>
      </div>
    ) : null}

    {globalTaskToast ? (
      <button
        type="button"
        onClick={() => {
          const nextRoute = globalTaskToast.route.startsWith('/') ? globalTaskToast.route : `/${globalTaskToast.route}`;
          window.location.hash = `#${nextRoute}`;
          setGlobalTaskToast(null);
        }}
        className={`fixed right-6 z-[101] max-w-sm rounded-[24px] border bg-white px-5 py-4 text-left shadow-[0_22px_50px_rgba(15,23,42,0.16)] animate-in slide-in-from-top-2 fade-in duration-300 ${
          globalLeaveToast ? 'top-32' : 'top-6'
        } ${
          globalTaskToast.tone === 'success'
            ? 'border-emerald-200'
            : globalTaskToast.tone === 'warning'
              ? 'border-amber-200'
              : 'border-sky-200'
        }`}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-[0.14em] ${
            globalTaskToast.tone === 'success'
              ? 'text-emerald-600'
              : globalTaskToast.tone === 'warning'
                ? 'text-amber-600'
                : 'text-sky-600'
          }`}
        >
          Task update
        </p>
        <p className="mt-2 text-base font-semibold text-slate-950">{globalTaskToast.title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{globalTaskToast.message}</p>
        <p className="mt-3 text-[12px] font-semibold text-brand-red">Open TaskHub</p>
      </button>
    ) : null}

    {globalReminderToast ? (
      <div
        className={`fixed right-6 z-[102] max-w-sm rounded-[24px] border border-brand-red/20 bg-white px-5 py-4 text-left shadow-[0_22px_50px_rgba(15,23,42,0.16)] animate-in slide-in-from-top-2 fade-in duration-300 ${notificationToastTopClass}`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-red">
            Reminder
          </p>
          <button
            type="button"
            aria-label="Close reminder"
            onClick={() => dismissGlobalReminderToast(globalReminderToast)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
          >
            <X size={15} strokeWidth={2.25} />
          </button>
        </div>
        <p className="mt-2 text-base font-semibold text-slate-950">{globalReminderToast.title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{globalReminderToast.message}</p>
        <button
          type="button"
          onClick={() => {
            const notification = notifications.find((item) => item._id === globalReminderToast.notificationId);
            if (notification) {
              void openNotification(notification);
              return;
            }

            const nextRoute = globalReminderToast.route.startsWith('/') ? globalReminderToast.route : `/${globalReminderToast.route}`;
            window.location.hash = `#${nextRoute}`;
            setGlobalReminderToast(null);
          }}
          className="mt-3 text-[12px] font-semibold text-brand-red transition-colors hover:text-red-700"
        >
          Open Notification
        </button>
      </div>
    ) : null}
  </>
);

export default GlobalAppToasts;
