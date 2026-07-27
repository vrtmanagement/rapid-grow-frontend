import React from 'react';
import { BellRing, BookOpenText, Bot, CalendarDays, FileText, Globe, Linkedin, Mail, MessageSquareText, Sparkles, Youtube } from 'lucide-react';
import { ContentType } from '../../services/contentApi';

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
