import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BellRing, Bot, Calendar, CalendarDays, Check, ChevronLeft, ChevronRight, Download, FileText, Globe, Hash, Linkedin, Link2, Mail, MessageSquareText, Pencil, Plus, Sparkles, Trash2, X, Youtube } from 'lucide-react';
import { apiAddContentComment, apiCreateContent, apiDeleteContent, apiDeleteContentComment, apiDeleteContentDraft, apiGetContentDraft, apiListContent, apiUpdateContent, apiUpdateContentComment, apiUploadContentFile, ContentAsset, ContentComment, ContentDraftMode, ContentDraftRecord, ContentItem, ContentType } from '../services/contentApi';
import { apiListUsers } from '../communication/api';
import ContentCard from '../components/content/ContentCard';
import ContentMainPanels from '../components/content/ContentMainPanels';
import MomentsList from '../components/content/MomentsList';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Toast from '../components/ui/Toast';
import {
  CalendarDayCounters,
  CONTENT_VIEW_DRAFTS_KEY,
  CONTENT_CREATE_DRAFT_STORAGE_PREFIX,
  ContentTab,
  FormattedContentBody,
  formatUsDateTime,
  getInitialTab,
  getLoggedInUser,
  hasServerDraftContent,
  isAdminRole,
  isContentType,
  isImageAsset,
  LINK_STORAGE_KEY,
  readContentViewDrafts,
  readStringList,
  ScheduleDatePicker,
  scrollContainerToTop,
  TAB_META,
  TAG_STORAGE_KEY,
  toDateKey,
  triggerAssetDownload,
  TYPE_ACCENT,
  TYPE_ICON_META,
  TYPE_LABEL,
  WEEK_DAYS,
  WEEK_DAY_HEADER_CLASS,
  autoResizeTextarea,
  findScrollContainer,
  nameInitials,
} from './contentViewShared';

