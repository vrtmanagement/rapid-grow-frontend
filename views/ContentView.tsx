import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BellRing, Bot, Calendar, CalendarDays, Check, ChevronLeft, ChevronRight, Download, FileText, Globe, Hash, Linkedin, Link2, Mail, MessageSquareText, Pencil, Plus, Sparkles, Trash2, X, Youtube } from 'lucide-react';
import { API_BASE } from '../config/api';
import { invalidateApiCache, peekApiCache } from '../services/apiCache';
import { apiAddContentComment, apiCreateContent, apiDeleteContent, apiDeleteContentComment, apiDeleteContentDraft, apiGetContentDraft, apiListContent, apiUpdateContent, apiUpdateContentComment, apiUploadContentFile, ContentAsset, ContentComment, ContentDraftMode, ContentDraftRecord, ContentItem, ContentType } from '../services/contentApi';
import { apiListUsers } from '../communication/api';
import ContentCard from '../components/content/ContentCard';
import ContentMainPanels from '../components/content/ContentMainPanels';
import MomentsList from '../components/content/MomentsList';
import SavedDraftsPanel from '../components/content/SavedDraftsPanel';
import ContentViewModals from '../components/content/ContentViewModals';
import { useContentViewHandlers } from '../components/content/useContentViewHandlers';
import ContentViewLayout from '../components/content/ContentViewLayout';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { FileDropZone } from '../components/ui/FileDropZone';
import Toast from '../components/ui/Toast';
import { queueContentDropFiles } from '../utils/pendingContentDropFiles';
import { toFileArray } from '../utils/fileTransfer';
import { PROFILE_AVATAR_UPDATED_EVENT, resolveAvatarUrl } from '../utils/avatar';
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
  const modalDescriptionRef = useRef<HTMLTextAreaElement | null>(null);
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
  const scheduleEditBaselineRef = useRef<ScheduleDraftRecord | null>(null);
  const currentUser = useMemo(() => getLoggedInUser(), []);

  async function refresh(force = false) {
    const hasCache = !force && !!peekApiCache(`${API_BASE}/content`);
    if (!hasCache) setLoading(true);
    setError(null);
    try {
      if (force) invalidateApiCache('/content');
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
    const readLocalCreateDraft = (mode: ContentDraftMode): ContentDraftRecord | null => {
      try {
        const raw = localStorage.getItem(`${CONTENT_CREATE_DRAFT_STORAGE_PREFIX}:${mode}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return {
          mode,
          title: String(parsed.title || ''),
          description: String(parsed.description || ''),
          type: isContentType(String(parsed.type || '')) ? parsed.type : 'general',
          contentDate: String(parsed.contentDate || ''),
          attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
        };
      } catch {
        return null;
      }
    };
    async function loadDrafts() {
      const modes: ContentDraftMode[] = ['calendar', 'follow-ee', 'follow-ega', 'blog'];
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
          next[mode] = draft || readLocalCreateDraft(mode);
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
          const avatar = resolveAvatarUrl(user.avatar);
          if (avatar) {
            next[empId] = avatar;
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
    const handleProfileAvatarUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ avatar?: string; empId?: string }>).detail || {};
      const empId = String(detail.empId || '').trim();
      const avatar = resolveAvatarUrl(detail.avatar);
      if (!empId || !avatar) return;
      setUserAvatarByEmpId((prev) => ({ ...prev, [empId]: avatar }));
    };

    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated as EventListener);
    return () => {
      window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!editingItem) return;
    const timer = window.setTimeout(() => {
      if (inlineEditTitleRef.current) autoResizeTextarea(inlineEditTitleRef.current);
      if (inlineEditDescriptionRef.current) autoResizeTextarea(inlineEditDescriptionRef.current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editingItem?.contentId, location.search]);

  useEffect(() => {
    if (!showModal || !modalDescriptionRef.current) return;
    const timer = window.setTimeout(() => {
      if (modalDescriptionRef.current) autoResizeTextarea(modalDescriptionRef.current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [showModal, description]);

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
    if (!showScheduleForm) return;
    const payload = {
      fromDate: momentFromDate,
      toDate: momentToDate,
      topic: momentTopic,
      text: momentText,
    };
    // Treat schedule draft as meaningful only when user entered topic/text.
    // Date is always prefilled, so it should not create an "untitled" draft by itself.
    const hasDraft = Boolean(momentTopic.trim() || momentText.trim());
    const baseline = scheduleEditBaselineRef.current;
    const isUnchangedFromBaseline = Boolean(
      baseline
      && baseline.fromDate === payload.fromDate
      && baseline.toDate === payload.toDate
      && baseline.topic === payload.topic
      && baseline.text === payload.text
    );
    const timer = window.setTimeout(() => {
      if (!hasDraft) {
        localStorage.removeItem(MOMENT_DRAFT_STORAGE_KEY);
        setScheduleDraft(null);
        setScheduleAutosaveStatus('idle');
        return;
      }
      if (isUnchangedFromBaseline) {
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
  }, [MOMENT_DRAFT_STORAGE_KEY, momentFromDate, momentToDate, momentText, momentTopic, showScheduleForm]);

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
  const blogItems = useMemo(
    () =>
      items
        .filter((item) => String(item.channelKey || '').toLowerCase() === 'blog')
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
  const selectedBlogItemId = useMemo(
    () => String(new URLSearchParams(location.search).get('blogItem') || '').trim(),
    [location.search]
  );
  const selectedBlogItem = useMemo(
    () => (selectedBlogItemId ? blogItems.find((item) => item.contentId === selectedBlogItemId) || null : null),
    [blogItems, selectedBlogItemId]
  );
  const isScheduleItemDetail = activeTab === 'content-schedule' && !!selectedScheduleItemId;
  const isBlogItemDetail = activeTab === 'blog' && !!selectedBlogItemId;
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
    : isBlogItemDetail
    ? selectedBlogItem
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


  const {
    addAutoLink,
    addAutoTag,
    buildScheduleDescription,
    clearInlineEditQueryParam,
    getPreviewLineClamp,
    handleAddComment,
    handleAddReply,
    handleAttachmentUpload,
    handleDelete,
    handleDeleteComment,
    handleInlineSave,
    handleMomentSave,
    handleSave,
    handleTabChange,
    handleUpdateComment,
    openCreatePage,
    openEdit,
    openScheduleEditForm,
    parseScheduleDescription,
    persistAutoOptions,
    removeAutoLink,
    removeAutoTag,
    renderContentCard,
    resetMomentForm,
    updateItemComments,
  } = useContentViewHandlers({
    MOMENT_DRAFT_STORAGE_KEY,
    activeTab,
    attachments,
    commentBusyKey,
    commentDraftByContentId,
    contentDate,
    currentUser,
    description,
    editingCommentByContentId,
    editingDraftByCommentId,
    editingItem,
    editingMomentId,
    highlightedItemId,
    inlineDetailItem,
    inlineEditDescriptionRef,
    inlineEditTitleRef,
    isInlineDetailPage,
    isItemDetailPage,
    isReminderItemDetail,
    isReminderTab,
    isReminderTypeDetail,
    isTypeDetailPage,
    linkOptions,
    location,
    momentFromDate,
    momentText,
    momentToDate,
    momentTopic,
    navigate,
    newLinkValue,
    newTagValue,
    openCommentsForContentId,
    reminderCategoryLabel,
    replyDraftByCommentId,
    replyingToCommentByContentId,
    scheduleEditBaselineRef,
    selectedDate,
    selectedReminderType,
    setActiveTab,
    setAttachments,
    setCommentBusyKey,
    setCommentDeleteModal,
    setCommentDraftByContentId,
    setContentDate,
    setDeleteTarget,
    setDescription,
    setEditingCommentByContentId,
    setEditingDraftByCommentId,
    setEditingItem,
    setEditingMomentId,
    setError,
    setItems,
    setLinkOptions,
    setMomentFromDate,
    setMomentText,
    setMomentToDate,
    setMomentTopic,
    setNewLinkValue,
    setNewTagValue,
    setOpenCommentsForContentId,
    setReplyDraftByCommentId,
    setReplyingToCommentByContentId,
    setScheduleAutosaveStatus,
    setScheduleDraft,
    setSelectedDate,
    setShowModal,
    setShowScheduleForm,
    setSubmitting,
    setTagOptions,
    setTitle,
    setToast,
    setType,
    setUploadingAttachment,
    skipNextAutoInlineEditRef,
    submitting,
    tagOptions,
    title,
    type,
    userAvatarByEmpId,
  });

  return (
    <ContentViewLayout
      ctx={{
        MOMENT_DRAFT_STORAGE_KEY,
        activeReminderItems,
        activeTab,
        addAutoLink,
        addAutoTag,
        attachments,
        blogItems,
        buildScheduleDescription,
        calendarItems,
        clearInlineEditQueryParam,
        commentBusyKey,
        commentDeleteModal,
        commentDraftByContentId,
        contentDate,
        countsByDate,
        currentMonthKey,
        currentUser,
        deleteTarget,
        deletingDraftMode,
        description,
        editingCommentByContentId,
        editingDraftByCommentId,
        editingItem,
        editingMomentId,
        error,
        followEeItems,
        followEgaItems,
        fromDate: momentFromDate,
        getPreviewLineClamp,
        handleAddComment,
        handleAddReply,
        handleAttachmentUpload,
        handleDelete,
        handleDeleteComment,
        handleInlineSave,
        handleMomentSave,
        handleSave,
        handleTabChange,
        handleUpdateComment,
        highlightedItemId,
        initialDrafts,
        inlineDetailItem,
        inlineEditDescriptionRef,
        inlineEditTitleRef,
        isBlogItemDetail,
        isDayPage,
        isInlineDetailPage,
        isItemDetailPage,
        isReminderItemDetail,
        isReminderTab,
        isReminderTypeDetail,
        isScheduleItemDetail,
        isTypeDetailPage,
        items,
        linkOptions,
        loading,
        location,
        modalDescriptionRef,
        momentFromDate,
        momentText,
        momentToDate,
        momentTopic,
        monthContentCount,
        monthCursor,
        monthDays,
        navigate,
        newLinkValue,
        newTagValue,
        openCommentsForContentId,
        openCreatePage,
        openEdit,
        openScheduleEditForm,
        parseScheduleDescription,
        persistAutoOptions,
        queueContentDropFiles,
        refresh,
        reminderCategoryLabel,
        reminderGroups,
        removeAutoLink,
        removeAutoTag,
        renderContentCard,
        replyDraftByCommentId,
        replyingToCommentByContentId,
        resetMomentForm,
        rootRef,
        savedDrafts,
        scheduleAutosaveStatus,
        scheduleDraft,
        scheduleEditBaselineRef,
        scheduleItems,
        selectedBlogItem,
        selectedBlogItemId,
        selectedDate,
        selectedDayGroups,
        selectedDayItems,
        selectedItem,
        selectedReminderItem,
        selectedReminderItemId,
        selectedReminderType,
        selectedReminderTypeItems,
        selectedScheduleItem,
        selectedScheduleItemId,
        selectedType,
        selectedTypeItems,
        setActiveTab,
        setAttachments,
        setCommentBusyKey,
        setCommentDeleteModal,
        setCommentDraftByContentId,
        setContentDate,
        setDeleteTarget,
        setDeletingDraftMode,
        setDescription,
        setEditingCommentByContentId,
        setEditingDraftByCommentId,
        setEditingItem,
        setEditingMomentId,
        setError,
        setItems,
        setLinkOptions,
        setLoading,
        setMomentFromDate,
        setMomentText,
        setMomentToDate,
        setMomentTopic,
        setMonthCursor,
        setNewLinkValue,
        setNewTagValue,
        setOpenCommentsForContentId,
        setReplyDraftByCommentId,
        setReplyingToCommentByContentId,
        setSavedDrafts,
        setScheduleAutosaveStatus,
        setScheduleDraft,
        setSelectedDate,
        setShowModal,
        setShowScheduleForm,
        setSubmitting,
        setTagOptions,
        setTitle,
        setToast,
        setType,
        setUploadingAttachment,
        setUserAvatarByEmpId,
        showModal,
        showScheduleForm,
        skipNextAutoInlineEditRef,
        submitting,
        tagOptions,
        text: momentText,
        title,
        toDate: momentToDate,
        toast,
        todayKey,
        topic: momentTopic,
        type,
        updateItemComments,
        uploadingAttachment,
        userAvatarByEmpId,
      }}
    />
  );
};

export default ContentView;
