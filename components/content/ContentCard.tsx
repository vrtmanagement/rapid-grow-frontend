import React from 'react';
import { Check, Download, MessageSquareText, Pencil, Trash2, X } from 'lucide-react';
import { ContentComment, ContentItem } from '../../services/contentApi';
import { FormattedContentBody, TYPE_ACCENT, TYPE_LABEL, isAdminRole, formatUsDateTime, isImageAsset, triggerAssetDownload, autoResizeTextarea, nameInitials } from '../../views/contentViewShared';

type ContentCardProps = {
  item: ContentItem;
  options?: { clickable?: boolean; expanded?: boolean; clickHref?: string };
  ctx: any;
};

const ContentCard: React.FC<ContentCardProps> = ({ item, options, ctx }) => {
  const {
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
  } = ctx;

  const isHighlighted = item.contentId === highlightedItemId;
  const isClickable = !!options?.clickable;
  const clickHref = options?.clickHref || `/content/day/${selectedDate}/type/${item.type}/item/${item.contentId}`;
  const isExpanded = !!options?.expanded;
  const showTypeBadge = activeTab === 'calendar' || isReminderTab;
  const scheduleAccentType = activeTab === 'content-schedule' ? 'newsletter' : item.type;
  const cardTypeLabel = isReminderTab ? reminderCategoryLabel : TYPE_LABEL[item.type];
  const cardTypeBadgeClass = isReminderTab ? TYPE_ACCENT.general.badge : TYPE_ACCENT[scheduleAccentType].badge;
  const comments: ContentComment[] = Array.isArray(item.comments) ? item.comments : [];
  const commentIds = new Set(comments.map((comment) => String(comment.id || '').trim()).filter(Boolean));
  const topLevelComments = comments.filter((comment) => {
    const parentId = String(comment.parentCommentId || '').trim();
    return !parentId || !commentIds.has(parentId);
  });
  const repliesByParentId = comments.reduce<Record<string, ContentComment[]>>((acc, c) => {
    const parentId = String(c.parentCommentId || '').trim();
    if (!parentId) return acc;
    acc[parentId] = acc[parentId] || [];
    acc[parentId].push(c);
    return acc;
  }, {});
  const isCommentsOpen = openCommentsForContentId === item.contentId;
  const isInlineEditing = isExpanded && isInlineDetailPage && editingItem?.contentId === item.contentId;

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
          ? TYPE_ACCENT[scheduleAccentType].highlight
          : 'border-white/80'
      } ${isClickable ? 'cursor-pointer hover:-translate-y-[2px] hover:border-slate-200 hover:shadow-[0_26px_60px_rgba(15,23,42,0.10)]' : ''}`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${TYPE_ACCENT[scheduleAccentType].tone}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div className={`min-w-0 ${showTypeBadge ? 'space-y-3' : 'space-y-0'}`}>
          {showTypeBadge ? (
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${cardTypeBadgeClass}`}>{cardTypeLabel}</span>
          ) : null}
          {isInlineEditing ? (
            <textarea
              ref={inlineEditTitleRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onInput={(event) => autoResizeTextarea(event.currentTarget)}
              rows={1}
              placeholder="Content title"
              className="w-full resize-none overflow-hidden bg-transparent text-lg font-semibold text-slate-900 outline-none"
            />
          ) : (
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
          )}
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
      {isInlineEditing ? (
        <div className="mt-3 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-slate-50/65 p-3">
          <textarea
            ref={inlineEditDescriptionRef}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onInput={(event) => autoResizeTextarea(event.currentTarget)}
            rows={7}
            className="w-full resize-none bg-transparent text-sm leading-6 text-slate-700 outline-none"
            placeholder="No description"
          />
        </div>
      ) : (
        <FormattedContentBody text={item.description} compact clampLines={isExpanded ? undefined : getPreviewLineClamp(item)} flat />
      )}
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
            setOpenCommentsForContentId((prev: string | null) => (prev === item.contentId ? null : item.contentId));
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-violet-200 hover:text-violet-700"
        >
          <MessageSquareText size={14} /> Comments {comments.length > 0 ? `(${comments.length})` : ''}
        </button>
        {isInlineEditing ? (
          <>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); void handleInlineSave(item); }}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={14} /> {submitting ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                skipNextAutoInlineEditRef.current = true;
                setEditingItem(null);
                clearInlineEditQueryParam();
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
            >
              <X size={14} /> Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (isReminderTab) {
                const params = new URLSearchParams();
                params.set('mode', activeTab);
                params.set('date', item.contentDate || selectedDate);
                params.set('editId', item.contentId);
                navigate(`/content/new?${params.toString()}`);
                return;
              }
              if (activeTab === 'calendar') {
                const params = new URLSearchParams();
                params.set('mode', 'calendar');
                params.set('date', item.contentDate || selectedDate);
                params.set('editId', item.contentId);
                navigate(`/content/new?${params.toString()}`);
                return;
              }
              if (isTypeDetailPage && !isItemDetailPage && !isReminderTab) {
                navigate(`/content/day/${selectedDate}/type/${item.type}/item/${item.contentId}?edit=1`);
                return;
              }
              if (isReminderTypeDetail && !isReminderItemDetail) {
                const params = new URLSearchParams(location.search);
                params.set('tab', activeTab);
                params.set('reminderType', selectedReminderType || item.type);
                params.set('reminderItem', item.contentId);
                params.set('edit', '1');
                navigate(`/content?${params.toString()}`);
                return;
              }
              if (activeTab === 'content-schedule') {
                openScheduleEditForm(item);
                return;
              }
              if (activeTab === 'blog') {
                const params = new URLSearchParams();
                params.set('mode', 'blog');
                params.set('date', item.contentDate || selectedDate);
                params.set('editId', item.contentId);
                navigate(`/content/new?${params.toString()}`);
                return;
              }
              openEdit(item, { inline: isExpanded && isInlineDetailPage });
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-violet-200 hover:text-violet-700"
          >
            <Pencil size={14} /> Edit
          </button>
        )}
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
                                setEditingCommentByContentId((prev: any) => ({ ...prev, [item.contentId]: comment.id }));
                                setEditingDraftByCommentId((prev: any) => ({ ...prev, [comment.id]: comment.text || '' }));
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
                            setEditingDraftByCommentId((prev: any) => ({ ...prev, [comment.id]: event.target.value }))
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
                              setEditingCommentByContentId((prev: any) => ({ ...prev, [item.contentId]: null }));
                              setEditingDraftByCommentId((prev: any) => ({ ...prev, [comment.id]: '' }));
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
                            setReplyingToCommentByContentId((prev: any) => ({
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
                            setReplyDraftByCommentId((prev: any) => ({ ...prev, [comment.id]: event.target.value }))
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
                            onClick={() => setReplyingToCommentByContentId((prev: any) => ({ ...prev, [item.contentId]: null }))}
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
                                          setEditingCommentByContentId((prev: any) => ({ ...prev, [item.contentId]: reply.id }));
                                          setEditingDraftByCommentId((prev: any) => ({ ...prev, [reply.id]: reply.text || '' }));
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
                                      setEditingDraftByCommentId((prev: any) => ({ ...prev, [reply.id]: event.target.value }))
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
                                        setEditingCommentByContentId((prev: any) => ({ ...prev, [item.contentId]: null }));
                                        setEditingDraftByCommentId((prev: any) => ({ ...prev, [reply.id]: '' }));
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
                setCommentDraftByContentId((prev: any) => ({ ...prev, [item.contentId]: event.target.value }))
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

export default ContentCard;
