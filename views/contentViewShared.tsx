import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, BookOpenText, Bot, Calendar, CalendarDays, ChevronLeft, ChevronRight, FileText, Globe, Linkedin, Mail, MessageSquareText, Sparkles, Youtube } from 'lucide-react';
import { ContentAsset, ContentDraftRecord, ContentType } from '../services/contentApi';

export const TYPE_LABEL: Record<ContentType, string> = {
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  general: 'General',
  newsletter: 'Mail',
  website: 'Website',
};

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEK_DAY_HEADER_CLASS = [
  'bg-blue-50 text-blue-700',
  'bg-indigo-50 text-indigo-700',
  'bg-violet-50 text-violet-700',
  'bg-fuchsia-50 text-fuchsia-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
];

export const LINK_STORAGE_KEY = 'rapidgrow-content-links-v1';
export const TAG_STORAGE_KEY = 'rapidgrow-content-tags-v1';
export const CONTENT_VIEW_DRAFTS_KEY = 'rapidgrow-content-view-drafts-v1';
export const CONTENT_CREATE_DRAFT_STORAGE_PREFIX = 'rapidgrow-content-create-draft-v1';
export const MOMENT_STORAGE_KEY = 'rapidgrow-content-moments-v1';
export type ContentTab = 'calendar' | 'follow-ee' | 'follow-ega' | 'auto-add' | 'content-schedule' | 'blog';

export type MomentEntry = {
  id: string;
  date: string;
  topic: string;
  text: string;
  createdAt: string;
};

export function isContentType(value: string): value is ContentType {
  return value === 'linkedin' || value === 'youtube' || value === 'general' || value === 'newsletter' || value === 'website';
}

export const TAB_META: Record<ContentTab, { label: string; icon: React.ElementType; activeClass: string; idleClass: string }> = {
  calendar: {
    label: 'Calendar',
    icon: CalendarDays,
    activeClass: 'border-violet-300 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_18px_40px_rgba(139,92,246,0.26)]',
    idleClass: 'border-white/70 bg-white/75 text-slate-700 hover:border-violet-200 hover:bg-violet-50/90',
  },
  'follow-ee': {
    label: 'Follow Reminder EE',
    icon: BellRing,
    activeClass: 'border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_18px_40px_rgba(16,185,129,0.22)]',
    idleClass: 'border-white/70 bg-white/75 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/90',
  },
  'follow-ega': {
    label: 'Follow Reminder EGA',
    icon: Sparkles,
    activeClass: 'border-indigo-300 bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_18px_40px_rgba(99,102,241,0.22)]',
    idleClass: 'border-white/70 bg-white/75 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/90',
  },
  'auto-add': {
    label: 'Auto Add',
    icon: Bot,
    activeClass: 'border-fuchsia-300 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-[0_18px_40px_rgba(217,70,239,0.22)]',
    idleClass: 'border-white/70 bg-white/75 text-slate-700 hover:border-fuchsia-200 hover:bg-fuchsia-50/90',
  },
  'content-schedule': {
    label: 'Content Schedule',
    icon: MessageSquareText,
    activeClass: 'border-amber-300 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_18px_40px_rgba(245,158,11,0.24)]',
    idleClass: 'border-white/70 bg-white/75 text-slate-700 hover:border-amber-200 hover:bg-amber-50/90',
  },
  blog: {
    label: 'Blog',
    icon: BookOpenText,
    activeClass: 'border-cyan-300 bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_18px_40px_rgba(8,145,178,0.24)]',
    idleClass: 'border-white/70 bg-white/75 text-slate-700 hover:border-cyan-200 hover:bg-cyan-50/90',
  },
};

