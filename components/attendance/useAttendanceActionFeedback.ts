import { useRef, useState } from 'react';

/** Tracks visual progress and prevents duplicate actions on the same record. */
export function useAttendanceActionFeedback() {
  const active = useRef(new Set<string>());
  const [pending, setPending] = useState<Record<string, string>>({});

  const run = async (key: string, action: string, callback: () => void | Promise<void>) => {
    if (active.current.has(key)) return;
    active.current.add(key);
    setPending((current) => ({ ...current, [key]: action }));
    try {
      await callback();
    } finally {
      active.current.delete(key);
      setPending((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  return { pending, run };
}
