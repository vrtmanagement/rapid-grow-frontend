import React from 'react';
import { FileDropZone } from '../ui/FileDropZone';
import ContentMainPanels from './ContentMainPanels';
import ContentViewModals from './ContentViewModals';
import SavedDraftsPanel from './SavedDraftsPanel';
import {
  TAB_META,
  WEEK_DAYS,
  WEEK_DAY_HEADER_CLASS,
  TYPE_LABEL,
  TYPE_ICON_META,
  TYPE_ACCENT,
  toDateKey,
  autoResizeTextarea,
  ScheduleDatePicker,
  CalendarDayCounters,
  hasServerDraftContent,
} from '../../views/contentViewShared';
import type { ContentTab } from '../../views/contentViewShared';
import { apiDeleteContentDraft } from '../../services/contentApi';
import { CONTENT_CREATE_DRAFT_STORAGE_PREFIX } from './contentCreateHelpers';

type ContentViewLayoutProps = { ctx: Record<string, any> };

const ContentViewLayout: React.FC<ContentViewLayoutProps> = ({ ctx }) => {
  const {
    MOMENT_DRAFT_STORAGE_KEY,
    activeReminderItems,
    activeTab,
    addAutoLink,
    addAutoTag,
    attachments,
    blogItems,
    commentBusyKey,
    commentDeleteModal,
    contentDate,
    countsByDate,
    currentUser,
    deleteTarget,
    deletingDraftMode,
    description,
    editingItem,
    editingMomentId,
    error,
    handleAttachmentUpload,
    handleDelete,
    handleDeleteComment,
    handleMomentSave,
    handleSave,
    handleTabChange,
    isBlogItemDetail,
    isDayPage,
    isItemDetailPage,
    isReminderItemDetail,
    isReminderTypeDetail,
    isScheduleItemDetail,
    isTypeDetailPage,
    linkOptions,
    loading,
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
    openCreatePage,
    queueContentDropFiles,
    reminderCategoryLabel,
    removeAutoLink,
    removeAutoTag,
    renderContentCard,
    resetMomentForm,
    rootRef,
    savedDrafts,
    scheduleAutosaveStatus,
    scheduleDraft,
    scheduleItems,
    selectedBlogItem,
    selectedBlogItemId,
    selectedDate,
    selectedDayGroups,
    selectedDayItems,
    selectedItem,
    selectedReminderItem,
    selectedReminderType,
    selectedReminderTypeItems,
    selectedScheduleItem,
    selectedScheduleItemId,
    selectedType,
    selectedTypeItems,
    setActiveTab,
    setAttachments,
    setCommentDeleteModal,
    setContentDate,
    setDeleteTarget,
    setDeletingDraftMode,
    setDescription,
    setEditingItem,
    setEditingMomentId,
    setMomentFromDate,
    setMomentText,
    setMomentToDate,
    setMomentTopic,
    setMonthCursor,
    setNewLinkValue,
    setNewTagValue,
    setSavedDrafts,
    setScheduleAutosaveStatus,
    setScheduleDraft,
    setShowModal,
    setShowScheduleForm,
    setTagOptions,
    setTitle,
    setToast,
    setType,
    showModal,
    showScheduleForm,
    submitting,
    tagOptions,
    title,
    toast,
    todayKey,
    type,
    uploadingAttachment,
  } = ctx;

  return (
  <div ref={rootRef} className="relative -mx-8 -mt-14 w-auto space-y-4 pb-4 lg:-mx-10 lg:-mt-16 xl:-mx-12">
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 rounded-[2.25rem] bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(239,68,68,0.08),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(248,250,252,0.65))]" />
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}
    <div className="w-full max-w-full rounded-[1.65rem] border border-white/70 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <div className="p-0">
        <div className="grid w-full grid-cols-1 gap-2 lg:grid-cols-6 lg:gap-1.5">
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
    <SavedDraftsPanel
      savedDrafts={savedDrafts}
      scheduleDraft={scheduleDraft}
      deletingDraftMode={deletingDraftMode}
      setDeletingDraftMode={setDeletingDraftMode}
      setSavedDrafts={setSavedDrafts}
      setToast={setToast}
      selectedDate={selectedDate}
      navigate={navigate}
      momentDraftStorageKey={MOMENT_DRAFT_STORAGE_KEY}
      setMomentTopic={setMomentTopic}
      setMomentText={setMomentText}
      setEditingMomentId={setEditingMomentId}
      setScheduleDraft={setScheduleDraft}
      setScheduleAutosaveStatus={setScheduleAutosaveStatus}
      setActiveTab={setActiveTab}
      setMomentFromDate={setMomentFromDate}
      setMomentToDate={setMomentToDate}
      setShowScheduleForm={setShowScheduleForm}
    />

    <FileDropZone
      className="min-h-[200px]"
      disabled={uploadingAttachment || submitting}
      overlayTitle="Drop files to add content"
      overlayHint="Opens the content composer with your files attached"
      onFiles={(files) => {
        if (showModal) {
          void handleAttachmentUpload(files);
          return;
        }
        queueContentDropFiles(files);
        openCreatePage();
      }}
    >
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
        blogItems,
        selectedBlogItemId,
        selectedBlogItem,
        isBlogItemDetail,
        ScheduleDatePicker,
      }}
    />
    </FileDropZone>

    <ContentViewModals
      ctx={{
        showModal,
        setShowModal,
        editingItem,
        setEditingItem,
        title,
        setTitle,
        description,
        setDescription,
        type,
        setType,
        contentDate,
        setContentDate,
        attachments,
        setAttachments,
        uploadingAttachment,
        handleAttachmentUpload,
        handleSave,
        submitting,
        deleteTarget,
        setDeleteTarget,
        handleDelete,
        deletingDraftMode,
        setDeletingDraftMode,
        toast,
        setToast,
        modalDescriptionRef,
        commentDeleteModal,
        setCommentDeleteModal,
        commentBusyKey,
        handleDeleteComment,
      }}
    />
  </div>
  );
};

export default ContentViewLayout;