export const TYPE_ACCENT: Record<ContentType, { badge: string; tone: string; chip: string; counter: string; previewIndex: string; previewDot: string; highlight: string; previewRow: string }> = {
  linkedin: {
    badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
    tone: 'from-sky-400/25 via-sky-100/55 to-transparent',
    chip: 'bg-sky-100 text-sky-700',
    counter: 'border-sky-200/80 text-sky-700 shadow-[0_8px_20px_rgba(56,189,248,0.12)]',
    previewIndex: 'bg-sky-100 text-sky-700',
    previewDot: 'bg-sky-400/50 shadow-[0_0_0_4px_rgba(56,189,248,0.10)]',
    highlight: 'border-sky-300/70 ring-2 ring-sky-200/60 shadow-[0_26px_60px_rgba(56,189,248,0.16)]',
    previewRow: 'from-sky-50/80 via-white to-white ring-sky-100/80',
  },
  youtube: {
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
    tone: 'from-rose-400/20 via-rose-100/50 to-transparent',
    chip: 'bg-rose-100 text-rose-700',
    counter: 'border-rose-200/80 text-rose-700 shadow-[0_8px_20px_rgba(244,63,94,0.12)]',
    previewIndex: 'bg-rose-100 text-rose-700',
    previewDot: 'bg-rose-400/50 shadow-[0_0_0_4px_rgba(244,63,94,0.10)]',
    highlight: 'border-rose-300/70 ring-2 ring-rose-200/60 shadow-[0_26px_60px_rgba(244,63,94,0.16)]',
    previewRow: 'from-rose-50/80 via-white to-white ring-rose-100/80',
  },
  general: {
    badge: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    tone: 'from-emerald-400/30 via-emerald-100/65 to-transparent',
    chip: 'bg-emerald-100 text-emerald-700',
    counter: 'border-emerald-200/80 text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.12)]',
    previewIndex: 'bg-emerald-100 text-emerald-700',
    previewDot: 'bg-emerald-400/50 shadow-[0_0_0_4px_rgba(16,185,129,0.10)]',
    highlight: 'border-emerald-300/70 ring-2 ring-emerald-200/60 shadow-[0_26px_60px_rgba(16,185,129,0.16)]',
    previewRow: 'from-emerald-50/95 via-white to-white ring-emerald-100/90',
  },
  newsletter: {
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    tone: 'from-amber-300/20 via-amber-50/60 to-transparent',
    chip: 'bg-amber-100 text-amber-700',
    counter: 'border-amber-200/80 text-amber-700 shadow-[0_8px_20px_rgba(245,158,11,0.12)]',
    previewIndex: 'bg-amber-100 text-amber-700',
    previewDot: 'bg-amber-400/55 shadow-[0_0_0_4px_rgba(245,158,11,0.10)]',
    highlight: 'border-amber-300/70 ring-2 ring-amber-200/60 shadow-[0_26px_60px_rgba(245,158,11,0.16)]',
    previewRow: 'from-amber-50/80 via-white to-white ring-amber-100/80',
  },
  website: {
    badge: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
    tone: 'from-indigo-300/20 via-indigo-50/60 to-transparent',
    chip: 'bg-indigo-100 text-indigo-700',
    counter: 'border-indigo-200/80 text-indigo-700 shadow-[0_8px_20px_rgba(99,102,241,0.12)]',
    previewIndex: 'bg-indigo-100 text-indigo-700',
    previewDot: 'bg-indigo-400/50 shadow-[0_0_0_4px_rgba(99,102,241,0.10)]',
    highlight: 'border-indigo-300/70 ring-2 ring-indigo-200/60 shadow-[0_26px_60px_rgba(99,102,241,0.16)]',
    previewRow: 'from-indigo-50/80 via-white to-white ring-indigo-100/80',
  },
};

export const TYPE_ICON_META: Record<ContentType, { icon: React.ElementType; className: string; label: string }> = {
  linkedin: { icon: Linkedin, className: 'bg-sky-100 text-sky-700', label: 'LinkedIn' },
  youtube: { icon: Youtube, className: 'bg-rose-100 text-rose-700', label: 'YouTube' },
  general: { icon: FileText, className: 'bg-emerald-100 text-emerald-700', label: 'General' },
  newsletter: { icon: Mail, className: 'bg-amber-100 text-amber-700', label: 'Mail' },
  website: { icon: Globe, className: 'bg-indigo-100 text-indigo-700', label: 'Website' },
};

export function getInitialTab(search: string): ContentTab {
  const tab = String(new URLSearchParams(search).get('tab') || '').trim().toLowerCase();
  if (tab === 'follow-ee' || tab === 'follow-ega' || tab === 'auto-add' || tab === 'content-schedule' || tab === 'blog') return tab;
  return 'calendar';
}