const ContentView: React.FC = () => {
  const MOMENT_DRAFT_STORAGE_KEY = 'rapidgrow-content-moment-draft-v1';
  type ScheduleDraftRecord = { fromDate: string; toDate: string; topic: string; text: string };
  const navigate = useNavigate();
  const location = useLocation();
  const { dayKey, typeKey, itemKey } = useParams();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inlineEditTitleRef = useRef<HTMLTextAreaElement | null>(null);
  const inlineEditDescriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const skipNextAutoInlineEditRef = useRef(false);
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
  const [momentFromDate, setMomentFromDate] = useState<string>(toDateKey(new Date()));
  const [momentToDate, setMomentToDate] = useState<string>(toDateKey(new Date()));
  const [momentTopic, setMomentTopic] = useState('');
  const [momentText, setMomentText] = useState('');
  const [editingMomentId, setEditingMomentId] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleAutosaveStatus, setScheduleAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraftRecord | null>(null);
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
    if (!(isItemDetailPage && editingItem)) return;
    const timer = window.setTimeout(() => {
      if (inlineEditTitleRef.current) autoResizeTextarea(inlineEditTitleRef.current);
      if (inlineEditDescriptionRef.current) autoResizeTextarea(inlineEditDescriptionRef.current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editingItem?.contentId, isItemDetailPage]);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MOMENT_DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const fromDate = String(parsed.fromDate || parsed.date || '').trim();
      const toDate = String(parsed.toDate || '').trim();
      const topic = String(parsed.topic || '');
      const text = String(parsed.text || '');
      if (fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)) setMomentFromDate(fromDate);
      if (toDate && /^\d{4}-\d{2}-\d{2}$/.test(toDate)) setMomentToDate(toDate);
      if (topic) setMomentTopic(topic);
      if (text) setMomentText(text);
      if (fromDate || toDate || topic || text) {
        setScheduleDraft({ fromDate, toDate, topic, text });
        setScheduleAutosaveStatus('saved');
      }
    } catch {
      setScheduleAutosaveStatus('error');
    }
  }, []);

  useEffect(() => {
    const payload = {
      fromDate: momentFromDate,
      toDate: momentToDate,
      topic: momentTopic,
      text: momentText,
    };
    // Treat schedule draft as meaningful only when user entered topic/text.
    // Date is always prefilled, so it should not create an "untitled" draft by itself.
    const hasDraft = Boolean(momentTopic.trim() || momentText.trim());
    const timer = window.setTimeout(() => {
      if (!hasDraft) {
        localStorage.removeItem(MOMENT_DRAFT_STORAGE_KEY);
        setScheduleDraft(null);
        setScheduleAutosaveStatus('idle');
        return;
      }
      try {
        setScheduleAutosaveStatus('saving');
        localStorage.setItem(MOMENT_DRAFT_STORAGE_KEY, JSON.stringify(payload));
        setScheduleDraft(payload);
        setScheduleAutosaveStatus('saved');
      } catch {
        setScheduleAutosaveStatus('error');
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [MOMENT_DRAFT_STORAGE_KEY, momentFromDate, momentToDate, momentText, momentTopic]);

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
  const scheduleItems = useMemo(
    () =>
      items
        .filter((item) => String(item.channelKey || '').toLowerCase() === 'content-schedule')
        .slice()
        .sort((a, b) => {
          const aKey = `${a.contentDate || a.createdAt?.slice(0, 10) || ''}${a.createdAt || ''}`;
          const bKey = `${b.contentDate || b.createdAt?.slice(0, 10) || ''}${b.createdAt || ''}`;
          return bKey.localeCompare(aKey);
        }),
    [items]
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
  const selectedScheduleItemId = useMemo(
    () => String(new URLSearchParams(location.search).get('scheduleItem') || '').trim(),
    [location.search]
  );
  const selectedScheduleItem = useMemo(
    () => (selectedScheduleItemId ? scheduleItems.find((item) => item.contentId === selectedScheduleItemId) || null : null),
    [selectedScheduleItemId, scheduleItems]
  );
  const isScheduleItemDetail = activeTab === 'content-schedule' && !!selectedScheduleItemId;
  const isReminderTypeDetail = (activeTab === 'follow-ee' || activeTab === 'follow-ega') && !!selectedReminderType;
  const isReminderItemDetail = isReminderTypeDetail && !!selectedReminderItemId;
  const isReminderTab = activeTab === 'follow-ee' || activeTab === 'follow-ega';
  const isInlineDetailPage = isItemDetailPage || isReminderItemDetail || isScheduleItemDetail;
  const inlineDetailItem = isItemDetailPage
    ? selectedItem
    : isReminderItemDetail
    ? selectedReminderItem
    : isScheduleItemDetail
    ? selectedScheduleItem
    : null;
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
    if (tab === 'follow-ee' || tab === 'follow-ega' || tab === 'auto-add' || tab === 'content-schedule') {
      navigate(`/content?tab=${encodeURIComponent(tab)}`);
    }
  };

  const resetMomentForm = () => {
    const today = toDateKey(new Date());
    setMomentFromDate(today);
    setMomentToDate(today);
    setMomentTopic('');
    setMomentText('');
    setEditingMomentId(null);
  };

  const buildScheduleDescription = (fromDate: string, toDate: string, rawText: string) => {
    const details = String(rawText || '');
    return `From: ${fromDate}\nTo: ${toDate}\n\n${details}`;
  };

  const handleMomentSave = async () => {
    const fromDate = momentFromDate.trim();
    const toDate = momentToDate.trim();
    const topic = momentTopic;
    const text = momentText;
    if (!fromDate || !toDate || !String(text || '').trim()) {
      setToast({ message: 'From date, to date and moment are required.', type: 'error' });
      return;
    }
    if (fromDate > toDate) {
      setToast({ message: 'From date must be before or equal to to date.', type: 'error' });
      return;
    }
    const descriptionWithRange = buildScheduleDescription(fromDate, toDate, text);
    setSubmitting(true);
    try {
      if (editingMomentId) {
        const updated = await apiUpdateContent(editingMomentId, {
          title: String(topic || '').trim() ? topic : 'Schedule',
          description: descriptionWithRange,
          type: 'general',
          contentDate: fromDate,
          channelKey: 'content-schedule',
        });
        setItems((prev) => prev.map((entry) => (entry.contentId === editingMomentId ? updated.item : entry)));
        setToast({ message: 'Schedule updated successfully.', type: 'success' });
      } else {
        const created = await apiCreateContent({
          title: String(topic || '').trim() ? topic : 'Schedule',
          description: descriptionWithRange,
          type: 'general',
          contentDate: fromDate,
          channelKey: 'content-schedule',
          coverImage: null,
          attachments: [],
        });
        setItems((prev) => [created.item, ...prev]);
        setToast({ message: 'Schedule added successfully.', type: 'success' });
      }
      resetMomentForm();
      localStorage.removeItem(MOMENT_DRAFT_STORAGE_KEY);
      setScheduleDraft(null);
      setScheduleAutosaveStatus('idle');
      setShowScheduleForm(false);
      navigate('/content?tab=content-schedule', { replace: true });
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to save schedule', type: 'error' });
    } finally {
      setSubmitting(false);
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

  const openEdit = (item: ContentItem, options?: { inline?: boolean }) => {
    setEditingItem(item);
    setTitle(item.title || '');
    setDescription(item.description || '');
    setType(item.type);
    setContentDate(item.contentDate || item.createdAt.slice(0, 10));
    setAttachments(Array.isArray(item.attachments) ? item.attachments : []);
    setShowModal(!options?.inline);
  };

  useEffect(() => {
    if (!isInlineDetailPage || !inlineDetailItem) return;
    if (skipNextAutoInlineEditRef.current) {
      skipNextAutoInlineEditRef.current = false;
      return;
    }
    const editMode = String(new URLSearchParams(location.search).get('edit') || '').trim().toLowerCase();
    const shouldAutoOpenInlineEdit = editMode === '1' || editMode === 'true' || editMode === 'yes';
    if (!shouldAutoOpenInlineEdit) return;
    if (editingItem?.contentId === inlineDetailItem.contentId) return;
    openEdit(inlineDetailItem, { inline: true });
  }, [editingItem?.contentId, inlineDetailItem, isInlineDetailPage, location.search]);

  const clearInlineEditQueryParam = () => {
    const params = new URLSearchParams(location.search);
    if (!params.has('edit')) return;
    params.delete('edit');
    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true }
    );
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

  const handleInlineSave = async (item: ContentItem) => {
    if (!title.trim()) return setError('Title is required');
    if (!contentDate) return setError('Date is required');
    setSubmitting(true);
    setError(null);
    try {
      const updated = await apiUpdateContent(item.contentId, {
        title: title.trim(),
        description,
        type,
        contentDate,
        attachments,
      });
      setItems((prev) => prev.map((entry) => (entry.contentId === item.contentId ? updated.item : entry)));
      skipNextAutoInlineEditRef.current = true;
      setEditingItem(null);
      clearInlineEditQueryParam();
      setToast({ message: 'Content updated successfully.', type: 'success' });
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
    return (
      <ContentCard
        item={item}
        options={options}
        ctx={{
          highlightedItemId,
          selectedDate,
          activeTab,
          isReminderTab,
          reminderCategoryLabel,
          openCommentsForContentId,
          isInlineDetailPage,
          editingItem,
          navigate,
          inlineEditTitleRef,
          title,
          setTitle,
          userAvatarByEmpId,
          description,
          setDescription,
          inlineEditDescriptionRef,
          setOpenCommentsForContentId,
          handleInlineSave,
          submitting,
          skipNextAutoInlineEditRef,
          setEditingItem,
          clearInlineEditQueryParam,
          isTypeDetailPage,
          isItemDetailPage,
          isReminderTypeDetail,
          isReminderItemDetail,
          location,
          selectedReminderType,
          openEdit,
          setDeleteTarget,
          editingCommentByContentId,
          currentUser,
          editingDraftByCommentId,
          commentBusyKey,
          replyingToCommentByContentId,
          replyDraftByCommentId,
          setEditingCommentByContentId,
          setEditingDraftByCommentId,
          setCommentDeleteModal,
          setReplyingToCommentByContentId,
          setReplyDraftByCommentId,
          handleUpdateComment,
          handleAddReply,
          commentDraftByContentId,
          setCommentDraftByContentId,
          handleAddComment,
          getPreviewLineClamp,
          TYPE_ICON_META,
        }}
      />
    );
  };

  return (
    <div ref={rootRef} className="relative -mx-8 -mt-14 w-auto space-y-4 pb-4 lg:-mx-10 lg:-mt-16 xl:-mx-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 rounded-[2.25rem] bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(239,68,68,0.08),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(248,250,252,0.65))]" />
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      <div className="w-full max-w-full rounded-[1.65rem] border border-white/70 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <div className="p-0">
          <div className="grid w-full grid-cols-1 gap-2 lg:grid-cols-5 lg:gap-2.5">
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
      {(
        (['calendar', 'follow-ee', 'follow-ega'] as ContentDraftMode[]).some((mode) => hasServerDraftContent(savedDrafts[mode] || null))
        || !!scheduleDraft
      ) && (
        <div className="w-full max-w-full rounded-[1.6rem] border border-violet-100 bg-white px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700">Saved drafts</h3>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-medium text-violet-700">
              Resume unsaved content
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
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
            {scheduleDraft ? (
              <div className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50/40">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(MOMENT_DRAFT_STORAGE_KEY);
                    setMomentTopic('');
                    setMomentText('');
                    setEditingMomentId(null);
                    setScheduleDraft(null);
                    setScheduleAutosaveStatus('idle');
                  }}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                  title="Delete draft"
                  aria-label="Delete draft"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('content-schedule');
                    const defaultDate = toDateKey(new Date());
                    setMomentFromDate(scheduleDraft.fromDate || defaultDate);
                    setMomentToDate(scheduleDraft.toDate || scheduleDraft.fromDate || defaultDate);
                    setMomentTopic(scheduleDraft.topic || '');
                    setMomentText(scheduleDraft.text || '');
                    setShowScheduleForm(true);
                    navigate('/content?tab=content-schedule');
                  }}
                  className="block w-full pr-8 text-left"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Content Schedule</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">{scheduleDraft.topic || 'Untitled schedule draft'}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {scheduleDraft.text || 'No description yet'}
                  </p>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <ContentMainPanels
        ctx={{
          activeTab,
          isDayPage,
          monthCursor,
          monthContentCount,
          openCreatePage,
          setMonthCursor,
          WEEK_DAYS,
          WEEK_DAY_HEADER_CLASS,
          monthDays,
          toDateKey,
          countsByDate,
          selectedDate,
          todayKey,
          navigate,
          CalendarDayCounters,
          hasServerDraftContent,
          savedDrafts,
          deletingDraftMode,
          setDeletingDraftMode,
          apiDeleteContentDraft,
          CONTENT_CREATE_DRAFT_STORAGE_PREFIX,
          setSavedDrafts,
          setToast,
          TYPE_LABEL,
          TYPE_ICON_META,
          selectedType,
          selectedTypeItems,
          selectedDayItems,
          selectedDayGroups,
          isTypeDetailPage,
          isItemDetailPage,
          selectedItem,
          loading,
          TYPE_ACCENT,
          renderContentCard,
          linkOptions,
          tagOptions,
          newLinkValue,
          setNewLinkValue,
          addAutoLink,
          removeAutoLink,
          newTagValue,
          setNewTagValue,
          addAutoTag,
          removeAutoTag,
          momentFromDate,
          setMomentFromDate,
          momentToDate,
          setMomentToDate,
          momentTopic,
          setMomentTopic,
          momentText,
          setMomentText,
          showScheduleForm,
          setShowScheduleForm,
          scheduleAutosaveStatus,
          autoResizeTextarea,
          handleMomentSave,
          editingMomentId,
          resetMomentForm,
          scheduleItems,
          isReminderTypeDetail,
          isReminderItemDetail,
          selectedReminderType,
          reminderCategoryLabel,
          selectedReminderItem,
          selectedReminderTypeItems,
          activeReminderItems,
          selectedScheduleItemId,
          selectedScheduleItem,
          isScheduleItemDetail,
          ScheduleDatePicker,
        }}
      />

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
        <ConfirmDialog
          title="Delete content?"
          description="This action removes the selected content item from the calendar and reminder views."
          confirmLabel="Delete"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await handleDelete(deleteTarget.contentId);
            setDeleteTarget(null);
          }}
        />
      )}
      {commentDeleteModal && (
        <ConfirmDialog
          title="Delete comment?"
          description="Do you want to delete this comment?"
          confirmLabel={commentBusyKey === `delete-${commentDeleteModal.commentId}` ? 'Processing...' : 'Yes'}
          cancelLabel="No"
          disabled={!!commentBusyKey}
          cancelClassName="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          confirmClassName="rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_18px_30px_rgba(225,29,72,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
          onCancel={() => setCommentDeleteModal(null)}
          onConfirm={() => handleDeleteComment(commentDeleteModal.contentId, commentDeleteModal.commentId)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default ContentView;
