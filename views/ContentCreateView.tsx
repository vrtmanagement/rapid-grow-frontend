import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Bold, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Copy, FileText, Globe, Hash, Italic, Link2, Linkedin, Mail, Sparkles, Underline, X } from 'lucide-react';
import { apiCreateContent, apiDeleteContentDraft, apiGetContent, apiGetContentDraft, apiUpdateContent, apiUploadContentFile, apiUpsertContentDraft, ContentAsset, ContentDraftMode, ContentType } from '../services/contentApi';
import Toast from '../components/ui/Toast';
import { FileDropZone } from '../components/ui/FileDropZone';
import { prepareClipboardPasteForDescription } from '../utils/clipboardPaste';
import { takeContentDropFiles } from '../utils/pendingContentDropFiles';
import { toFileArray } from '../utils/fileTransfer';
import ContentCreateForm from '../components/content/ContentCreateForm';
import {
  CONTENT_TYPE_OPTIONS,
  LINK_STORAGE_KEY,
  TAG_STORAGE_KEY,
  CONTENT_CREATE_DRAFT_STORAGE_PREFIX,
  getInitialDate,
  getMode,
  getEditContentId,
  readStringList,
  extractStyledTokens,
  validateTitle,
  validateDescription,
  validateContentDate,
  validateLinkValue,
  validateTagValue,
  parseDateValue,
  formatDateDisplay,
  formatMonthLabel,
  hasNonEmptyDraft,
  getCalendarDays,
  descriptionToEditorHtml,
  editorHtmlToDescription,
  getEditorSelectionToolbarPosition,
  type FieldErrors,
} from '../components/content/contentCreateHelpers';