function parseDateValue(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value?: string): string {
  const parsed = parseDateValue(value);
  if (!parsed) return 'mm/dd/yyyy';
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${month}/${day}/${year}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const CALENDAR_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const ScheduleDatePicker: React.FC<{
  value?: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => parseDateValue(value) || new Date());

  useEffect(() => {
    const parsed = parseDateValue(value);
    if (parsed) setViewDate(parsed);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const monthLabel = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const selectedDate = parseDateValue(value);
  const today = new Date();
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const startDay = startOfMonth.getDay();
    const gridStart = new Date(startOfMonth);
    gridStart.setDate(startOfMonth.getDate() - startDay);
    for (let i = 0; i < 42; i += 1) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [startOfMonth]);

  const handleSelect = (date: Date) => {
    onChange(formatDateValue(date));
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-11 text-left text-sm outline-none transition hover:border-slate-300 focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{formatDateLabel(value)}</span>
        <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-[270px] rounded-[22px] border border-slate-200 bg-white p-2.5 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[14px] font-semibold text-slate-900">{monthLabel}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-red/20 hover:bg-red-50 hover:text-brand-red"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-red/20 hover:bg-red-50 hover:text-brand-red"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {CALENDAR_WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const inCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isTodayValue = isSameDay(day, today);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={`h-8 rounded-xl text-[13px] transition-colors ${
                    isSelected
                      ? 'bg-brand-red text-white shadow-md'
                      : inCurrentMonth
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-300 hover:bg-slate-50'
                  } ${isTodayValue && !isSelected ? 'border border-brand-red/20 bg-red-50 text-brand-red' : ''}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-[12px] font-semibold text-slate-500 hover:text-brand-red"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleSelect(new Date())}
              className="rounded-full bg-brand-red px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-navy"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export function nameInitials(name: string) {
  const clean = (name || '').trim();
  if (!clean) return 'U';
  const parts = clean.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export function getLoggedInUser() {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    const parsed = raw ? JSON.parse(raw) : null;
    const employee = parsed?.employee || {};
    return {
      empId: String(employee.empId || employee._id || '').trim(),
      role: String(employee.role || '').trim().toUpperCase(),
    };
  } catch {
    return { empId: '', role: '' };
  }
}

export function isAdminRole(role: string) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function formatUsDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

/** Date + time when content was created (e.g. cards, previews); matches card time zone. */
export function formatContentCreatedStamp(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
  return `${datePart} · ${timePart}`;
}

export function findScrollContainer(node: HTMLElement | null): HTMLElement | Window {
  let current = node?.parentElement || null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && current.scrollHeight > current.clientHeight;

    if (isScrollable) {
      return current;
    }

    current = current.parentElement;
  }

  return window;
}

export function autoResizeTextarea(target: HTMLTextAreaElement) {
  const container = findScrollContainer(target);
  const previousContainerScrollTop = container === window ? window.scrollY : container.scrollTop;
  const previousTextareaScrollTop = target.scrollTop;
  target.style.height = 'auto';
  target.style.height = `${target.scrollHeight}px`;
  target.scrollTop = previousTextareaScrollTop;
  if (container === window) {
    window.scrollTo({ top: previousContainerScrollTop, behavior: 'auto' });
  } else {
    container.scrollTop = previousContainerScrollTop;
  }
}

function renderStyledDescription(text: string) {
  const value = String(text || '');
  if (!value.trim()) return 'No description';
  const tokenRegex = /(<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>|<(?:em|i)>([\s\S]*?)<\/(?:em|i)>|<u>([\s\S]*?)<\/u>|https?:\/\/\S+|#[^\s#]+)/gi;
  const fragments: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      fragments.push(<React.Fragment key={`plain-${matchIndex}`}>{value.slice(lastIndex, match.index)}</React.Fragment>);
    }

    const token = match[0];
    if (/^https?:\/\/\S+$/i.test(token)) {
      fragments.push(
        <a
          key={`link-${matchIndex}`}
          href={token}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          {token}
        </a>,
      );
    } else if (/^#[^\s#]+$/.test(token)) {
      fragments.push(
        <strong key={`hash-${matchIndex}`} className="font-semibold text-slate-800">
          {token}
        </strong>,
      );
    } else if (/^<(?:strong|b)>/i.test(token)) {
      fragments.push(
        <strong key={`bold-${matchIndex}`} className="font-semibold text-slate-800">
          {token.replace(/^<(?:strong|b)>/i, '').replace(/<\/(?:strong|b)>$/i, '')}
        </strong>,
      );
    } else if (/^<(?:em|i)>/i.test(token)) {
      fragments.push(
        <em key={`italic-${matchIndex}`} className="italic text-slate-700">
          {token.replace(/^<(?:em|i)>/i, '').replace(/<\/(?:em|i)>$/i, '')}
        </em>,
      );
    } else if (/^<u>/i.test(token)) {
      fragments.push(
        <span key={`underline-${matchIndex}`} className="underline decoration-1 underline-offset-2">
          {token.replace(/^<u>/i, '').replace(/<\/u>$/i, '')}
        </span>,
      );
    }

    lastIndex = tokenRegex.lastIndex;
    matchIndex += 1;
  }

  if (lastIndex < value.length) {
    fragments.push(<React.Fragment key={`plain-tail`}>{value.slice(lastIndex)}</React.Fragment>);
  }

  return fragments;
}

export function isImageAsset(asset: ContentAsset) {
  return String(asset.type || '').toLowerCase() === 'image' || String(asset.mimeType || '').toLowerCase().startsWith('image/');
}

