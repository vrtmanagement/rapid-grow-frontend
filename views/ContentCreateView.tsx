import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, FileText, Globe, Hash, Link2, Linkedin, Mail, Sparkles, X } from 'lucide-react';
import { apiCreateContent, apiDeleteContentDraft, apiGetContentDraft, apiUploadContentFile, apiUpsertContentDraft, ContentAsset, ContentDraftMode, ContentType } from '../services/contentApi';
import Toast from '../components/ui/Toast';

const LINK_STORAGE_KEY = 'rapidgrow-content-links-v1';
const TAG_STORAGE_KEY = 'rapidgrow-content-tags-v1';
const CONTENT_CREATE_DRAFT_STORAGE_PREFIX = 'rapidgrow-content-create-draft-v1';

function getInitialDate(search: string) {
  const value = new URLSearchParams(search).get('date') || '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
}

function getMode(search: string) {
  const mode = new URLSearchParams(search).get('mode') || 'calendar';
  if (mode === 'follow-ee' || mode === 'follow-ega') return mode;
  return 'calendar';
}

function readStringList(storageKey: string, fallback: string[]) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const cleaned = parsed.map((entry) => String(entry || '').trim()).filter(Boolean);
    return cleaned.length ? cleaned : fallback;
  } catch {
    return fallback;
  }
}

