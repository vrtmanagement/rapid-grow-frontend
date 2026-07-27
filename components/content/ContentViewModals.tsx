import React from 'react';
import { FileText, X } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import Toast from '../ui/Toast';
import { FileDropZone } from '../ui/FileDropZone';
import { TYPE_LABEL, autoResizeTextarea } from '../../views/contentViewShared';
import type { ContentType } from '../../services/contentApi';

type ContentViewModalsProps = { ctx: Record<string, any> };

const ContentViewModals: React.FC<ContentViewModalsProps> = ({ ctx }) => {
  const {
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
  } = ctx;

  return (
    <>
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
      <form onSubmit={handleSave} className="p-6">
        <FileDropZone
          as="div"
          className="space-y-4"
          disabled={uploadingAttachment || submitting}
          overlayTitle="Drop files to attach"
          overlayHint="Images, PDFs, Office docs, and more"
          onFiles={(files) => void handleAttachmentUpload(files)}
        >
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
        <textarea
          ref={modalDescriptionRef}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onInput={(event) => autoResizeTextarea(event.currentTarget)}
          rows={1}
          placeholder="Description"
          className="min-h-[240px] w-full resize-none overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] leading-7 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
        />
        <FileDropZone
          as="label"
          className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-sm font-medium text-violet-700"
          disabled={uploadingAttachment || submitting}
          overlayTitle="Drop files here"
          onFiles={(files) => void handleAttachmentUpload(files)}
        >
          <FileText size={16} />
          {uploadingAttachment ? 'Uploading files...' : 'Add files'}
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rtf" className="hidden" onChange={(e) => void handleAttachmentUpload(e.target.files)} />
        </FileDropZone>
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
        </FileDropZone>
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
    </>
  );
};

export default ContentViewModals;