export async function triggerAssetDownload(asset: ContentAsset) {
  const href = String(asset.fileUrl || '').trim();
  if (!href) return;
  try {
    const response = await fetch(href, { cache: 'no-store' });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = asset.fileName || 'attachment';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
  } catch {
    // Fallback for hosts that block blob fetch.
    const downloadHref = href.includes('?') ? `${href}&download=${Date.now()}` : `${href}?download=${Date.now()}`;
    const link = document.createElement('a');
    link.href = downloadHref;
    link.download = asset.fileName || 'attachment';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

export function readStringList(storageKey: string) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => String(entry || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function readMomentEntries() {
  try {
    const raw = localStorage.getItem(MOMENT_STORAGE_KEY);
    if (!raw) return [] as MomentEntry[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as MomentEntry[];
    return parsed
      .map((entry: any) => ({
        id: String(entry?.id || '').trim(),
        date: String(entry?.date || '').trim(),
        topic: String(entry?.topic || '').trim(),
        text: String(entry?.text || '').trim(),
        createdAt: String(entry?.createdAt || '').trim(),
      }))
      .filter((entry: MomentEntry) => entry.id && entry.date && entry.text);
  } catch {
    return [] as MomentEntry[];
  }
}

export function readContentViewDrafts() {
  try {
    const raw = localStorage.getItem(CONTENT_VIEW_DRAFTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as { newLinkValue?: string; newTagValue?: string };
  } catch {
    return {};
  }
}

export function hasServerDraftContent(draft?: ContentDraftRecord | null) {
  if (!draft) return false;
  return Boolean(
    String(draft.title || '').trim() ||
    String(draft.description || '').trim() ||
    (Array.isArray(draft.attachments) && draft.attachments.length > 0),
  );
}

export function scrollContainerToTop(container: HTMLElement | Window) {
  if (container === window) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }

  container.scrollTo({ top: 0, behavior: 'auto' });
}

export function FormattedContentBody({ text, compact = false, clampLines, flat = false }: { text: string; compact?: boolean; clampLines?: number; flat?: boolean }) {
  const hasValue = String(text || '').trim().length > 0;

  return (
    <div className={`mt-3 overflow-hidden rounded-[1.5rem] ${flat ? 'border border-slate-200/80 bg-slate-50/65' : 'border border-white/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 shadow-[0_16px_40px_rgba(15,23,42,0.08)]'} ${compact ? 'p-3' : 'p-4'}`}>
      <div
        className={`whitespace-pre-wrap break-words text-slate-700 ${compact ? 'text-sm leading-6' : 'text-[15px] leading-7'}`}
        style={clampLines ? {
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: clampLines,
          overflow: 'hidden',
        } : undefined}
      >
        {hasValue ? renderStyledDescription(text) : 'No description'}
      </div>
    </div>
  );
}

function CalendarTypeCounter({
  type,
  count,
  compact = false,
  dense = false,
}: {
  type: ContentType;
  count: number;
  compact?: boolean;
  dense?: boolean;
}) {
  const meta = TYPE_ICON_META[type];
  const Icon = meta.icon;

  if (compact) {
    return (
      <div className={`relative flex items-center justify-center ${dense ? 'h-7' : 'h-8'}`}>
        <div className={`inline-flex items-center justify-center ${dense ? 'h-7 w-7 rounded-md' : 'h-8 w-8 rounded-lg'} ${meta.className} shadow-inner`}>
          <Icon size={dense ? 12 : 14} />
        </div>
        <span className={`absolute inline-flex items-center justify-center rounded-full border border-brand-red/20 bg-white font-semibold text-brand-red shadow-[0_8px_18px_rgba(236,72,71,0.12)] ${dense ? '-right-1 -top-1 min-w-[18px] px-1 py-0.5 text-[9px]' : '-right-1.5 -top-1.5 min-w-[20px] px-1.5 py-0.5 text-[10px]'}`}>
          {count}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-[0.95rem] border border-white/80 bg-gradient-to-r from-white via-slate-50 to-white px-2.5 py-1.5 shadow-[0_8px_18px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/70">
      <div className="flex items-center gap-2">
        <div className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-md ${meta.className} shadow-inner`}>
          <Icon size={12} />
        </div>
        <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500">{meta.label}</span>
      </div>
      <div className="min-w-[18px] text-right text-sm font-semibold text-brand-red/75">{count}</div>
    </div>
  );
}

export function CalendarDayCounters({ counts }: { counts: Record<ContentType, number> }) {
  const entries = (Object.keys(TYPE_ICON_META) as ContentType[])
    .map((type) => ({ type, count: counts[type] || 0 }))
    .filter((entry) => entry.count > 0);

  if (entries.length <= 2) {
    return (
      <div className="flex flex-col gap-1.5">
        {entries.map((entry) => (
          <CalendarTypeCounter key={entry.type} type={entry.type} count={entry.count} />
        ))}
      </div>
    );
  }

  if (entries.length <= 4) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {entries.map((entry) => (
          <CalendarTypeCounter key={entry.type} type={entry.type} count={entry.count} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {entries.map((entry) => (
        <CalendarTypeCounter key={entry.type} type={entry.type} count={entry.count} compact dense />
      ))}
    </div>
  );
}
