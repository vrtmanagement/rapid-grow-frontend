import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BellRing, Bot, CalendarDays, ChevronLeft, ChevronRight, Download, FileText, Globe, Hash, Linkedin, Link2, Mail, MessageSquareText, Pencil, Plus, Sparkles, Trash2, X, Youtube } from 'lucide-react';
import { apiAddContentComment, apiCreateContent, apiDeleteContent, apiDeleteContentComment, apiDeleteContentDraft, apiGetContentDraft, apiListContent, apiUpdateContent, apiUpdateContentComment, apiUploadContentFile, ContentAsset, ContentComment, ContentDraftMode, ContentDraftRecord, ContentItem, ContentType } from '../services/contentApi';
import { apiListUsers } from '../communication/api';
import Toast from '../components/ui/Toast';

const TYPE_LABEL: Record<ContentType, string> = {
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  general: 'General',
  newsletter: 'Mail',
  website: 'Website',
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEK_DAY_HEADER_CLASS = [
  'bg-blue-50 text-blue-700',
  'bg-indigo-50 text-indigo-700',
  'bg-violet-50 text-violet-700',
  'bg-fuchsia-50 text-fuchsia-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
];

const LINK_STORAGE_KEY = 'rapidgrow-content-links-v1';
const TAG_STORAGE_KEY = 'rapidgrow-content-tags-v1';
const CONTENT_VIEW_DRAFTS_KEY = 'rapidgrow-content-view-drafts-v1';
const CONTENT_CREATE_DRAFT_STORAGE_PREFIX = 'rapidgrow-content-create-draft-v1';
type ContentTab = 'calendar' | 'follow-ee' | 'follow-ega' | 'auto-add';

function isContentType(value: string): value is ContentType {
  return value === 'linkedin' || value === 'youtube' || value === 'general' || value === 'newsletter' || value === 'website';
}

const TAB_META: Record<ContentTab, { label: string; icon: React.ElementType; activeClass: string; idleClass: string }> = {
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
};

const TYPE_ACCENT: Record<ContentType, { badge: string; tone: string; chip: string; counter: string; previewIndex: string; previewDot: string; highlight: string; previewRow: string }> = {
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

const TYPE_ICON_META: Record<ContentType, { icon: React.ElementType; className: string; label: string }> = {
  linkedin: { icon: Linkedin, className: 'bg-sky-100 text-sky-700', label: 'LinkedIn' },
  youtube: { icon: Youtube, className: 'bg-rose-100 text-rose-700', label: 'YouTube' },
  general: { icon: FileText, className: 'bg-emerald-100 text-emerald-700', label: 'General' },
  newsletter: { icon: Mail, className: 'bg-amber-100 text-amber-700', label: 'Mail' },
  website: { icon: Globe, className: 'bg-indigo-100 text-indigo-700', label: 'Website' },
};

function getInitialTab(search: string): ContentTab {
  const tab = String(new URLSearchParams(search).get('tab') || '').trim().toLowerCase();
  if (tab === 'follow-ee' || tab === 'follow-ega' || tab === 'auto-add') return tab;
  return 'calendar';
}

function nameInitials(name: string) {
  const clean = (name || '').trim();
  if (!clean) return 'U';
  const parts = clean.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function getLoggedInUser() {
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

function isAdminRole(role: string) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

function formatUsDateTime(value?: string) {
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

function autoResizeTextarea(target: HTMLTextAreaElement) {
  target.style.height = 'auto';
  target.style.height = `${target.scrollHeight}px`;
}

function renderStyledDescription(text: string) {
  const value = String(text || '');
  if (!value.trim()) return 'No description';
  const parts = value.split(/(\s+)/);
  return parts.map((part, index) => {
    if (/^https?:\/\/\S+$/i.test(part)) {
      return (
        <a
          key={`part-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          {part}
        </a>
      );
    }
    if (/^#[^\s#]+$/.test(part)) {
      return (
        <strong key={`part-${index}`} className="font-semibold text-slate-800">
          {part}
        </strong>
      );
    }
    return <React.Fragment key={`part-${index}`}>{part}</React.Fragment>;
  });
}

function isImageAsset(asset: ContentAsset) {
  return String(asset.type || '').toLowerCase() === 'image' || String(asset.mimeType || '').toLowerCase().startsWith('image/');
}

async function triggerAssetDownload(asset: ContentAsset) {
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

function readStringList(storageKey: string) {
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

function readContentViewDrafts() {
  try {
    const raw = localStorage.getItem(CONTENT_VIEW_DRAFTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as { newLinkValue?: string; newTagValue?: string };
  } catch {
    return {};
  }
}

function hasServerDraftContent(draft?: ContentDraftRecord | null) {
  if (!draft) return false;
  return Boolean(
    String(draft.title || '').trim() ||
    String(draft.description || '').trim() ||
    (Array.isArray(draft.attachments) && draft.attachments.length > 0),
  );
}

function findScrollContainer(node: HTMLElement | null): HTMLElement | Window {
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

function scrollContainerToTop(container: HTMLElement | Window) {
  if (container === window) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }

  container.scrollTo({ top: 0, behavior: 'auto' });
}

function FormattedContentBody({ text, compact = false, clampLines, flat = false }: { text: string; compact?: boolean; clampLines?: number; flat?: boolean }) {
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

function CalendarDayCounters({ counts }: { counts: Record<ContentType, number> }) {
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

const ContentView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dayKey, typeKey, itemKey } = useParams();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isDayPage = !!dayKey;
  const selectedType = typeKey && isContentType(typeKey) ? typeKey : null;
  const isTypeDetailPage = isDayPage && !!selectedType;
  const isItemDetailPage = isTypeDetailPage && !!itemKey;
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ContentTab>(() => getInitialTab(location.search));

  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(new Date()));

  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ContentType>('general');
  const [contentDate, setContentDate] = useState<string>(toDateKey(new Date()));
  const [attachments, setAttachments] = useState<ContentAsset[]>([]);
  const [userAvatarByEmpId, setUserAvatarByEmpId] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [linkOptions, setLinkOptions] = useState<string[]>(() => readStringList(LINK_STORAGE_KEY));
  const [tagOptions, setTagOptions] = useState<string[]>(() => readStringList(TAG_STORAGE_KEY));
  const initialDrafts = useMemo(() => readContentViewDrafts(), []);
  const [newLinkValue, setNewLinkValue] = useState(String(initialDrafts.newLinkValue || ''));
  const [newTagValue, setNewTagValue] = useState(String(initialDrafts.newTagValue || ''));
  const [openCommentsForContentId, setOpenCommentsForContentId] = useState<string | null>(null);
  const [commentDraftByContentId, setCommentDraftByContentId] = useState<Record<string, string>>({});
  const [replyDraftByCommentId, setReplyDraftByCommentId] = useState<Record<string, string>>({});
  const [replyingToCommentByContentId, setReplyingToCommentByContentId] = useState<Record<string, string | null>>({});
  const [editingCommentByContentId, setEditingCommentByContentId] = useState<Record<string, string | null>>({});
  const [editingDraftByCommentId, setEditingDraftByCommentId] = useState<Record<string, string>>({});
  const [commentBusyKey, setCommentBusyKey] = useState<string | null>(null);
  const [commentDeleteModal, setCommentDeleteModal] = useState<{ contentId: string; commentId: string } | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<Partial<Record<ContentDraftMode, ContentDraftRecord | null>>>({});
  const [deletingDraftMode, setDeletingDraftMode] = useState<ContentDraftMode | null>(null);
  const currentUser = useMemo(() => getLoggedInUser(), []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const contentRes = await apiListContent();
      setItems(Array.isArray(contentRes.items) ? contentRes.items : []);
    } catch (err: any) {
      setError(err.message || 'Unable to load content');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    let disposed = false;
    async function loadDrafts() {
      const modes: ContentDraftMode[] = ['calendar', 'follow-ee', 'follow-ega'];
      try {
        const responses = await Promise.all(
          modes.map(async (mode) => {
            try {
              const result = await apiGetContentDraft(mode);
              return [mode, result.draft || null] as const;
            } catch {
              return [mode, null] as const;
            }
          }),
        );
        if (disposed) return;
        const next: Partial<Record<ContentDraftMode, ContentDraftRecord | null>> = {};
        responses.forEach(([mode, draft]) => {
          next[mode] = draft;
        });
        setSavedDrafts(next);
      } catch {
        if (!disposed) {
          setSavedDrafts({});
        }
      }
    }
    loadDrafts();
    return () => {
      disposed = true;
    };
  }, [location.key]);

  useEffect(() => {
    let disposed = false;
    async function loadProfiles() {
      try {
        const data = await apiListUsers();
        if (disposed) return;
        const next: Record<string, string> = {};
        (data.users || []).forEach((user: any) => {
          const empId = String(user.empId || user.id || user.userId || '').trim();
          if (!empId) return;
          if (typeof user.avatar === 'string' && user.avatar.trim()) {
            next[empId] = user.avatar.trim();
          }
        });
        setUserAvatarByEmpId(next);
      } catch {
        // Keep fallback initials when profile API is unavailable.
      }
    }
    loadProfiles();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const incomingToast = (location.state as any)?.contentToast;
    if (!incomingToast?.message) return;
    setToast({
      message: String(incomingToast.message),
      type: incomingToast.type === 'error' ? 'error' : 'success',
    });
    navigate(location.pathname + location.search, { replace: true, state: {} });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (dayKey && /^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      setSelectedDate(dayKey);
      const parsed = new Date(`${dayKey}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        setMonthCursor(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
    }
  }, [dayKey]);

  useEffect(() => {
    setActiveTab(getInitialTab(location.search));
  }, [location.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(
        CONTENT_VIEW_DRAFTS_KEY,
        JSON.stringify({
          newLinkValue,
          newTagValue,
        }),
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [newLinkValue, newTagValue]);

  const monthDays = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const firstWeekdayMon = (firstOfMonth.getDay() + 6) % 7;
    const days: Array<Date | null> = [];
    for (let i = 0; i < firstWeekdayMon; i += 1) days.push(null);
    for (let day = 1; day <= lastOfMonth.getDate(); day += 1) days.push(new Date(year, month, day));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [monthCursor]);

  const calendarItems = useMemo(
    () => items.filter((item) => {
      const key = String(item.channelKey || '').toLowerCase();
      return key !== 'follow-ee' && key !== 'follow-ega';
    }),
    [items]
  );
  const countsByDate = useMemo(() => {
    const map = new Map<string, Record<ContentType, number>>();
    for (const item of calendarItems) {
      const key = item.contentDate || (item.createdAt ? item.createdAt.slice(0, 10) : '');
      if (!key) continue;
      const row = map.get(key) || { linkedin: 0, youtube: 0, general: 0, newsletter: 0, website: 0 };
      row[item.type] = (row[item.type] || 0) + 1;
      map.set(key, row);
    }
    return map;
  }, [calendarItems]);

  const selectedDayItems = useMemo(
    () => calendarItems.filter((item) => (item.contentDate || item.createdAt?.slice(0, 10)) === selectedDate),
    [calendarItems, selectedDate]
  );
  const selectedDayGroups = useMemo(
    () =>
      (Object.keys(TYPE_LABEL) as ContentType[])
        .map((entryType) => {
          const groupItems = selectedDayItems.filter((item) => item.type === entryType);
          return {
            type: entryType,
            count: groupItems.length,
            items: groupItems,
          };
        })
        .filter((group) => group.count > 0),
    [selectedDayItems]
  );
  const selectedTypeItems = useMemo(
    () => (selectedType ? selectedDayItems.filter((item) => item.type === selectedType) : []),
    [selectedDayItems, selectedType]
  );
  const selectedItem = useMemo(
    () => (itemKey ? selectedTypeItems.find((item) => item.contentId === itemKey) || null : null),
    [itemKey, selectedTypeItems]
  );
  const highlightedItemId = useMemo(
    () => itemKey ? String(itemKey) : String(new URLSearchParams(location.search).get('item') || '').trim(),
    [itemKey, location.search]
  );
  useEffect(() => {
    if (!isTypeDetailPage || isItemDetailPage || !highlightedItemId || loading) return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(`content-card-${highlightedItemId}`);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [highlightedItemId, isItemDetailPage, isTypeDetailPage, loading, selectedTypeItems]);
  const followEeItems = useMemo(
    () => items.filter((item) => String(item.channelKey || '').toLowerCase() === 'follow-ee'),
    [items]
  );
  const followEgaItems = useMemo(
    () => items.filter((item) => String(item.channelKey || '').toLowerCase() === 'follow-ega'),
    [items]
  );

  const activeReminderItems = activeTab === 'follow-ee' ? followEeItems : followEgaItems;
  const selectedReminderType = useMemo(() => {
    const value = String(new URLSearchParams(location.search).get('reminderType') || '').trim();
    return isContentType(value) ? value : null;
  }, [location.search]);
  const selectedReminderItemId = useMemo(
    () => String(new URLSearchParams(location.search).get('reminderItem') || '').trim(),
    [location.search]
  );
  const reminderGroups = useMemo(
    () =>
      (Object.keys(TYPE_LABEL) as ContentType[])
        .map((entryType) => {
          const groupItems = activeReminderItems.filter((item) => item.type === entryType);
          return {
            type: entryType,
            count: groupItems.length,
            items: groupItems,
          };
        })
        .filter((group) => group.count > 0),
    [activeReminderItems]
  );
  const selectedReminderTypeItems = useMemo(
    () => (selectedReminderType ? activeReminderItems.filter((item) => item.type === selectedReminderType) : []),
    [activeReminderItems, selectedReminderType]
  );
  const selectedReminderItem = useMemo(
    () => (selectedReminderItemId ? selectedReminderTypeItems.find((item) => item.contentId === selectedReminderItemId) || null : null),
    [selectedReminderItemId, selectedReminderTypeItems]
  );
  const isReminderTypeDetail = (activeTab === 'follow-ee' || activeTab === 'follow-ega') && !!selectedReminderType;
  const isReminderItemDetail = isReminderTypeDetail && !!selectedReminderItemId;
  const isReminderTab = activeTab === 'follow-ee' || activeTab === 'follow-ega';
  useEffect(() => {
    if (loading || (!isItemDetailPage && !isReminderItemDetail)) return;
    const container = findScrollContainer(rootRef.current);
    scrollContainerToTop(container);
  }, [isItemDetailPage, isReminderItemDetail, loading, location.pathname, location.search]);
  const reminderCategoryLabel = 'General';
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const currentMonthKey = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}`;
  const monthContentCount = useMemo(
    () =>
      calendarItems.filter((item) =>
        String(item.contentDate || item.createdAt?.slice(0, 10) || '').startsWith(currentMonthKey)
      ).length,
    [calendarItems, currentMonthKey]
  );

  const openCreatePage = (day?: string) => {
    const date = day || selectedDate || toDateKey(new Date());
    const mode = activeTab === 'follow-ee' ? 'follow-ee' : activeTab === 'follow-ega' ? 'follow-ega' : 'calendar';
    navigate(`/content/new?date=${encodeURIComponent(date)}&mode=${encodeURIComponent(mode)}`);
  };

  const handleTabChange = (tab: ContentTab) => {
    setActiveTab(tab);
    if (tab === 'calendar') {
      navigate('/content');
      return;
    }
    if (tab === 'follow-ee' || tab === 'follow-ega' || tab === 'auto-add') {
      navigate(`/content?tab=${encodeURIComponent(tab)}`);
    }
  };

  const persistAutoOptions = (links: string[], tags: string[]) => {
    setLinkOptions(links);
    setTagOptions(tags);
    localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify(links));
    localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(tags));
  };

  const addAutoLink = () => {
    const value = newLinkValue.trim();
    if (!value) return;
    persistAutoOptions(Array.from(new Set([...linkOptions, value])), tagOptions);
    setNewLinkValue('');
    setToast({ message: 'Link added to auto list.', type: 'success' });
  };

  const addAutoTag = () => {
    const value = newTagValue.trim();
    if (!value) return;
    const normalized = value.startsWith('#') ? value : `#${value}`;
    persistAutoOptions(linkOptions, Array.from(new Set([...tagOptions, normalized])));
    setNewTagValue('');
    setToast({ message: 'Tag added to auto list.', type: 'success' });
  };

  const removeAutoLink = (value: string) => {
    persistAutoOptions(linkOptions.filter((entry) => entry !== value), tagOptions);
  };

  const removeAutoTag = (value: string) => {
    persistAutoOptions(linkOptions, tagOptions.filter((entry) => entry !== value));
  };

  const openEdit = (item: ContentItem) => {
    setEditingItem(item);
    setTitle(item.title || '');
    setDescription(item.description || '');
    setType(item.type);
    setContentDate(item.contentDate || item.createdAt.slice(0, 10));
    setAttachments(Array.isArray(item.attachments) ? item.attachments : []);
    setShowModal(true);
  };

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingAttachment(true);
    setError(null);
    try {
      const uploads = await Promise.all(Array.from(files).map((file) => apiUploadContentFile(file)));
      setAttachments((prev) => [...prev, ...uploads]);
    } catch (err: any) {
      setError(err.message || 'Failed to upload attachment');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError('Title is required');
    if (!contentDate) return setError('Date is required');
    setSubmitting(true);
    setError(null);
    try {
      if (editingItem) {
        const updated = await apiUpdateContent(editingItem.contentId, {
          title: title.trim(),
          description,
          type,
          contentDate,
          attachments,
        });
        setItems((prev) => prev.map((entry) => (entry.contentId === editingItem.contentId ? updated.item : entry)));
        setToast({ message: 'Content updated successfully.', type: 'success' });
      } else {
        const created = await apiCreateContent({
          title: title.trim(),
          description,
          type,
          contentDate,
          channelKey: type,
          coverImage: null,
          attachments,
        });
        setItems((prev) => [created.item, ...prev]);
        setToast({ message: 'Content created successfully.', type: 'success' });
      }
      setSelectedDate(contentDate);
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save content');
      setToast({ message: err.message || 'Failed to save content', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (contentId: string) => {
    try {
      await apiDeleteContent(contentId);
      setItems((prev) => prev.filter((entry) => entry.contentId !== contentId));
      setToast({ message: 'Content deleted successfully.', type: 'success' });
    } catch (err: any) {
      setError(err.message || 'Failed to delete content');
      setToast({ message: err.message || 'Failed to delete content', type: 'error' });
    }
  };

  const updateItemComments = (contentId: string, comments: ContentComment[]) => {
    setItems((prev) =>
      prev.map((entry) => (entry.contentId === contentId ? { ...entry, comments: Array.isArray(comments) ? comments : [] } : entry))
    );
  };

  const handleAddComment = async (item: ContentItem) => {
    const draft = String(commentDraftByContentId[item.contentId] || '').trim();
    if (!draft || commentBusyKey) return;
    setError(null);
    setCommentBusyKey(`add-${item.contentId}`);
    try {
      const response = await apiAddContentComment(item.contentId, draft);
      updateItemComments(item.contentId, response.comments || []);
      setCommentDraftByContentId((prev) => ({ ...prev, [item.contentId]: '' }));
      setToast({ message: 'Comment added.', type: 'success' });
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
      setToast({ message: err.message || 'Failed to add comment', type: 'error' });
    } finally {
      setCommentBusyKey(null);
    }
  };

  const handleAddReply = async (item: ContentItem, parentCommentId: string) => {
    const draft = String(replyDraftByCommentId[parentCommentId] || '').trim();
    if (!draft || commentBusyKey) return;
    setError(null);
    setCommentBusyKey(`reply-${parentCommentId}`);
    try {
      const response = await apiAddContentComment(item.contentId, draft, parentCommentId);
      updateItemComments(item.contentId, response.comments || []);
      setReplyDraftByCommentId((prev) => ({ ...prev, [parentCommentId]: '' }));
      setReplyingToCommentByContentId((prev) => ({ ...prev, [item.contentId]: null }));
      setToast({ message: 'Reply added.', type: 'success' });
    } catch (err: any) {
      setError(err.message || 'Failed to add reply');
      setToast({ message: err.message || 'Failed to add reply', type: 'error' });
    } finally {
      setCommentBusyKey(null);
    }
  };

  const handleUpdateComment = async (item: ContentItem, comment: ContentComment) => {
    const draft = String(editingDraftByCommentId[comment.id] || '').trim();
    if (!draft || commentBusyKey) return;
    setError(null);
    setCommentBusyKey(`edit-${comment.id}`);
    try {
      const response = await apiUpdateContentComment(item.contentId, comment.id, draft);
      updateItemComments(item.contentId, response.comments || []);
      setEditingCommentByContentId((prev) => ({ ...prev, [item.contentId]: null }));
      setEditingDraftByCommentId((prev) => ({ ...prev, [comment.id]: '' }));
      setToast({ message: 'Comment updated.', type: 'success' });
    } catch (err: any) {
      setError(err.message || 'Failed to update comment');
      setToast({ message: err.message || 'Failed to update comment', type: 'error' });
    } finally {
      setCommentBusyKey(null);
    }
  };

  const handleDeleteComment = async (contentId: string, commentId: string) => {
    if (commentBusyKey) return;
    setError(null);
    setCommentBusyKey(`delete-${commentId}`);
    try {
      const response = await apiDeleteContentComment(contentId, commentId);
      updateItemComments(contentId, response.comments || []);
      setCommentDeleteModal(null);
      setToast({ message: 'Comment deleted.', type: 'success' });
    } catch (err: any) {
      setError(err.message || 'Failed to delete comment');
      setToast({ message: err.message || 'Failed to delete comment', type: 'error' });
    } finally {
      setCommentBusyKey(null);
    }
  };

  const getPreviewLineClamp = (item: ContentItem) => {
    let lines = 7;
    if (item.updatedAt && item.createdAt && item.updatedAt !== item.createdAt) lines -= 1;
    if ((item.attachments?.length || 0) > 0) lines -= 1;
    if (String(item.title || '').trim().length > 42) lines -= 1;
    return Math.max(lines, 4);
  };

  const renderContentCard = (item: ContentItem, options?: { clickable?: boolean; expanded?: boolean; clickHref?: string }) => {
    const isHighlighted = item.contentId === highlightedItemId;
    const isClickable = !!options?.clickable;
    const clickHref = options?.clickHref || `/content/day/${selectedDate}/type/${item.type}/item/${item.contentId}`;
    const isExpanded = !!options?.expanded;
    const showTypeBadge = activeTab === 'calendar' || isReminderTab;
    const cardTypeLabel = isReminderTab ? reminderCategoryLabel : TYPE_LABEL[item.type];
    const cardTypeBadgeClass = isReminderTab ? TYPE_ACCENT.general.badge : TYPE_ACCENT[item.type].badge;
    const comments = Array.isArray(item.comments) ? item.comments : [];
    const topLevelComments = comments.filter((c) => !String(c.parentCommentId || '').trim());
    const repliesByParentId = comments.reduce<Record<string, ContentComment[]>>((acc, c) => {
      const parentId = String(c.parentCommentId || '').trim();
      if (!parentId) return acc;
      acc[parentId] = acc[parentId] || [];
      acc[parentId].push(c);
      return acc;
    }, {});
    const isCommentsOpen = openCommentsForContentId === item.contentId;

    return (
    <div
      id={`content-card-${item.contentId}`}
      key={item.contentId}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? () => navigate(clickHref) : undefined}
      onKeyDown={isClickable ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(clickHref);
        }
      } : undefined}
      className={`relative flex ${isExpanded ? 'h-auto min-h-0' : 'h-[430px]'} flex-col overflow-hidden rounded-[1.9rem] border bg-white/95 p-5 shadow-[0_22px_56px_rgba(15,23,42,0.08)] transition-all duration-300 ${
        isHighlighted
          ? TYPE_ACCENT[item.type].highlight
          : 'border-white/80'
      } ${isClickable ? 'cursor-pointer hover:-translate-y-[2px] hover:border-slate-200 hover:shadow-[0_26px_60px_rgba(15,23,42,0.10)]' : ''}`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${TYPE_ACCENT[item.type].tone}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div className={`min-w-0 ${showTypeBadge ? 'space-y-3' : 'space-y-0'}`}>
          {showTypeBadge ? (
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${cardTypeBadgeClass}`}>{cardTypeLabel}</span>
          ) : null}
          <h4
            className="text-lg font-semibold text-slate-900"
            style={isExpanded ? undefined : {
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
            }}
          >
            {item.title}
          </h4>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {new Date(item.createdAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata',
          })}
        </span>
      </div>
      <div className="relative mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2">
          {userAvatarByEmpId[item.createdBy?.empId || ''] ? (
            <img src={userAvatarByEmpId[item.createdBy?.empId || '']} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">{nameInitials(item.createdBy?.name || '')}</span>
          )}
          <span>Created by: {item.createdBy?.name || 'Unknown'}</span>
        </div>
        {(item.updatedAt && item.createdAt && item.updatedAt !== item.createdAt) ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2">
            {userAvatarByEmpId[item.updatedBy?.empId || ''] ? (
              <img src={userAvatarByEmpId[item.updatedBy?.empId || '']} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-700">{nameInitials(item.updatedBy?.name || item.createdBy?.name || '')}</span>
            )}
            <span>Edited by: {item.updatedBy?.name || item.createdBy?.name || 'Unknown'}</span>
          </div>
        ) : null}
      </div>
      <FormattedContentBody text={item.description} compact clampLines={isExpanded ? undefined : getPreviewLineClamp(item)} flat />
      {item.attachments?.length > 0 && (
        <div
          className="mt-4 space-y-2.5"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {(isExpanded ? item.attachments : item.attachments.slice(0, 2)).map((asset) => {
            const imageAsset = isImageAsset(asset);
            return (
              <div key={`${asset.fileId}-${asset.fileUrl}`} className="max-w-full">
                {imageAsset ? (
                  <div className="group/asset relative max-w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                    <img
                      src={asset.fileUrl}
                      alt={asset.fileName || 'Attachment image'}
                      className="h-40 w-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent opacity-0 transition-opacity duration-200 group-hover/asset:opacity-100" />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        triggerAssetDownload(asset);
                      }}
                      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/95 text-slate-700 opacity-0 shadow-lg transition-all duration-200 group-hover/asset:opacity-100"
                      aria-label={`Download ${asset.fileName || 'attachment'}`}
                      title={`Download ${asset.fileName || 'attachment'}`}
                    >
                      <Download size={15} />
                    </button>
                    <div className="bg-white/95 px-3 py-2 text-xs font-medium text-slate-600">
                      <span className="block truncate">{asset.fileName || 'Attachment image'}</span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      triggerAssetDownload(asset);
                    }}
                    className="group/file inline-flex w-auto max-w-[520px] items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:border-violet-200 hover:bg-white"
                    title={`Download ${asset.fileName || 'attachment'}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-indigo-400/60" />
                    <span className="min-w-0 flex-1 truncate">{asset.fileName || 'Attachment'}</span>
                    <Download size={14} className="text-slate-400 transition group-hover/file:text-violet-600" />
                  </button>
                )}
              </div>
            );
          })}
          {!isExpanded && item.attachments.length > 2 ? (
            <span className="inline-flex items-center rounded-full border border-brand-red/15 bg-brand-red/5 px-3 py-1.5 text-xs font-semibold text-brand-red">
              +{item.attachments.length - 2} more files
            </span>
          ) : null}
        </div>
      )}
      <div className={`${isExpanded ? 'mt-5' : 'mt-auto'} flex flex-wrap gap-2 pt-4`}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpenCommentsForContentId((prev) => (prev === item.contentId ? null : item.contentId));
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-violet-200 hover:text-violet-700"
        >
          <MessageSquareText size={14} /> Comments {comments.length > 0 ? `(${comments.length})` : ''}
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); openEdit(item); }} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-violet-200 hover:text-violet-700">
          <Pencil size={14} /> Edit
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); setDeleteTarget(item); }} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100">
          <Trash2 size={14} /> Delete
        </button>
      </div>
      {isCommentsOpen ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4" onClick={(event) => event.stopPropagation()}>
          {comments.length === 0 ? (
            <p className="text-sm text-slate-500">No comments yet.</p>
          ) : (
            <div className="space-y-2">
              {topLevelComments.map((comment) => {
                const isEditing = editingCommentByContentId[item.contentId] === comment.id;
                const canManageComment = String(comment.fromEmpId || '').trim() === currentUser.empId || isAdminRole(currentUser.role);
                const editDraft = String(editingDraftByCommentId[comment.id] ?? comment.text);
                const isSaveBusy = commentBusyKey === `edit-${comment.id}`;
                const isReplying = replyingToCommentByContentId[item.contentId] === comment.id;
                const replyDraft = String(replyDraftByCommentId[comment.id] || '');
                const childReplies = repliesByParentId[comment.id] || [];
                return (
                  <div key={comment.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {userAvatarByEmpId[comment.fromEmpId || ''] ? (
                          <img
                            src={userAvatarByEmpId[comment.fromEmpId || '']}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                            {nameInitials(comment.fromName || '')}
                          </span>
                        )}
                        <span className="font-medium text-slate-700">{comment.fromName || 'Unknown'}</span>
                        <span>•</span>
                        <span>
                          {formatUsDateTime(comment.createdAt)}
                          {comment.editedAt ? ' (edited)' : ''}
                        </span>
                      </div>
                      {canManageComment ? (
                        <div className="flex items-center gap-2">
                          {!isEditing ? (
                            <button
                              type="button"
                              className="text-xs font-medium text-violet-700"
                              onClick={() => {
                                setEditingCommentByContentId((prev) => ({ ...prev, [item.contentId]: comment.id }));
                                setEditingDraftByCommentId((prev) => ({ ...prev, [comment.id]: comment.text || '' }));
                              }}
                            >
                              Edit
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="text-xs font-medium text-rose-600"
                            disabled={!!commentBusyKey}
                            onClick={() => setCommentDeleteModal({ contentId: item.contentId, commentId: comment.id })}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editDraft}
                          onChange={(event) =>
                            setEditingDraftByCommentId((prev) => ({ ...prev, [comment.id]: event.target.value }))
                          }
                          onInput={(event) => autoResizeTextarea(event.currentTarget)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300"
                          rows={3}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!editDraft.trim() || !!commentBusyKey}
                            onClick={() => handleUpdateComment(item, comment)}
                          >
                            {isSaveBusy ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!!commentBusyKey}
                            onClick={() => {
                              setEditingCommentByContentId((prev) => ({ ...prev, [item.contentId]: null }));
                              setEditingDraftByCommentId((prev) => ({ ...prev, [comment.id]: '' }));
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{comment.text}</p>
                    )}
                    {!isEditing ? (
                      <div className="mt-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-slate-600 hover:text-violet-700"
                          disabled={!!commentBusyKey}
                          onClick={() =>
                            setReplyingToCommentByContentId((prev) => ({
                              ...prev,
                              [item.contentId]: prev[item.contentId] === comment.id ? null : comment.id,
                            }))
                          }
                        >
                          Reply
                        </button>
                      </div>
                    ) : null}
                    {isReplying ? (
                      <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                        <textarea
                          value={replyDraft}
                          onChange={(event) =>
                            setReplyDraftByCommentId((prev) => ({ ...prev, [comment.id]: event.target.value }))
                          }
                          onInput={(event) => autoResizeTextarea(event.currentTarget)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300"
                          rows={2}
                          placeholder={`Reply to ${comment.fromName || 'comment'}...`}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!replyDraft.trim() || !!commentBusyKey}
                            onClick={() => handleAddReply(item, comment.id)}
                          >
                            {commentBusyKey === `reply-${comment.id}` ? 'Replying...' : 'Reply'}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!!commentBusyKey}
                            onClick={() => setReplyingToCommentByContentId((prev) => ({ ...prev, [item.contentId]: null }))}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {childReplies.length > 0 ? (
                      <div className="mt-3 space-y-2 pl-6">
                        {childReplies.map((reply) => {
                          const canManageReply = String(reply.fromEmpId || '').trim() === currentUser.empId || isAdminRole(currentUser.role);
                          const isReplyEditing = editingCommentByContentId[item.contentId] === reply.id;
                          const replyEditDraft = String(editingDraftByCommentId[reply.id] ?? reply.text);
                          return (
                            <div key={reply.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  {userAvatarByEmpId[reply.fromEmpId || ''] ? (
                                    <img src={userAvatarByEmpId[reply.fromEmpId || '']} alt="" className="h-5 w-5 rounded-full object-cover" />
                                  ) : (
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-700">
                                      {nameInitials(reply.fromName || '')}
                                    </span>
                                  )}
                                  <span className="font-medium text-slate-700">{reply.fromName || 'Unknown'}</span>
                                  <span>•</span>
                                  <span>
                                    {formatUsDateTime(reply.createdAt)}
                                    {reply.editedAt ? ' (edited)' : ''}
                                  </span>
                                </div>
                                {canManageReply ? (
                                  <div className="flex items-center gap-2">
                                    {!isReplyEditing ? (
                                      <button
                                        type="button"
                                        className="text-xs font-medium text-violet-700"
                                        onClick={() => {
                                          setEditingCommentByContentId((prev) => ({ ...prev, [item.contentId]: reply.id }));
                                          setEditingDraftByCommentId((prev) => ({ ...prev, [reply.id]: reply.text || '' }));
                                        }}
                                      >
                                        Edit
                                      </button>
                                    ) : null}
                                    <button
                                      type="button"
                                      className="text-xs font-medium text-rose-600"
                                      disabled={!!commentBusyKey}
                                      onClick={() => setCommentDeleteModal({ contentId: item.contentId, commentId: reply.id })}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                              {isReplyEditing ? (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    value={replyEditDraft}
                                    onChange={(event) =>
                                      setEditingDraftByCommentId((prev) => ({ ...prev, [reply.id]: event.target.value }))
                                    }
                                    onInput={(event) => autoResizeTextarea(event.currentTarget)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300"
                                    rows={2}
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                                      disabled={!replyEditDraft.trim() || !!commentBusyKey}
                                      onClick={() => handleUpdateComment(item, reply)}
                                    >
                                      {commentBusyKey === `edit-${reply.id}` ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                      disabled={!!commentBusyKey}
                                      onClick={() => {
                                        setEditingCommentByContentId((prev) => ({ ...prev, [item.contentId]: null }));
                                        setEditingDraftByCommentId((prev) => ({ ...prev, [reply.id]: '' }));
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{reply.text}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          <div className="space-y-2">
            <textarea
              value={commentDraftByContentId[item.contentId] || ''}
              onChange={(event) =>
                setCommentDraftByContentId((prev) => ({ ...prev, [item.contentId]: event.target.value }))
              }
              onInput={(event) => autoResizeTextarea(event.currentTarget)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300"
              rows={3}
              placeholder="Write a comment..."
            />
            <button
              type="button"
              onClick={() => handleAddComment(item)}
              disabled={!String(commentDraftByContentId[item.contentId] || '').trim() || !!commentBusyKey}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {commentBusyKey === `add-${item.contentId}` ? 'Adding...' : 'Add Comment'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
  };

  return (
    <div ref={rootRef} className="relative -mx-8 -mt-14 w-auto space-y-4 pb-4 lg:-mx-10 lg:-mt-16 xl:-mx-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 rounded-[2.25rem] bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(239,68,68,0.08),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(248,250,252,0.65))]" />
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      <div className="w-full max-w-full rounded-[1.65rem] border border-white/70 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <div className="p-0">
          <div className="grid w-full grid-cols-1 gap-2 lg:grid-cols-4 lg:gap-2.5">
            {(Object.keys(TAB_META) as ContentTab[]).map((tab) => {
              const meta = TAB_META[tab];
              const Icon = meta.icon;
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`group flex items-center rounded-[1.2rem] border px-4 py-2.5 text-left transition-all duration-200 ${isActive ? meta.activeClass : meta.idleClass}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-[0.95rem] ${isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-white'}`}>
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-[15px] font-semibold leading-none ${isActive ? 'text-white' : 'text-slate-900'}`}>{meta.label}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {Object.entries(savedDrafts).some(([, draft]) => hasServerDraftContent(draft || null)) && (
        <div className="w-full max-w-full rounded-[1.6rem] border border-violet-100 bg-white px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700">Saved drafts</h3>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-medium text-violet-700">
              Resume unsaved content
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            {(['calendar', 'follow-ee', 'follow-ega'] as ContentDraftMode[]).map((mode) => {
              const draft = savedDrafts[mode] || null;
              if (!hasServerDraftContent(draft)) return null;
              const modeLabel = mode === 'calendar' ? 'Calendar' : mode === 'follow-ee' ? 'Follow Reminder EE' : 'Follow Reminder EGA';
              return (
                <div
                  key={mode}
                  className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50/40"
                >
                  <button
                    type="button"
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (deletingDraftMode) return;
                      setDeletingDraftMode(mode);
                      try {
                        await apiDeleteContentDraft(mode);
                        localStorage.removeItem(`${CONTENT_CREATE_DRAFT_STORAGE_PREFIX}:${mode}`);
                        setSavedDrafts((prev) => ({ ...prev, [mode]: null }));
                        setToast({ message: 'Draft deleted.', type: 'success' });
                      } catch (err: any) {
                        setToast({ message: err?.message || 'Failed to delete draft', type: 'error' });
                      } finally {
                        setDeletingDraftMode(null);
                      }
                    }}
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Delete draft"
                    aria-label="Delete draft"
                    disabled={deletingDraftMode === mode}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/content/new?mode=${encodeURIComponent(mode)}&date=${encodeURIComponent(draft?.contentDate || selectedDate || toDateKey(new Date()))}`)}
                    className="block w-full pr-8 text-left"
                  >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{modeLabel}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">{String(draft?.title || 'Untitled draft')}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {String(draft?.description || 'No description yet')}
                  </p>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && !isDayPage && (
      <div className="w-full max-w-full rounded-[1.8rem] border border-white/70 bg-white shadow-[0_22px_56px_rgba(15,23,42,0.08)]">
        <div className="px-4 py-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Monthly Board</p>
            <h3 className="mt-1 text-[1.7rem] font-semibold tracking-[-0.02em] text-slate-900">{monthCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 text-[13px] text-slate-600">
              {monthContentCount} items scheduled this month
            </div>
            <button
              type="button"
              onClick={() => openCreatePage()}
              className="inline-flex items-center gap-2 rounded-[1rem] bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3.5 py-2.5 text-sm font-medium text-white shadow-[0_16px_30px_rgba(139,92,246,0.22)] transition hover:translate-y-[-1px]"
            >
              <Plus size={16} /> Add Content
            </button>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="inline-flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700">
            {monthCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button
            type="button"
            onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="inline-flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2.5">
          {WEEK_DAYS.map((day, dayIndex) => (
            <div key={day} className={`rounded-[1rem] px-2.5 py-2 text-center text-[11px] font-medium uppercase tracking-[0.12em] ${WEEK_DAY_HEADER_CLASS[dayIndex]}`}>
              {day}
            </div>
          ))}
          {monthDays.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="h-[138px] rounded-[1.35rem] border border-dashed border-slate-200 bg-white/40" />;
            const dateKey = toDateKey(day);
            const counts = countsByDate.get(dateKey);
            const hasAny = !!counts && Object.values(counts).some((val) => val > 0);
            const active = selectedDate === dateKey;
            const dayColumnIndex = idx % 7;
            const isWeekend = dayColumnIndex === 5 || dayColumnIndex === 6;
            const isToday = dateKey === todayKey;
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => navigate(`/content/day/${dateKey}`)}
                className={`group relative h-[138px] overflow-hidden rounded-[1.45rem] border p-3.5 text-left transition-all duration-200 ${
                  active
                    ? 'border-violet-300 bg-gradient-to-br from-violet-50 to-white shadow-[0_18px_40px_rgba(139,92,246,0.12)]'
                    : isWeekend
                    ? 'border-rose-100 bg-gradient-to-br from-rose-50/40 to-white hover:border-rose-200 hover:shadow-[0_12px_28px_rgba(244,63,94,0.08)]'
                    : 'border-slate-200 bg-white hover:border-violet-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-[13px] font-semibold ${active ? 'bg-violet-600 text-white' : isToday ? 'border border-brand-red/20 bg-white text-brand-red shadow-[0_8px_20px_rgba(236,72,71,0.10)]' : 'bg-slate-100 text-slate-700'}`}>
                    {String(day.getDate()).padStart(2, '0')}
                  </span>
                  {isToday ? <span className="rounded-full border border-brand-red/20 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-brand-red shadow-[0_8px_20px_rgba(236,72,71,0.10)]">Today</span> : null}
                </div>
                {hasAny ? (
                  <CalendarDayCounters counts={counts!} />
                ) : (
                  <div className="mt-7 text-[11px] text-slate-300">No scheduled items</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      </div>
      )}

      {activeTab === 'calendar' ? (
        isDayPage ? (
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-white/70 bg-white/90 px-5 py-2 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                    <Link to="/content" className="inline-flex items-center gap-2 transition hover:text-slate-700">
                      <ArrowRight size={12} className="rotate-180" />
                      Calendar
                    </Link>
                    {isTypeDetailPage ? (
                      <>
                        <span>/</span>
                        <Link to={`/content/day/${selectedDate}`} className="inline-flex items-center gap-2 transition hover:text-slate-700">
                          {selectedDate}
                        </Link>
                        {isItemDetailPage ? (
                          <>
                            <span>/</span>
                            <Link to={`/content/day/${selectedDate}/type/${selectedType}`} className="inline-flex items-center gap-2 transition hover:text-slate-700">
                              {TYPE_LABEL[selectedType]}
                            </Link>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  <h3 className="mt-1.5 text-[1.28rem] font-semibold text-slate-900">
                    {isItemDetailPage
                      ? (selectedItem?.title || 'Content details')
                      : isTypeDetailPage
                      ? `${TYPE_LABEL[selectedType]} scheduled for ${selectedDate}`
                      : `Content scheduled for ${selectedDate}`}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {isItemDetailPage
                      ? `Focused view for this ${TYPE_LABEL[selectedType].toLowerCase()} content item.`
                      : isTypeDetailPage
                      ? `${selectedTypeItems.length} ${TYPE_LABEL[selectedType].toLowerCase()} item${selectedTypeItems.length === 1 ? '' : 's'} ready to review, update, or publish.`
                      : `${selectedDayItems.length} item${selectedDayItems.length === 1 ? '' : 's'} ready to review, update, or publish.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCreatePage(selectedDate)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-[0_18px_36px_rgba(139,92,246,0.25)]"
                >
                  <Plus size={16} /> Add Content
                </button>
              </div>
            </div>
            {loading ? (
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 text-slate-500 shadow-sm">Loading...</div>
            ) : isTypeDetailPage ? (
              isItemDetailPage ? (
                selectedItem ? (
                  <div className="w-full">
                    {renderContentCard(selectedItem, { expanded: true })}
                  </div>
                ) : (
                  <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
                    <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${selectedType ? TYPE_ICON_META[selectedType].className : 'bg-violet-50 text-violet-600'}`}>
                      {selectedType ? React.createElement(TYPE_ICON_META[selectedType].icon, { size: 22 }) : <CalendarDays size={22} />}
                    </div>
                    <h4 className="mt-4 text-lg font-semibold text-slate-900">Content item not found</h4>
                    <p className="mt-2 text-sm text-slate-500">Go back to the type view to choose another scheduled item.</p>
                    <div className="mt-5 flex items-center justify-center gap-3">
                      <Link to={`/content/day/${selectedDate}/type/${selectedType}`} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300">
                        <ArrowRight size={14} className="rotate-180" /> Back To Type
                      </Link>
                    </div>
                  </div>
                )
              ) : selectedTypeItems.length > 0 ? (
                <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                  {selectedTypeItems.map((item) => renderContentCard(item, { clickable: true }))}
                </div>
              ) : (
                <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${selectedType ? TYPE_ICON_META[selectedType].className : 'bg-violet-50 text-violet-600'}`}>
                    {selectedType ? React.createElement(TYPE_ICON_META[selectedType].icon, { size: 22 }) : <CalendarDays size={22} />}
                  </div>
                  <h4 className="mt-4 text-lg font-semibold text-slate-900">No {selectedType ? TYPE_LABEL[selectedType].toLowerCase() : 'content'} scheduled for this day</h4>
                  <p className="mt-2 text-sm text-slate-500">Go back to the day summary or create a new item for this content type.</p>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <Link to={`/content/day/${selectedDate}`} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300">
                      <ArrowRight size={14} className="rotate-180" /> Back To Day
                    </Link>
                    <button
                      type="button"
                      onClick={() => openCreatePage(selectedDate)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-[0_18px_36px_rgba(139,92,246,0.24)]"
                    >
                      <Plus size={16} /> Add Content
                    </button>
                  </div>
                </div>
              )
            ) : selectedDayItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {selectedDayGroups.map((group) => {
                  const meta = TYPE_ICON_META[group.type];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={group.type}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/content/day/${selectedDate}/type/${group.type}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(`/content/day/${selectedDate}/type/${group.type}`);
                        }
                      }}
                      className="group relative aspect-[1.16/1] w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 p-3.5 text-left shadow-[0_22px_56px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_64px_rgba(15,23,42,0.12)]"
                    >
                      <div className={`pointer-events-none absolute inset-x-0 top-0 h-[70px] bg-gradient-to-r ${TYPE_ACCENT[group.type].tone}`} />
                      <div className="relative flex h-full flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div className="inline-flex items-center gap-2">
                            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 ${meta.className} shadow-[0_10px_24px_rgba(255,255,255,0.45)]`}>
                              <Icon size={17} />
                            </div>
                            <span className={`inline-flex rounded-full px-3.5 py-1.5 text-[15px] font-semibold ${TYPE_ACCENT[group.type].badge}`}>{TYPE_LABEL[group.type]}</span>
                          </div>
                          <span className={`inline-flex h-10 min-w-[46px] items-center justify-center rounded-[1rem] border bg-white px-2.5 text-[1.1rem] font-semibold ${TYPE_ACCENT[group.type].counter}`}>
                            {group.count}
                          </span>
                        </div>
                        <div className="mt-7 max-h-[184px] space-y-3 overflow-y-auto pr-1">
                          {group.items.map((item, index) => (
                            <button
                              key={item.contentId}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/content/day/${selectedDate}/type/${group.type}/item/${encodeURIComponent(item.contentId)}`);
                              }}
                              className={`flex w-full items-center gap-3 rounded-[1.1rem] border border-white/80 bg-gradient-to-r px-3.5 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] ring-1 transition hover:-translate-y-[1px] hover:border-slate-200 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] ${TYPE_ACCENT[group.type].previewRow}`}
                            >
                              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${TYPE_ACCENT[group.type].previewIndex}`}>
                                {index + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-700">
                                  {item.title || 'Untitled content'}
                                </div>
                                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                                  Scheduled item
                                </div>
                              </div>
                              <span className={`h-2 w-2 rounded-full ${TYPE_ACCENT[group.type].previewDot}`} />
                            </button>
                          ))}
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-4 pt-6">
                          <p className="text-[15px] text-slate-500">
                            {group.count} item{group.count === 1 ? '' : 's'} scheduled
                          </p>
                          <div className="inline-flex items-center gap-2 text-sm font-medium text-brand-red/80 transition group-hover:text-brand-red">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-red/60" />
                            Show all
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <CalendarDays size={22} />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-900">Nothing scheduled for this day yet</h4>
                <p className="mt-2 text-sm text-slate-500">Create a content item to start building the day&apos;s publishing plan.</p>
                <button
                  type="button"
                  onClick={() => openCreatePage(selectedDate)}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-[0_18px_36px_rgba(139,92,246,0.24)]"
                >
                  <Plus size={16} /> Add Content
                </button>
              </div>
            )}
          </div>
        ) : null
      ) : activeTab === 'auto-add' ? (
        <div className="rounded-[2rem] border border-white/70 bg-white/90 px-5 py-3.5 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-[1.2rem] font-semibold text-slate-900">Auto add library</h3>
            </div>
            <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/70 px-3.5 py-1.5 text-[13px] text-fuchsia-700">
              {linkOptions.length + tagOptions.length} reusable assets
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:justify-items-center">
            <div className="w-full max-w-[640px] rounded-[1.7rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-2.5 shadow-sm xl:w-[590px] xl:max-w-[590px]">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-[0.95rem] bg-violet-100 text-violet-700"><Link2 size={14} /></div>
                <div className="min-w-0">
                  <h4 className="text-[0.95rem] font-semibold leading-none text-slate-900">Links</h4>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <input value={newLinkValue} onChange={(e) => setNewLinkValue(e.target.value)} placeholder="https://..." className="min-w-0 w-[calc(100%-72px)] max-w-[500px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[14px] outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
                <button type="button" onClick={addAutoLink} className="min-w-[62px] rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-[12px] font-medium text-white shadow-[0_16px_30px_rgba(139,92,246,0.22)]">Add</button>
              </div>
              <div className="mt-3.5 space-y-2">
                {linkOptions.map((entry) => (
                  <div key={entry} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm">
                    <span className="truncate text-[13px] text-slate-700">{entry}</span>
                    <button type="button" onClick={() => removeAutoLink(entry)} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100">Remove</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full max-w-[640px] rounded-[1.7rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-2.5 shadow-sm xl:w-[590px] xl:max-w-[590px]">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-[0.95rem] bg-fuchsia-100 text-fuchsia-700"><Hash size={14} /></div>
                <div className="min-w-0">
                  <h4 className="text-[0.95rem] font-semibold leading-none text-slate-900">Hashtags</h4>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <input value={newTagValue} onChange={(e) => setNewTagValue(e.target.value)} placeholder="#tag" className="min-w-0 w-[calc(100%-72px)] max-w-[500px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[14px] outline-none transition focus:border-fuchsia-300 focus:ring-4 focus:ring-fuchsia-100" />
                <button type="button" onClick={addAutoTag} className="min-w-[62px] rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2 text-[12px] font-medium text-white shadow-[0_16px_30px_rgba(217,70,239,0.22)]">Add</button>
              </div>
              <div className="mt-3.5 space-y-2">
                {tagOptions.map((entry) => (
                  <div key={entry} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm">
                    <span className="truncate text-[13px] text-slate-700">{entry}</span>
                    <button type="button" onClick={() => removeAutoTag(entry)} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-white/70 bg-white/90 px-5 py-4 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  <span>Reminder Workflow</span>
                  {isReminderTypeDetail ? (
                    <>
                      <span>/</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/content?tab=${encodeURIComponent(activeTab)}`)}
                        className="transition hover:text-slate-700"
                      >
                        {activeTab === 'follow-ee' ? 'EE follow-ups' : 'EGA follow-ups'}
                      </button>
                    </>
                  ) : null}
                  {isReminderItemDetail ? (
                    <>
                      <span>/</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/content?tab=${encodeURIComponent(activeTab)}&reminderType=${encodeURIComponent(selectedReminderType!)}`)}
                        className="transition hover:text-slate-700"
                      >
                        {reminderCategoryLabel}
                      </button>
                    </>
                  ) : null}
                </div>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">
                  {isReminderItemDetail
                    ? (selectedReminderItem?.title || 'Reminder details')
                    : isReminderTypeDetail
                    ? `${reminderCategoryLabel} reminders`
                    : activeTab === 'follow-ee'
                    ? 'EE follow-ups'
                    : 'EGA follow-ups'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => openCreatePage(selectedDate)}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-[0_18px_36px_rgba(139,92,246,0.25)]"
              >
                <Plus size={16} /> Add Reminder
              </button>
            </div>
          </div>
          {loading ? (
            <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 text-slate-500 shadow-sm">Loading...</div>
          ) : activeReminderItems.length === 0 ? (
            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <BellRing size={22} />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">No reminders in this stream</h4>
              <p className="mt-2 text-sm text-slate-500">Add a reminder to create a polished follow-up queue for your team.</p>
            </div>
          ) : isReminderItemDetail ? (
            selectedReminderItem ? (
              <div className="w-full">
                {renderContentCard(selectedReminderItem, { expanded: true })}
              </div>
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${selectedReminderType ? TYPE_ICON_META[selectedReminderType].className : 'bg-emerald-50 text-emerald-600'}`}>
                  {selectedReminderType ? React.createElement(TYPE_ICON_META[selectedReminderType].icon, { size: 22 }) : <BellRing size={22} />}
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-900">Reminder item not found</h4>
                <p className="mt-2 text-sm text-slate-500">Go back to the reminder type view to choose another item.</p>
              </div>
            )
          ) : isReminderTypeDetail ? (
            selectedReminderTypeItems.length > 0 ? (
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {selectedReminderTypeItems.map((item) =>
                  renderContentCard(item, {
                    clickable: true,
                    clickHref: `/content?tab=${encodeURIComponent(activeTab)}&reminderType=${encodeURIComponent(selectedReminderType!)}&reminderItem=${encodeURIComponent(item.contentId)}`,
                  })
                )}
              </div>
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${selectedReminderType ? TYPE_ICON_META[selectedReminderType].className : 'bg-emerald-50 text-emerald-600'}`}>
                  {selectedReminderType ? React.createElement(TYPE_ICON_META[selectedReminderType].icon, { size: 22 }) : <BellRing size={22} />}
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-900">No reminders in this type</h4>
                <p className="mt-2 text-sm text-slate-500">Go back to the reminder overview or add a new reminder for this content type.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {activeReminderItems.map((item) =>
                renderContentCard(item, {
                  clickable: true,
                  clickHref: `/content?tab=${encodeURIComponent(activeTab)}&reminderType=${encodeURIComponent(item.type)}&reminderItem=${encodeURIComponent(item.contentId)}`,
                })
              )}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.18)]">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-violet-50 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Content Composer</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-900">{editingItem ? 'Edit Content' : 'Create Content'}</h3>
                </div>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-800">
                  <X size={16} />
                </button>
              </div>
            </div>
            <form onSubmit={handleSave} className="space-y-4 p-6">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content title" className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <select value={type} onChange={(e) => setType(e.target.value as ContentType)} className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100">
                  <option value="general">General</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="youtube">YouTube</option>
                  <option value="newsletter">Mail</option>
                  <option value="website">Website</option>
                </select>
                <input type="date" value={contentDate} onChange={(e) => setContentDate(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
              </div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} placeholder="Description" className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] leading-7 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-sm font-medium text-violet-700">
                <FileText size={16} />
                {uploadingAttachment ? 'Uploading files...' : 'Add files'}
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rtf" className="hidden" onChange={(e) => handleAttachmentUpload(e.target.files)} />
              </label>
              {attachments.length > 0 && (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {attachments.map((asset) => (
                    <div key={`${asset.fileId}-${asset.fileUrl}`} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-sm text-slate-700">
                      <span className="truncate">{asset.fileName || asset.fileUrl}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((entry) => entry.fileId !== asset.fileId || entry.fileUrl !== asset.fileUrl))}
                        className="rounded-xl p-1 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove attachment"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_18px_30px_rgba(139,92,246,0.24)] disabled:opacity-60">
                  {submitting ? 'Saving...' : editingItem ? 'Update Content' : 'Save Content'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_40px_110px_rgba(15,23,42,0.18)]">
            <div className="bg-gradient-to-r from-rose-50 to-white px-6 py-5">
              <h3 className="text-xl font-semibold text-slate-900">Delete content?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">This action removes the selected content item from the calendar and reminder views.</p>
            </div>
            <div className="px-6 py-5">
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleDelete(deleteTarget.contentId);
                    setDeleteTarget(null);
                  }}
                  className="rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_18px_30px_rgba(225,29,72,0.22)]"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {commentDeleteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_40px_110px_rgba(15,23,42,0.18)]">
            <div className="bg-gradient-to-r from-rose-50 to-white px-6 py-5">
              <h3 className="text-xl font-semibold text-slate-900">Delete comment?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Do you want to delete this comment?</p>
            </div>
            <div className="px-6 py-5">
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={!!commentBusyKey}
                  onClick={() => setCommentDeleteModal(null)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  No
                </button>
                <button
                  type="button"
                  disabled={!!commentBusyKey}
                  onClick={() => handleDeleteComment(commentDeleteModal.contentId, commentDeleteModal.commentId)}
                  className="rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_18px_30px_rgba(225,29,72,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {commentBusyKey === `delete-${commentDeleteModal.commentId}` ? 'Processing...' : 'Yes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default ContentView;
