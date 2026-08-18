import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchUserTimezone } from '../services/userTimezone';
import { AUTH_STORAGE_KEY } from '../config/api';
import {
  DEFAULT_USER_TIMEZONE,
  USER_TIMEZONE_UPDATED_EVENT,
  getUserTimeZone,
  readStoredUserTimeZone,
  setUserTimeZone,
  subscribeUserTimeZone,
} from '../utils/timezone';

interface TimezoneContextValue {
  timeZone: string;
  setTimeZone: (timeZone: string) => void;
}

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

function getSessionOwnerKey() {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    const employee = parsed?.employee || {};
    return String(employee.empId || employee._id || employee.id || '').trim();
  } catch {
    return '';
  }
}

export const TimezoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ownerKey, setOwnerKey] = useState<string>(() => getSessionOwnerKey());
  const [timeZone, setTimeZoneState] = useState<string>(() => readStoredUserTimeZone());

  useEffect(() => {
    setUserTimeZone(timeZone, { broadcast: false });
  }, [timeZone]);

  useEffect(() => {
    const unsubscribe = subscribeUserTimeZone((next) => {
      setTimeZoneState((current) => (current === next ? current : next));
    });

    const syncOwnerAndTimezone = () => {
      const nextOwner = getSessionOwnerKey();
      setOwnerKey((current) => (current === nextOwner ? current : nextOwner));
      const next = readStoredUserTimeZone();
      setTimeZoneState((current) => (current === next ? current : next));
      setUserTimeZone(next, { broadcast: false });
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === AUTH_STORAGE_KEY ||
        (event.key && event.key.startsWith('rapidgrow-user-timezone'))
      ) {
        syncOwnerAndTimezone();
      }
    };

    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ timezone?: string }>).detail;
      const next = String(detail?.timezone || getUserTimeZone() || DEFAULT_USER_TIMEZONE);
      setTimeZoneState((current) => (current === next ? current : next));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(USER_TIMEZONE_UPDATED_EVENT, handleCustomEvent as EventListener);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(USER_TIMEZONE_UPDATED_EVENT, handleCustomEvent as EventListener);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const nextFromStore = readStoredUserTimeZone();
    setTimeZoneState((current) => (current === nextFromStore ? current : nextFromStore));
    setUserTimeZone(nextFromStore, { broadcast: false });

    fetchUserTimezone()
      .then((next) => {
        if (cancelled) return;
        setTimeZoneState((current) => (current === next ? current : next));
        setUserTimeZone(next, { broadcast: false });
      })
      .catch(() => {
        // Keep the locally stored timezone if the API is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [ownerKey]);

  const setTimeZone = (next: string) => {
    setUserTimeZone(next);
    setTimeZoneState(next);
  };

  const value = useMemo(() => ({ timeZone, setTimeZone }), [timeZone]);

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
};

export function useUserTimeZone() {
  const ctx = useContext(TimezoneContext);
  if (!ctx) {
    return {
      timeZone: getUserTimeZone(),
      setTimeZone: setUserTimeZone,
    };
  }
  return ctx;
}

export const TimezoneScopedApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { timeZone } = useUserTimeZone();
  return (
    <div key={timeZone} className="contents">
      {children}
    </div>
  );
};