function extractStyledTokens(text: string) {
  const parts = String(text || '').split(/\s+/).filter(Boolean);
  return parts.filter((part) => /^https?:\/\/\S+$/i.test(part) || /^#[^\s#]+$/.test(part));
}

type FieldErrors = {
  title?: string;
  description?: string;
  contentDate?: string;
  newLinkValue?: string;
  newTagValue?: string;
};

const CONTENT_TYPE_OPTIONS = [
  {
    value: 'general' as ContentType,
    label: 'General',
    description: 'General updates and flexible notes',
    icon: FileText,
    accent: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
  },
  {
    value: 'linkedin' as ContentType,
    label: 'LinkedIn',
    description: 'Professional social publishing',
    icon: Linkedin,
    accent: 'border-sky-200 bg-sky-50/80 text-sky-700',
  },
  {
    value: 'youtube' as ContentType,
    label: 'YouTube',
    description: 'Video titles and publish copy',
    icon: Sparkles,
    accent: 'border-rose-200 bg-rose-50/80 text-rose-700',
  },
  {
    value: 'newsletter' as ContentType,
    label: 'Mail',
    description: 'Email and newsletter content',
    icon: Mail,
    accent: 'border-amber-200 bg-amber-50/80 text-amber-700',
  },
  {
    value: 'website' as ContentType,
    label: 'Website',
    description: 'Landing pages and site updates',
    icon: Globe,
    accent: 'border-indigo-200 bg-indigo-50/80 text-indigo-700',
  },
];

function validateTitle(value: string) {
  const clean = value.trim();
  if (!clean) return 'Title is required.';
  if (clean.length < 3) return 'Use at least 3 characters for the title.';
  if (clean.length > 120) return 'Keep the title under 120 characters.';
  return '';
}

function validateDescription(value: string) {
  const clean = value.trim();
  if (!clean) return 'Description is required.';
  if (clean.length < 8) return 'Add a little more detail to the description.';
  return '';
}

function validateContentDate(value: string) {
  if (!value) return 'Date is required.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Choose a valid date.';
  return '';
}

function validateLinkValue(value: string) {
  const clean = value.trim();
  if (!clean) return 'Link cannot be empty.';
  if (!/^https?:\/\/\S+$/i.test(clean)) return 'Use a full link starting with http:// or https://';
  return '';
}

function validateTagValue(value: string) {
  const clean = value.trim();
  if (!clean) return 'Hashtag cannot be empty.';
  const normalized = clean.startsWith('#') ? clean : `#${clean}`;
  if (!/^#[A-Za-z0-9_]+$/.test(normalized)) return 'Use letters, numbers, or underscores only.';
  return '';
}

function parseDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateDisplay(value: string) {
  const date = parseDateValue(value);
  if (!date) return 'Select publish date';
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(value);
}

function hasNonEmptyDraft(payload: { title: string; description: string; attachments: ContentAsset[] }) {
  return Boolean(
    payload.title.trim() ||
    payload.description.trim() ||
    (payload.attachments && payload.attachments.length > 0)
  );
}

function getCalendarDays(viewDate: Date) {
  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startWeekday = startOfMonth.getDay();
  const gridStart = new Date(startOfMonth);
  gridStart.setDate(startOfMonth.getDate() - startWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return {
      key: `${year}-${month}-${day}`,
      label: date.getDate(),
      inMonth: date.getMonth() === viewDate.getMonth(),
      isToday: date.toDateString() === new Date().toDateString(),
    };
  });
}

const ContentCreateView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = getMode(location.search);
  const isFollowMode = mode === 'follow-ee' || mode === 'follow-ega';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ContentType>('general');
  const [contentDate, setContentDate] = useState(getInitialDate(location.search));
  const [attachments, setAttachments] = useState<ContentAsset[]>([]);
  const [linkOptions, setLinkOptions] = useState<string[]>(() => readStringList(LINK_STORAGE_KEY, []));
  const [tagOptions, setTagOptions] = useState<string[]>(() => readStringList(TAG_STORAGE_KEY, []));
  const [newLinkValue, setNewLinkValue] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [showAutoAddedManager, setShowAutoAddedManager] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => parseDateValue(getInitialDate(location.search)) || new Date());
  const linkPickerWrapRef = useRef<HTMLDivElement | null>(null);
  const tagPickerWrapRef = useRef<HTMLDivElement | null>(null);
  const typePickerWrapRef = useRef<HTMLDivElement | null>(null);
  const datePickerWrapRef = useRef<HTMLDivElement | null>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [draftHydrated, setDraftHydrated] = useState(false);
  const latestDraftSaveRef = useRef(0);
  const draftStorageKey = `${CONTENT_CREATE_DRAFT_STORAGE_PREFIX}:${mode}`;
  const draftMode = mode as ContentDraftMode;

  const donePath = useMemo(() => {
    if (isFollowMode) return `/content?tab=${mode}`;
    return `/content/day/${contentDate}`;
  }, [contentDate, isFollowMode, mode]);
  const styledTokens = useMemo(() => extractStyledTokens(description), [description]);
  const selectedTypeOption = useMemo(
    () => CONTENT_TYPE_OPTIONS.find((option) => option.value === type) || CONTENT_TYPE_OPTIONS[0],
    [type]
  );
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);

  const appendToDescription = (token: string) => {
    const cleanToken = token.trim();
    if (!cleanToken) return;
    const trimmedEnd = description.replace(/\s+$/, '');
    const next = trimmedEnd ? `${trimmedEnd} ${cleanToken}` : cleanToken;
    setDescription(next);
    setFieldErrors((prev) => ({ ...prev, description: undefined }));
  };

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploads = await Promise.all(Array.from(files).map((file) => apiUploadContentFile(file)));
      setAttachments((prev) => [...prev, ...uploads]);
      setToast({ message: 'Files uploaded successfully.', type: 'success' });
    } catch (err: any) {
      setError(err.message || 'Failed to upload attachment');
      setToast({ message: err.message || 'Failed to upload attachment', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (asset: ContentAsset) => {
    setAttachments((prev) => prev.filter((entry) => entry.fileId !== asset.fileId || entry.fileUrl !== asset.fileUrl));
  };

  const saveAutoOptions = (links: string[], tags: string[]) => {
    setLinkOptions(links);
    setTagOptions(tags);
    localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify(links));
    localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(tags));
  };

  const addAutoLink = () => {
    const value = newLinkValue.trim();
    const validationError = validateLinkValue(value);
    if (validationError) {
      setFieldErrors((prev) => ({ ...prev, newLinkValue: validationError }));
      return;
    }
    const next = Array.from(new Set([...linkOptions, value]));
    saveAutoOptions(next, tagOptions);
    setNewLinkValue('');
    setFieldErrors((prev) => ({ ...prev, newLinkValue: undefined }));
  };

  const addAutoTag = () => {
    const value = newTagValue.trim();
    const validationError = validateTagValue(value);
    if (validationError) {
      setFieldErrors((prev) => ({ ...prev, newTagValue: validationError }));
      return;
    }
    const normalized = value.startsWith('#') ? value : `#${value}`;
    const next = Array.from(new Set([...tagOptions, normalized]));
    saveAutoOptions(linkOptions, next);
    setNewTagValue('');
    setFieldErrors((prev) => ({ ...prev, newTagValue: undefined }));
  };

  const removeAutoLink = (value: string) => {
    const next = linkOptions.filter((entry) => entry !== value);
    saveAutoOptions(next, tagOptions);
  };

  const removeAutoTag = (value: string) => {
    const next = tagOptions.filter((entry) => entry !== value);
    saveAutoOptions(linkOptions, next);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: FieldErrors = {
      title: validateTitle(title) || undefined,
      description: validateDescription(description) || undefined,
      contentDate: validateContentDate(contentDate) || undefined,
    };
    setFieldErrors(nextErrors);
    const firstError = nextErrors.title || nextErrors.description || nextErrors.contentDate;
    if (firstError) {
      setError(firstError);
      setToast({ message: firstError, type: 'error' });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiCreateContent({
        title: title.trim(),
        description,
        type: isFollowMode ? 'newsletter' : type,
        contentDate,
        channelKey: isFollowMode ? mode : type,
        coverImage: null,
        attachments,
      });
      localStorage.removeItem(draftStorageKey);
      try {
        await apiDeleteContentDraft(draftMode);
      } catch {
        // Ignore draft cleanup errors after successful final save.
      }
      navigate(donePath, {
        state: {
          contentToast: {
            message: isFollowMode ? 'Reminder saved successfully.' : 'Content saved successfully.',
            type: 'success',
          },
        },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create content');
      setToast({ message: err.message || 'Failed to create content', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const activeDate = parseDateValue(contentDate);
    if (activeDate) {
      setCalendarMonth(activeDate);
    }
  }, [contentDate]);

  useEffect(() => {
    let active = true;
    setDraftHydrated(false);
    setAutosaveStatus('idle');

    const applyDraft = (draft: any) => {
      if (!draft || typeof draft !== 'object') return;
      if (typeof draft.title === 'string') setTitle(draft.title);
      if (typeof draft.description === 'string') setDescription(draft.description);
      if (typeof draft.type === 'string' && CONTENT_TYPE_OPTIONS.some((option) => option.value === draft.type)) {
        setType(draft.type as ContentType);
      }
      if (typeof draft.contentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(draft.contentDate)) {
        setContentDate(draft.contentDate);
      }
      if (Array.isArray(draft.attachments)) {
        setAttachments(draft.attachments as ContentAsset[]);
      }
    };

    const readLocalDraft = () => {
      try {
        const raw = localStorage.getItem(draftStorageKey);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };

    async function hydrateDraft() {
      try {
        const response = await apiGetContentDraft(draftMode);
        if (!active) return;
        if (response?.draft) {
          applyDraft(response.draft);
          localStorage.setItem(draftStorageKey, JSON.stringify(response.draft));
          setDraftHydrated(true);
          return;
        }
        // Server explicitly has no draft for this mode, so clear local fallback copy too.
        localStorage.removeItem(draftStorageKey);
        setDraftHydrated(true);
        return;
      } catch {
        // Fallback to local draft when API is not available.
      }

      if (!active) return;
      applyDraft(readLocalDraft());
      setDraftHydrated(true);
    }

    hydrateDraft();
    return () => {
      active = false;
    };
  }, [draftMode, draftStorageKey]);

  useEffect(() => {
    if (!draftHydrated || submitting) return;
    const payload = { title, description, type, contentDate, attachments };
    const timer = window.setTimeout(() => {
      localStorage.setItem(draftStorageKey, JSON.stringify(payload));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [attachments, contentDate, description, draftHydrated, draftStorageKey, submitting, title, type]);

  useEffect(() => {
    if (!draftHydrated || submitting) return;
    const payload = { title, description, type, contentDate, attachments };
    const saveId = latestDraftSaveRef.current + 1;
    latestDraftSaveRef.current = saveId;
    const timer = window.setTimeout(async () => {
      try {
        if (!hasNonEmptyDraft({ title, description, attachments })) {
          await apiDeleteContentDraft(draftMode);
          if (latestDraftSaveRef.current === saveId) setAutosaveStatus('idle');
          return;
        }
        if (latestDraftSaveRef.current === saveId) setAutosaveStatus('saving');
        await apiUpsertContentDraft(draftMode, payload);
        if (latestDraftSaveRef.current === saveId) setAutosaveStatus('saved');
      } catch {
        if (latestDraftSaveRef.current === saveId) setAutosaveStatus('error');
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [attachments, contentDate, description, draftHydrated, draftMode, submitting, title, type]);

  useEffect(() => {
    const textarea = descriptionTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, window.innerHeight * 0.7)}px`;
  }, [description]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showLinkPicker && linkPickerWrapRef.current && !linkPickerWrapRef.current.contains(target)) {
        setShowLinkPicker(false);
      }
      if (showTagPicker && tagPickerWrapRef.current && !tagPickerWrapRef.current.contains(target)) {
        setShowTagPicker(false);
      }
      if (showTypePicker && typePickerWrapRef.current && !typePickerWrapRef.current.contains(target)) {
        setShowTypePicker(false);
      }
      if (showDatePicker && datePickerWrapRef.current && !datePickerWrapRef.current.contains(target)) {
        setShowDatePicker(false);
      }
    };

    if (showLinkPicker || showTagPicker || showTypePicker || showDatePicker) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showDatePicker, showLinkPicker, showTagPicker, showTypePicker]);

  const panelClass = 'rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-4';
  const inputBaseClass = 'w-full rounded-[0.95rem] border bg-slate-50/70 px-3.5 py-2.5 text-[15px] text-slate-700 outline-none transition';
  const pickerButtonClass = 'flex w-full items-center justify-between rounded-[0.95rem] border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left transition hover:border-violet-200 hover:bg-white';

  return (
    <div className="relative -mx-4 -mt-8 space-y-3 px-4 pb-6 sm:-mx-6 sm:-mt-10 sm:px-6 lg:-mx-16 lg:-mt-20 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-[linear-gradient(180deg,rgba(248,250,252,0.94),rgba(241,245,249,0.52)_60%,rgba(248,250,252,0))]" />
      <div className="hidden overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.09)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-700">
              <Sparkles size={14} />
              Content Composer
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
              {isFollowMode ? 'Create a polished follow-up reminder' : 'Craft content in a premium publishing workspace'}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">
              Build content with cleaner structure, reusable assets, and a calmer editor flow that matches the portal’s premium style.
            </p>
          </div>
          <Link to={donePath} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700">
            <ArrowRight size={14} className="rotate-180" />
            Back
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 sm:pt-3 lg:pt-4">
        <Link
          to={donePath}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
        >
          <ArrowRight size={14} className="rotate-180" />
          Back
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-3 rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-4 lg:p-5">
        <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[1.15rem] border border-violet-200 bg-violet-50 text-violet-700">
              <FileText size={15} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-900">Content Details</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {!isFollowMode ? (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-900">
                    Title<span className="text-rose-500">*</span>
                  </p>
                  <span className="rounded-full border border-violet-100 bg-violet-50/80 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                    Primary field
                  </span>
                </div>
                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  onBlur={() => setFieldErrors((prev) => ({ ...prev, title: validateTitle(title) || undefined }))}
                  placeholder="Content title"
                  className={`${inputBaseClass} ${fieldErrors.title ? 'border-red-200 focus:border-red-300 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100'}`}
                />
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <p className={`text-xs ${fieldErrors.title ? 'text-red-600' : 'text-slate-400'}`}>
                    {fieldErrors.title || 'Use a clear title so the content is easy to scan later.'}
                  </p>
                  <p className="text-xs text-slate-400">{title.trim().length}/120</p>
                </div>
              </div>

              <div ref={typePickerWrapRef} className="relative rounded-[1.1rem] border border-slate-200 bg-white p-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] xl:col-span-2">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-900">Content Type</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowDatePicker(false);
                    setShowTypePicker((prev) => !prev);
                  }}
                  className={`${pickerButtonClass} ${showTypePicker ? 'rounded-b-[0.35rem] border-b-transparent bg-white' : ''}`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-[1rem] border ${selectedTypeOption.accent}`}>
                      <selectedTypeOption.icon size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-slate-800">{selectedTypeOption.label}</span>
                    </span>
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition ${showTypePicker ? 'rotate-180' : ''}`} />
                </button>
                {showTypePicker && (
                  <div className="absolute inset-x-0 top-full z-30 -mt-px overflow-hidden rounded-b-[0.95rem] border border-slate-200 border-t-0 bg-white p-1 shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
                    <div className="space-y-0.5">
                      {CONTENT_TYPE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setType(option.value);
                            setShowTypePicker(false);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-[0.85rem] border px-2.5 py-1.5 text-left transition ${
                            option.value === type
                              ? 'border-violet-200 bg-slate-50/80 shadow-[inset_0_0_0_1px_rgba(196,181,253,0.35)]'
                              : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50/70'
                          }`}
                        >
                          <span className={`flex h-7 w-7 items-center justify-center rounded-[0.9rem] border ${option.accent}`}>
                            <option.icon size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-semibold text-slate-800">{option.label}</span>
                          </span>
                          {option.value === type ? (
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-medium text-violet-700">
                              Active
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div ref={datePickerWrapRef} className="relative rounded-[1.1rem] border border-slate-200 bg-white p-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] xl:col-span-2">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-900">Publish Date</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowTypePicker(false);
                    setShowDatePicker((prev) => !prev);
                  }}
                  className={`${pickerButtonClass} ${fieldErrors.contentDate ? 'border-red-200' : ''} ${showDatePicker ? 'rounded-b-[0.35rem] border-b-transparent bg-white' : ''}`}
                >
                  <span className="block text-[13px] font-medium text-slate-800">{formatDateDisplay(contentDate)}</span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-[1rem] border ${fieldErrors.contentDate ? 'border-red-200 bg-red-50 text-red-500' : 'border-violet-200 bg-violet-50/80 text-violet-700'}`}>
                    <CalendarDays size={14} />
                  </span>
                </button>
                {showDatePicker && (
                  <div className="absolute right-0 top-full z-30 -mt-px w-[252px] overflow-hidden rounded-b-[0.95rem] border border-slate-200 border-t-0 bg-white p-1.5 shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
                    <div className="rounded-[0.8rem] border border-violet-100 bg-[linear-gradient(180deg,rgba(245,243,255,0.95),rgba(255,255,255,0.94))] px-2.5 py-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">Content Calendar</p>
                          <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{formatMonthLabel(calendarMonth)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                            className="flex h-6.5 w-6.5 items-center justify-center rounded-[0.75rem] border border-violet-100 bg-white text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
                            aria-label="Previous month"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                            className="flex h-6.5 w-6.5 items-center justify-center rounded-[0.75rem] border border-violet-100 bg-white text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
                            aria-label="Next month"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1.5 grid grid-cols-7 gap-1 px-1 text-center text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1">
                      {calendarDays.map((day) => {
                        const isSelected = day.key === contentDate;
                        return (
                          <button
                            key={day.key}
                            type="button"
                            onClick={() => {
                              setContentDate(day.key);
                              setFieldErrors((prev) => ({ ...prev, contentDate: undefined }));
                              setShowDatePicker(false);
                            }}
                            className={`flex h-6 items-center justify-center rounded-[0.65rem] text-[11px] font-medium transition ${
                              isSelected
                                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_10px_26px_rgba(139,92,246,0.28)]'
                                : day.inMonth
                                  ? day.isToday
                                    ? 'border border-violet-200 bg-violet-50/70 text-violet-700 hover:bg-violet-100'
                                    : 'text-slate-700 hover:bg-slate-100'
                                  : 'text-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 px-1 pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date();
                          const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          setCalendarMonth(today);
                          setContentDate(todayValue);
                          setFieldErrors((prev) => ({ ...prev, contentDate: undefined }));
                          setShowDatePicker(false);
                        }}
                        className="rounded-[0.75rem] border border-violet-200 bg-violet-50/80 px-2 py-0.5 text-[9px] font-medium text-violet-700 transition hover:bg-violet-100"
                      >
                        Use Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(false)}
                        className="rounded-[0.75rem] px-2 py-0.5 text-[9px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
                {fieldErrors.contentDate ? <p className="mt-1.5 text-xs text-red-600">{fieldErrors.contentDate}</p> : null}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-900">
                  Title<span className="text-rose-500">*</span>
                </p>
                <span className="rounded-full border border-violet-100 bg-violet-50/80 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                  Primary field
                </span>
              </div>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, title: undefined }));
                }}
                onBlur={() => setFieldErrors((prev) => ({ ...prev, title: validateTitle(title) || undefined }))}
                placeholder="Content title"
                className={`${inputBaseClass} ${fieldErrors.title ? 'border-red-200 focus:border-red-300 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100'}`}
              />
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <p className={`text-xs ${fieldErrors.title ? 'text-red-600' : 'text-slate-400'}`}>
                  {fieldErrors.title || 'Use a clear title so the content is easy to scan later.'}
                </p>
                <p className="text-xs text-slate-400">{title.trim().length}/120</p>
              </div>
            </div>
          )}

          <div>
            <div className="mb-2.5 flex flex-col gap-2 border-b border-slate-100 pb-2.5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-900">Description</p>
              </div>
            </div>
            <textarea
              ref={descriptionTextareaRef}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setFieldErrors((prev) => ({ ...prev, description: undefined }));
              }}
              onBlur={() => setFieldErrors((prev) => ({ ...prev, description: validateDescription(description) || undefined }))}
              rows={12}
              placeholder="Description / post body"
              className={`min-h-[70vh] overflow-hidden ${inputBaseClass} resize-none px-3.5 py-3 leading-7 ${fieldErrors.description ? 'border-red-200 focus:border-red-300 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100'}`}
            />
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <p className={`text-xs ${fieldErrors.description ? 'text-red-600' : 'text-slate-400'}`}>{fieldErrors.description || ''}</p>
              <p className="text-xs text-slate-400">{description.trim().length} chars</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/70 px-3.5 py-2.5 text-sm font-medium text-violet-700">
            <FileText size={16} />
            {uploading ? 'Uploading files...' : 'Add files'}
            <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rtf" className="hidden" onChange={(e) => handleAttachmentUpload(e.target.files)} />
          </label>
          {!isFollowMode && (
            <>
              <div ref={linkPickerWrapRef} className="relative">
                {showLinkPicker && (
                  <div className="absolute bottom-full left-0 z-20 mb-3 w-72 overflow-hidden rounded-[1.4rem] border border-white/80 bg-white/95 shadow-[0_22px_60px_rgba(15,23,42,0.16)] backdrop-blur">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white px-4 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-violet-600">Quick Insert</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">Saved links</p>
                    </div>
                    <div className="max-h-52 overflow-auto p-2">
                    {linkOptions.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-slate-500">No links in auto list.</p>
                    ) : (
                      linkOptions.map((entry) => (
                        <button
                          key={entry}
                          type="button"
                          onClick={() => {
                            appendToDescription(entry);
                            setShowLinkPicker(false);
                          }}
                          className="block w-full truncate rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-violet-50"
                        >
                          {entry}
                        </button>
                      ))
                    )}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowTagPicker(false);
                    setShowLinkPicker((prev) => !prev);
                  }}
                  className="rounded-2xl border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
                >
                  Add Link
                </button>
              </div>
              <div ref={tagPickerWrapRef} className="relative">
                {showTagPicker && (
                  <div className="absolute bottom-full left-0 z-20 mb-3 w-64 overflow-hidden rounded-[1.4rem] border border-white/80 bg-white/95 shadow-[0_22px_60px_rgba(15,23,42,0.16)] backdrop-blur">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-fuchsia-50 to-white px-4 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fuchsia-600">Quick Insert</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">Saved hashtags</p>
                    </div>
                    <div className="max-h-52 overflow-auto p-2">
                    {tagOptions.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-slate-500">No hashtags in auto list.</p>
                    ) : (
                      tagOptions.map((entry) => (
                        <button
                          key={entry}
                          type="button"
                          onClick={() => {
                            appendToDescription(entry);
                            setShowTagPicker(false);
                          }}
                          className="block w-full truncate rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-fuchsia-50"
                        >
                          {entry}
                        </button>
                      ))
                    )}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkPicker(false);
                    setShowTagPicker((prev) => !prev);
                  }}
                  className="rounded-2xl border border-fuchsia-200 bg-white px-3 py-2 text-sm font-medium text-fuchsia-700 transition hover:border-fuchsia-300 hover:bg-fuchsia-50"
                >
                  Add Hashtag
                </button>
              </div>
              <button type="button" onClick={() => setShowAutoAddedManager(true)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300">
                Manage Auto Added
              </button>
            </>
          )}
        </div>
        {styledTokens.length > 0 && (
          <div className="rounded-[1.6rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Added links and tags</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {styledTokens.map((token, index) =>
                /^https?:\/\/\S+$/i.test(token) ? (
                  <a
                    key={`${token}-${index}`}
                    href={token}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    {token}
                  </a>
                ) : (
                  <strong key={`${token}-${index}`} className="font-semibold text-slate-800">
                    {token}
                  </strong>
                )
              )}
            </div>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {attachments.map((asset) => (
              <div key={`${asset.fileId}-${asset.fileUrl}`} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-sm text-slate-700">
                <span className="truncate">{asset.fileName || asset.fileUrl}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(asset)}
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
          <div className="mr-auto self-center text-xs text-slate-500">
            {autosaveStatus === 'saving'
              ? 'Auto-saving draft...'
              : autosaveStatus === 'saved'
                ? 'Draft auto-saved'
                : autosaveStatus === 'error'
                  ? 'Draft save failed, retrying on next change'
                  : 'Draft auto-save is on'}
          </div>
          <Link to={donePath} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">Cancel</Link>
          <button type="submit" disabled={submitting} className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_18px_30px_rgba(139,92,246,0.24)] disabled:opacity-60">
            {submitting ? 'Saving...' : 'Save Content'}
          </button>
        </div>
      </form>
      {showAutoAddedManager && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/80 bg-white p-6 shadow-[0_40px_110px_rgba(15,23,42,0.18)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Reusable Assets</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Auto Added Links & Tags</h3>
              </div>
              <button type="button" onClick={() => setShowAutoAddedManager(false)} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">Close</button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-[1.6rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-violet-100 p-3 text-violet-700"><Link2 size={16} /></div>
                  <p className="text-sm font-semibold text-slate-900">Links</p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={newLinkValue}
                    onChange={(e) => {
                      setNewLinkValue(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, newLinkValue: undefined }));
                    }}
                    onBlur={() => newLinkValue.trim() ? setFieldErrors((prev) => ({ ...prev, newLinkValue: validateLinkValue(newLinkValue) || undefined })) : undefined}
                    placeholder="https://..."
                    className={`flex-1 rounded-2xl border px-3 py-2.5 text-sm outline-none transition ${fieldErrors.newLinkValue ? 'border-red-200 focus:border-red-300 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100'}`}
                  />
                  <button type="button" onClick={addAutoLink} className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-medium text-white">Add</button>
                </div>
                {fieldErrors.newLinkValue ? <p className="text-xs text-red-600">{fieldErrors.newLinkValue}</p> : null}
                <div className="space-y-1 max-h-36 overflow-auto">
                  {linkOptions.map((entry) => (
                    <div key={entry} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs">
                      <span className="truncate pr-2">{entry}</span>
                      <button type="button" onClick={() => removeAutoLink(entry)} className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-600">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3 rounded-[1.6rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-fuchsia-100 p-3 text-fuchsia-700"><Hash size={16} /></div>
                  <p className="text-sm font-semibold text-slate-900">Hashtags</p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={newTagValue}
                    onChange={(e) => {
                      setNewTagValue(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, newTagValue: undefined }));
                    }}
                    onBlur={() => newTagValue.trim() ? setFieldErrors((prev) => ({ ...prev, newTagValue: validateTagValue(newTagValue) || undefined })) : undefined}
                    placeholder="#tag"
                    className={`flex-1 rounded-2xl border px-3 py-2.5 text-sm outline-none transition ${fieldErrors.newTagValue ? 'border-red-200 focus:border-red-300 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:border-fuchsia-300 focus:ring-4 focus:ring-fuchsia-100'}`}
                  />
                  <button type="button" onClick={addAutoTag} className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white">Add</button>
                </div>
                {fieldErrors.newTagValue ? <p className="text-xs text-red-600">{fieldErrors.newTagValue}</p> : null}
                <div className="space-y-1 max-h-36 overflow-auto">
                  {tagOptions.map((entry) => (
                    <div key={entry} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs">
                      <span className="truncate pr-2">{entry}</span>
                      <button type="button" onClick={() => removeAutoTag(entry)} className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-600">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default ContentCreateView;