const ContentCreateView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = getMode(location.search);
  const editContentId = getEditContentId(location.search);
  const isEditMode = !!editContentId;
  const isFollowMode = mode === 'follow-ee' || mode === 'follow-ega';
  const isBlogMode = mode === 'blog';
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
  const descriptionEditorRef = useRef<HTMLDivElement | null>(null);
  const lastEditorDescriptionRef = useRef('');
  const selectionToolbarRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [loadingEditItem, setLoadingEditItem] = useState(false);
  const [selectionToolbar, setSelectionToolbar] = useState<{
    open: boolean;
    left: number;
    top: number;
    placement: 'top' | 'bottom';
    text: string;
    copied: boolean;
  }>({
    open: false,
    left: 0,
    top: 0,
    placement: 'top',
    text: '',
    copied: false,
  });
  const latestDraftSaveRef = useRef(0);
  const draftStorageKey = `${CONTENT_CREATE_DRAFT_STORAGE_PREFIX}:${mode}`;
  const draftMode = mode as ContentDraftMode;

  const donePath = useMemo(() => {
    if (isBlogMode) return '/content?tab=blog';
    if (isFollowMode) return `/content?tab=${mode}`;
    return `/content/day/${contentDate}`;
  }, [contentDate, isBlogMode, isFollowMode, mode]);
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
    const editor = descriptionEditorRef.current;
    if (editor) {
      editor.innerHTML = descriptionToEditorHtml(next);
    }
    lastEditorDescriptionRef.current = next;
    setDescription(next);
    setFieldErrors((prev) => ({ ...prev, description: undefined }));
  };

  const hideSelectionToolbar = useCallback(() => {
    setSelectionToolbar((prev) => (prev.open ? { ...prev, open: false, copied: false } : prev));
  }, []);

  const updateSelectionToolbar = useCallback(() => {
    const editor = descriptionEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    if (
      selection.isCollapsed ||
      !selectedText.trim() ||
      !editor.contains(range.commonAncestorContainer)
    ) {
      hideSelectionToolbar();
      return;
    }

    const position = getEditorSelectionToolbarPosition();
    if (!position) {
      hideSelectionToolbar();
      return;
    }

    setSelectionToolbar({
      open: true,
      left: position.left,
      top: position.top,
      placement: position.placement,
      text: selectedText,
      copied: false,
    });
  }, [hideSelectionToolbar]);

  const syncDescriptionFromEditor = useCallback(() => {
    const editor = descriptionEditorRef.current;
    if (!editor) return '';
    const nextDescription = editorHtmlToDescription(editor.innerHTML);
    lastEditorDescriptionRef.current = nextDescription;
    setDescription(nextDescription);
    setFieldErrors((prev) => ({ ...prev, description: undefined }));
    return nextDescription;
  }, []);

  const applyInlineFormat = useCallback((command: 'bold' | 'italic' | 'underline') => {
    const editor = descriptionEditorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false);
    syncDescriptionFromEditor();
    window.requestAnimationFrame(() => {
      updateSelectionToolbar();
    });
  }, [syncDescriptionFromEditor, updateSelectionToolbar]);

  const handleCopySelection = useCallback(async () => {
    if (!selectionToolbar.text.trim()) return;
    try {
      const selection = window.getSelection();
      const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      const htmlContainer = document.createElement('div');

      if (range) {
        htmlContainer.appendChild(range.cloneContents());
      }

      const html = htmlContainer.innerHTML.trim();
      if (html && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([selectionToolbar.text], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(selectionToolbar.text);
      }

      setSelectionToolbar((prev) => ({ ...prev, copied: true }));
      window.setTimeout(() => {
        setSelectionToolbar((prev) => ({ ...prev, copied: false }));
      }, 1200);
    } catch {
      setToast({ message: 'Could not copy the selected text.', type: 'error' });
    }
  }, [selectionToolbar.text]);

  const handleDescriptionInput = useCallback(() => {
    syncDescriptionFromEditor();
  }, [syncDescriptionFromEditor]);

  const handleAttachmentUpload = async (files: FileList | File[] | null) => {
    const fileList = toFileArray(files);
    if (!fileList.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploads = await Promise.all(fileList.map((file) => apiUploadContentFile(file)));
      setAttachments((prev) => [...prev, ...uploads]);
      setToast({ message: 'Files uploaded successfully.', type: 'success' });
    } catch (err: any) {
      setError(err.message || 'Failed to upload attachment');
      setToast({ message: err.message || 'Failed to upload attachment', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!draftHydrated) return;
    const pending = takeContentDropFiles();
    if (pending.length) void handleAttachmentUpload(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftHydrated]);

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
      if (isEditMode && editContentId) {
        await apiUpdateContent(editContentId, {
          title: title.trim(),
          description,
          type: isFollowMode ? 'newsletter' : isBlogMode ? 'website' : type,
          contentDate,
          channelKey: isFollowMode ? mode : isBlogMode ? 'blog' : type,
          attachments,
        });
      } else {
        await apiCreateContent({
          title: title.trim(),
          description,
          type: isFollowMode ? 'newsletter' : isBlogMode ? 'website' : type,
          contentDate,
          channelKey: isFollowMode ? mode : isBlogMode ? 'blog' : type,
          coverImage: null,
          attachments,
        });
      }
      localStorage.removeItem(draftStorageKey);
      try {
        await apiDeleteContentDraft(draftMode);
      } catch {
        // Ignore draft cleanup errors after successful final save.
      }
      navigate(donePath, {
        state: {
          contentToast: {
            message: isEditMode
              ? (isFollowMode ? 'Reminder updated successfully.' : 'Content updated successfully.')
              : (isFollowMode ? 'Reminder saved successfully.' : 'Content saved successfully.'),
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
    if (!isEditMode || !editContentId) return;
    let active = true;
    setLoadingEditItem(true);
    setError(null);
    async function hydrateEditItem() {
      try {
        const response = await apiGetContent(editContentId);
        if (!active || !response?.item) return;
        const item = response.item;
        setTitle(String(item.title || ''));
        setDescription(String(item.description || ''));
        setType(item.type);
        setContentDate(String(item.contentDate || '').trim() || new Date().toISOString().slice(0, 10));
        setAttachments(Array.isArray(item.attachments) ? item.attachments : []);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Failed to load content for editing');
        setToast({ message: err?.message || 'Failed to load content for editing', type: 'error' });
      } finally {
        if (active) {
          setLoadingEditItem(false);
          setDraftHydrated(true);
          setAutosaveStatus('idle');
        }
      }
    }
    hydrateEditItem();
    return () => {
      active = false;
    };
  }, [editContentId, isEditMode]);

  useEffect(() => {
    if (isEditMode) return;
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
  }, [draftMode, draftStorageKey, isEditMode]);

  useEffect(() => {
    if (isEditMode || !draftHydrated || submitting) return;
    const payload = { title, description, type, contentDate, attachments };
    const timer = window.setTimeout(() => {
      localStorage.setItem(draftStorageKey, JSON.stringify(payload));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [attachments, contentDate, description, draftHydrated, draftStorageKey, isEditMode, submitting, title, type]);

  useEffect(() => {
    if (isEditMode || !draftHydrated || submitting) return;
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
  }, [attachments, contentDate, description, draftHydrated, draftMode, isEditMode, submitting, title, type]);

  useEffect(() => {
    const editor = descriptionEditorRef.current;
    if (!editor) return;
    if (lastEditorDescriptionRef.current === description) return;
    if (document.activeElement === editor) return;
    editor.innerHTML = descriptionToEditorHtml(description);
    lastEditorDescriptionRef.current = description;
  }, [description]);

  useEffect(() => {
    const handleViewportChange = () => hideSelectionToolbar();
    if (!selectionToolbar.open) return undefined;
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [hideSelectionToolbar, selectionToolbar.open]);

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
      if (
        selectionToolbar.open &&
        descriptionEditorRef.current &&
        !descriptionEditorRef.current.contains(target) &&
        selectionToolbarRef.current &&
        !selectionToolbarRef.current.contains(target)
      ) {
        hideSelectionToolbar();
      }
    };

    if (showLinkPicker || showTagPicker || showTypePicker || showDatePicker || selectionToolbar.open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [hideSelectionToolbar, selectionToolbar.open, showDatePicker, showLinkPicker, showTagPicker, showTypePicker]);

  const panelClass = 'rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-4';
  const inputBaseClass = 'w-full rounded-[0.95rem] border bg-slate-50/70 px-3.5 py-2.5 text-[15px] text-slate-700 outline-none transition';
  const pickerButtonClass = 'flex w-full items-center justify-between rounded-[0.95rem] border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left transition hover:border-violet-200 hover:bg-white';
  const autosaveMessage = isEditMode
    ? (loadingEditItem ? 'Loading content...' : 'Editing existing content')
    : autosaveStatus === 'saving'
      ? 'Auto-saving draft...'
      : autosaveStatus === 'saved'
        ? 'Draft auto-saved'
        : autosaveStatus === 'error'
          ? 'Draft save failed, retrying on next change'
          : 'Draft auto-save is on';
  const autosaveToneClass = isEditMode
    ? 'border-slate-200 bg-slate-50 text-slate-600'
    : autosaveStatus === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : autosaveStatus === 'saved'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : autosaveStatus === 'saving'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-violet-200 bg-violet-50 text-violet-700';


  return (
    <ContentCreateForm
      ctx={{
        addAutoLink,
        addAutoTag,
        appendToDescription,
        applyInlineFormat,
        attachments,
        autosaveMessage,
        autosaveToneClass,
        calendarDays,
        calendarMonth,
        contentDate,
        datePickerWrapRef,
        description,
        descriptionEditorRef,
        donePath,
        fieldErrors,
        handleAttachmentUpload,
        handleCopySelection,
        handleDescriptionInput,
        handleSave,
        hideSelectionToolbar,
        inputBaseClass,
        isBlogMode,
        isEditMode,
        isFollowMode,
        linkOptions,
        linkPickerWrapRef,
        newLinkValue,
        newTagValue,
        pickerButtonClass,
        removeAttachment,
        removeAutoLink,
        removeAutoTag,
        selectedTypeOption,
        selectionToolbar,
        selectionToolbarRef,
        setCalendarMonth,
        setContentDate,
        setFieldErrors,
        setNewLinkValue,
        setNewTagValue,
        setShowAutoAddedManager,
        setShowDatePicker,
        setShowLinkPicker,
        setShowTagPicker,
        setShowTypePicker,
        setTitle,
        setType,
        showAutoAddedManager,
        showDatePicker,
        showLinkPicker,
        showTagPicker,
        showTypePicker,
        styledTokens,
        submitting,
        syncDescriptionFromEditor,
        tagOptions,
        tagPickerWrapRef,
        title,
        toast,
        type,
        typePickerWrapRef,
        updateSelectionToolbar,
        uploading,
      }}
    />
  );
};

export default ContentCreateView;
