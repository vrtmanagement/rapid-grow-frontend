export type HourlyUpdatedByPerson = {
  empId?: string;
  name?: string;
  at?: string;
};

export type HourlyTrackingEntry = {
  _id: string;
  empId: string;
  empName: string;
  role: string;
  date: string;
  hour: number;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  lastEditedByName?: string;
  lastEditedByEmpId?: string;
  lastEditedAt?: string | null;
  updatedBy?: HourlyUpdatedByPerson[];
  isDeleted?: boolean;
  deletedByEmpId?: string;
  deletedByName?: string;
  deletedAt?: string | null;
};

/** Morning 8:00 AM through night 12:00 AM (hour slots 8–23). */
export const WORKDAY_HOURS = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
] as const;

/** Grow with content up to this height, then scroll. */
export const HOURLY_TEXTAREA_MAX_PX = 160;
export const HOURLY_CONTENT_MAX_CLASS = 'max-h-[160px] overflow-y-auto';

export function autoGrowTextarea(el: HTMLTextAreaElement | null, maxPx = HOURLY_TEXTAREA_MAX_PX) {
  if (!el) return;
  el.style.height = 'auto';
  const next = Math.min(el.scrollHeight, maxPx);
  el.style.height = `${Math.max(next, 56)}px`;
  el.style.overflowY = el.scrollHeight > maxPx ? 'auto' : 'hidden';
}

/** Clean spoken words and punctuation spacing from the browser speech engine. */
export function normalizeSpokenTranscript(spoken: string): string {
  let text = String(spoken || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!text) return '';

  // "hello ," / "okay ?" -> "hello," / "okay?"
  text = text.replace(/\s+([,.!?;:])/g, '$1');
  // "hello.World" / "hello?World" -> "hello. World"
  text = text.replace(/([,.!?;:])(?=[A-Za-z0-9])/g, '$1 ');
  // Collapse leftover spaces; keep intentional paragraph breaks.
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/**
 * Detect trailing voice commands like "submit this record" / "update this one" / "save it".
 * Returns the spoken text with the command removed when a save was requested.
 */
export function extractVoiceSaveCommand(spoken: string): {
  spokenWithoutCommand: string;
  shouldSave: boolean;
} {
  const raw = String(spoken || '');
  if (!raw.trim()) {
    return { spokenWithoutCommand: '', shouldSave: false };
  }

  // End-of-utterance only, so "I will submit later" stays as normal content.
  const saveCommandRe =
    /(?:^|[\s,.;:!?]+)(?:(?:please|now|okay|ok)\s+)*(?:submit|update|save)(?:\s+(?:this|the|it))?(?:\s+(?:one|record|entry|hour|update|box))?(?:\s+please)?[.!]?\s*$/i;

  const match = raw.match(saveCommandRe);
  if (!match || match.index === undefined) {
    return { spokenWithoutCommand: raw, shouldSave: false };
  }

  let spokenWithoutCommand = raw.slice(0, match.index).replace(/[ \t]+$/g, '');
  spokenWithoutCommand = spokenWithoutCommand.replace(/[,.;:!?]+$/g, '').replace(/[ \t]+$/g, '');

  return { spokenWithoutCommand, shouldSave: true };
}

/**
 * Insert spoken text at a caret split (before|after), adding smart gaps
 * and capitalizing after sentence endings.
 */
export function insertSpokenAtCaret(
  beforeRaw: string,
  spokenRaw: string,
  afterRaw: string,
): { text: string; cursor: number } {
  const before = String(beforeRaw || '');
  const after = String(afterRaw || '');
  let spoken = normalizeSpokenTranscript(spokenRaw);
  if (!spoken) {
    return { text: `${before}${after}`, cursor: before.length };
  }

  const beforeEndsSentence = before.length === 0 || /[.!?]\s*$/.test(before) || /\n\s*$/.test(before);
  const beforeEndsSpace = /\s$/.test(before);
  const spokenStartsPunct = /^[,.!?;:]/.test(spoken);

  if (beforeEndsSentence && /^[a-z]/.test(spoken)) {
    spoken = `${spoken.charAt(0).toUpperCase()}${spoken.slice(1)}`;
  }

  const leftGap = before && !beforeEndsSpace && !spokenStartsPunct ? ' ' : '';
  const spokenEndsPunct = /[,.!?;:]$/.test(spoken);
  const rightGap = after && !/^\s/.test(after) && !spokenEndsPunct ? ' ' : '';

  const text = `${before}${leftGap}${spoken}${rightGap}${after}`;
  const cursor = `${before}${leftGap}${spoken}`.length;
  return { text, cursor };
}

export function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

export function formatHourRange(hour: number): string {
  return `${formatHourLabel(hour)} – ${formatHourLabel((hour + 1) % 24)}`;
}

export function getHourlyDeletedByLabel(entry?: HourlyTrackingEntry | null): string | null {
  if (!entry?.isDeleted) return null;
  const name = String(entry.deletedByName || '').trim() || 'someone';
  return `record deleted by ${name}`;
}

/** Show "Updated by: …" when the entry was edited after create (supports multiple people). */
export function getHourlyUpdatedByLabel(entry?: HourlyTrackingEntry | null): string | null {
  if (!entry) return null;

  const namesFromList = Array.isArray(entry.updatedBy)
    ? entry.updatedBy
        .map((person) => String(person?.name || '').trim())
        .filter(Boolean)
    : [];

  // Keep unique names in first-seen order.
  const uniqueNames = Array.from(new Set(namesFromList));

  if (uniqueNames.length > 0) {
    return `Updated by: ${uniqueNames.join(', ')}`;
  }

  // Fallback for older entries that only have lastEditedByName.
  const name = String(entry.lastEditedByName || '').trim();
  if (!name) return null;

  const createdMs = entry.createdAt ? Date.parse(entry.createdAt) : NaN;
  const updatedMs = entry.updatedAt
    ? Date.parse(entry.updatedAt)
    : entry.lastEditedAt
      ? Date.parse(entry.lastEditedAt)
      : NaN;

  const wasUpdated =
    Number.isFinite(createdMs) && Number.isFinite(updatedMs) && updatedMs - createdMs > 1500;

  const editedBySomeoneElse =
    !!entry.lastEditedByEmpId &&
    !!entry.empId &&
    String(entry.lastEditedByEmpId) !== String(entry.empId);

  if (!wasUpdated && !editedBySomeoneElse) return null;
  return `Updated by: ${name}`;
}

export function getCurrentHourInTz(timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const hourPart = parts.find((part) => part.type === 'hour')?.value;
  const hour = Number(hourPart);
  return Number.isFinite(hour) ? hour % 24 : new Date().getHours();
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
      }) => void)
    | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}
