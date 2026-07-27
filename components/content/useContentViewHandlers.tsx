import React, { useEffect } from 'react';
import {
  apiAddContentComment,
  apiCreateContent,
  apiDeleteContent,
  apiDeleteContentComment,
  apiUpdateContent,
  apiUpdateContentComment,
  apiUploadContentFile,
  ContentAsset,
  ContentComment,
  ContentDraftMode,
  ContentDraftRecord,
  ContentItem,
  ContentType,
} from '../../services/contentApi';
import {
  ContentTab,
  LINK_STORAGE_KEY,
  TAG_STORAGE_KEY,
  toDateKey,
  TYPE_ACCENT,
  TYPE_ICON_META,
  TYPE_LABEL,
  autoResizeTextarea,
} from '../../views/contentViewShared';
import ContentCard from './ContentCard';
import { toFileArray } from '../../utils/fileTransfer';

export function useContentViewHandlers(args: Record<string, any>) {
  const {
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
  } = args;

  const openCreatePage = (day?: string) => {
    const date = day || selectedDate || toDateKey(new Date());
    const mode = activeTab === 'follow-ee'
      ? 'follow-ee'
      : activeTab === 'follow-ega'
      ? 'follow-ega'
      : activeTab === 'blog'
      ? 'blog'
      : 'calendar';
    navigate(`/content/new?date=${encodeURIComponent(date)}&mode=${encodeURIComponent(mode)}`);
  };

  const handleTabChange = (tab: ContentTab) => {
    setActiveTab(tab);
    if (tab === 'calendar') {
      navigate('/content');
      return;
    }
    if (tab === 'follow-ee' || tab === 'follow-ega' || tab === 'auto-add' || tab === 'content-schedule' || tab === 'blog') {
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
    scheduleEditBaselineRef.current = null;
  };

  const buildScheduleDescription = (fromDate: string, toDate: string, rawText: string) => {
    const details = String(rawText || '');
    return `From: ${fromDate}\nTo: ${toDate}\n\n${details}`;
  };

  const parseScheduleDescription = (rawDescription: string, fallbackDate: string) => {
    const description = String(rawDescription || '');
    const pattern = /^From:\s*(\d{4}-\d{2}-\d{2})\s*\nTo:\s*(\d{4}-\d{2}-\d{2})\s*\n?([\s\S]*)$/i;
    const match = description.match(pattern);
    if (!match) {
      return {
        fromDate: fallbackDate,
        toDate: fallbackDate,
        text: description,
      };
    }
    const [, fromDate, toDate, trailingText] = match;
    const text = String(trailingText || '').replace(/^\n+/, '');
    return {
      fromDate: fromDate || fallbackDate,
      toDate: toDate || fromDate || fallbackDate,
      text,
    };
  };

  const openScheduleEditForm = (item: ContentItem) => {
    const fallbackDate = String(item.contentDate || item.createdAt?.slice(0, 10) || toDateKey(new Date()));
    const parsed = parseScheduleDescription(String(item.description || ''), fallbackDate);
    scheduleEditBaselineRef.current = {
      fromDate: parsed.fromDate,
      toDate: parsed.toDate,
      topic: String(item.title || ''),
      text: parsed.text,
    };
    setScheduleAutosaveStatus('idle');
    setShowScheduleForm(true);
    setEditingMomentId(item.contentId);
    setMomentFromDate(parsed.fromDate);
    setMomentToDate(parsed.toDate);
    setMomentTopic(String(item.title || ''));
    setMomentText(parsed.text);
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
    const editMode = String(new URLSearchParams(location.search).get('edit') || '').trim().toLowerCase();
    const shouldAutoOpenInlineEdit = editMode === '1' || editMode === 'true' || editMode === 'yes';
    if (skipNextAutoInlineEditRef.current) {
      // Do not block explicit edit URLs; only skip implicit auto-open.
      if (!shouldAutoOpenInlineEdit) {
        skipNextAutoInlineEditRef.current = false;
        return;
      }
      skipNextAutoInlineEditRef.current = false;
    }
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

  const handleAttachmentUpload = async (files: FileList | File[] | null) => {
    const fileList = toFileArray(files);
    if (!fileList.length) return;
    setUploadingAttachment(true);
    setError(null);
    try {
      const uploads = await Promise.all(fileList.map((file) => apiUploadContentFile(file)));
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
    let lines = activeTab === 'content-schedule' ? 10 : 7;
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
          openScheduleEditForm,
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


  return {
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
  };
}
