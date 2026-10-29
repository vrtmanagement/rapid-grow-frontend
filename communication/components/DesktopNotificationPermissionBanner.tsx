import React, { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import {
  ensureDesktopNotificationPermission,
  getDesktopNotificationPermission,
  registerCommunicationNotificationServiceWorker,
} from '../browserNotifications';

const DISMISS_KEY = 'rapidgrow-comm-desktop-notif-banner-dismissed';

export function DesktopNotificationPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    void registerCommunicationNotificationServiceWorker();

    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      // ignore
    }

    const permission = getDesktopNotificationPermission();
    if (permission === 'default') {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    try {
      await registerCommunicationNotificationServiceWorker();
      const permission = await ensureDesktopNotificationPermission();
      if (permission === 'granted') {
        setVisible(false);
      } else if (permission === 'denied') {
        setVisible(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[10000] flex justify-center sm:left-auto sm:right-4 sm:justify-end">
      <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-brand-red/20 bg-white p-3.5 shadow-2xl ring-1 ring-black/5">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-brand-red">
          <BellRing size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Enable message notifications</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            Allow browser notifications to get WhatsApp-style alerts when you are on another tab or app.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void enable()}
              className="rounded-full bg-brand-red px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-red/90 disabled:opacity-60"
            >
              {busy ? 'Enabling…' : 'Allow notifications'}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
