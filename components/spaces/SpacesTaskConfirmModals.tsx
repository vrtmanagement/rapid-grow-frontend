import React from 'react';
import { X } from 'lucide-react';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';

type SpacesTaskConfirmModalsProps = Pick<
  SpacesViewController,
  | 'activeCommentTask'
  | 'setCommentTaskId'
  | 'setCommentDraft'
  | 'commentDraft'
  | 'me'
  | 'editingCommentId'
  | 'setEditingCommentId'
  | 'editCommentDraft'
  | 'setEditCommentDraft'
  | 'API_BASE'
  | 'getAuthHeaders'
  | 'setTasks'
  | 'setError'
  | 'mode'
  | 'modalStatus'
  | 'setModalStatus'
  | 'handleAddComment'
  | 'submittingComment'
  | 'columnToDelete'
  | 'setColumnToDelete'
  | 'setColumns'
  | 'sortedTasks'
  | 'commentToDeleteId'
  | 'setCommentToDeleteId'
  | 'deleteTaskModal'
  | 'setDeleteTaskModal'
  | 'bulkDeleteTaskModalOpen'
  | 'setBulkDeleteTaskModalOpen'
  | 'selectedTaskCount'
  | 'bulkSaving'
  | 'deleteSelectedTasks'
  | 'rejectTaskModal'
  | 'setRejectTaskModal'
  | 'rejectFeedbackDraft'
  | 'setRejectFeedbackDraft'
  | 'rejectingTask'
  | 'confirmRejectTask'
  | 'deleteTask'
>;

const SpacesTaskConfirmModals: React.FC<SpacesTaskConfirmModalsProps> = (props) => {
  const {
    activeCommentTask,
    setCommentTaskId,
    setCommentDraft,
    commentDraft,
    me,
    editingCommentId,
    setEditingCommentId,
    editCommentDraft,
    setEditCommentDraft,
    API_BASE,
    getAuthHeaders,
    setTasks,
    setError,
    mode,
    modalStatus,
    setModalStatus,
    handleAddComment,
    submittingComment,
    columnToDelete,
    setColumnToDelete,
    setColumns,
    sortedTasks,
    commentToDeleteId,
    setCommentToDeleteId,
    deleteTaskModal,
    setDeleteTaskModal,
    bulkDeleteTaskModalOpen,
    setBulkDeleteTaskModalOpen,
    selectedTaskCount,
    bulkSaving,
    deleteSelectedTasks,
    rejectTaskModal,
    setRejectTaskModal,
    rejectFeedbackDraft,
    setRejectFeedbackDraft,
    rejectingTask,
    confirmRejectTask,
    deleteTask,
  } = props;
  const [isDeletingTask, setIsDeletingTask] = React.useState(false);

  React.useEffect(() => {
    if (!deleteTaskModal) {
      setIsDeletingTask(false);
    }
  }, [deleteTaskModal]);

  return (
    <>
      {activeCommentTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => {
            setCommentTaskId(null);
            setCommentDraft('');
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[13px] text-slate-500">Comments</div>
                <div className="text-lg font-bold text-slate-900">{activeCommentTask.title}</div>
              </div>
              <button type="button" className="w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-50" onClick={() => { setCommentTaskId(null); setCommentDraft(''); }}>
                <X size={14} strokeWidth={2} className="mx-auto text-slate-700" />
              </button>
            </div>
            <div className="p-6 space-y-3 overflow-auto max-h-[55vh]">
              {(activeCommentTask.comments || []).length === 0 ? (
                <div className="text-slate-500 text-sm">No comments yet.</div>
              ) : (
                activeCommentTask.comments
                  .slice()
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((c: any) => {
                    const canEditComment = c.fromEmpId === me.id;
                    const isEditing = editingCommentId === c.id;
                    return (
                      <div key={c.id} className="border border-slate-200 rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-slate-700">{c.fromName || c.fromEmpId || 'User'}</span>
                            {c.editedAt && <span className="text-[10px] text-slate-400">(edited)</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">{new Date(c.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: true })}</span>
                            {canEditComment && (
                              <>
                                <button type="button" onClick={() => { setEditingCommentId(c.id); setEditCommentDraft(c.text); }} className="text-[11px] text-slate-500 hover:text-brand-red">Edit</button>
                                <button type="button" onClick={() => setCommentToDeleteId(c.id)} className="text-[11px] text-red-500 hover:text-red-600">Delete</button>
                              </>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="mt-1 space-y-2">
                            <textarea value={editCommentDraft} onChange={(e) => setEditCommentDraft(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" rows={2} />
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => { setEditingCommentId(null); setEditCommentDraft(''); }} className="px-3 py-1.5 rounded-full border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50">Cancel</button>
                              <button
                                type="button"
                                disabled={!editCommentDraft.trim()}
                                onClick={async () => {
                                  const text = editCommentDraft.trim();
                                  if (!text || !activeCommentTask) return;
                                  try {
                                    const res = await fetch(`${API_BASE}/spaces/tasks/${activeCommentTask.taskId}/comments/${c.id}`, {
                                      method: 'PATCH',
                                      headers: getAuthHeaders(),
                                      body: JSON.stringify({ text }),
                                    });
                                    const data = await res.json().catch(() => ({}));
                                    if (!res.ok) throw new Error(data.message || 'Failed to update comment');
                                    setTasks((prev: any[]) => prev.map((t: any) => t.taskId === activeCommentTask.taskId ? { ...t, comments: Array.isArray(data.comments) ? data.comments : [] } : t));
                                    setEditingCommentId(null);
                                    setEditCommentDraft('');
                                  } catch (e: any) {
                                    setError(e?.message || 'Failed to update comment');
                                  }
                                }}
                                className={`px-4 py-1.5 rounded-full bg-brand-red text-white text-[12px] font-semibold hover:bg-brand-navy ${!editCommentDraft.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[13px] text-slate-800 whitespace-pre-wrap">{c.text}</div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
            <div className="p-6 border-t border-slate-100 space-y-3">
              {mode === 'employee' && (
                <div className="flex items-center gap-3">
                  <label className="text-[13px] font-semibold text-slate-700">
                    Status
                    <select value={modalStatus} onChange={(e) => setModalStatus(e.target.value)} className="ml-2 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white">
                      <option value="todo">To Do</option>
                      <option value="doing">Doing</option>
                      <option value="review">Submitted</option>
                      {mode !== 'employee' && <option value="done">Done</option>}
                      <option value="blocked">Blocked</option>
                    </select>
                  </label>
                </div>
              )}
              <div className="flex gap-3">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                  placeholder="Add a comment or task update..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <button type="button" onClick={handleAddComment} disabled={!commentDraft.trim() || submittingComment} className={`px-6 py-3 rounded-2xl bg-brand-red text-white font-bold hover:bg-brand-navy transition-colors ${!commentDraft.trim() || submittingComment ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  {submittingComment ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {columnToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove field</h3>
            <p className="text-[14px] text-slate-600 mb-6">Are you sure you want to remove &quot;{columnToDelete.name}&quot; from all tasks?</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setColumnToDelete(null)} className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  if (!columnToDelete) return;
                  try {
                    const res = await fetch(`${API_BASE}/spaces/columns/${columnToDelete.id}`, { method: 'DELETE', headers: getAuthHeaders() });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.message || 'Failed to remove field');
                    setColumns(Array.isArray(data.columns) ? data.columns : []);
                    const newTasks = sortedTasks.map((t: any) => {
                      const { [columnToDelete.id]: _omit, ...rest } = t.customFields || {};
                      return { ...t, customFields: rest };
                    });
                    setTasks(newTasks);
                  } catch (e: any) {
                    setError(e?.message || 'Failed to remove field');
                  } finally {
                    setColumnToDelete(null);
                  }
                }}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {activeCommentTask && commentToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete comment</h3>
            <p className="text-[14px] text-slate-600 mb-6">Are you sure you want to delete this comment?</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setCommentToDeleteId(null)} className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  if (!activeCommentTask || !commentToDeleteId) return;
                  try {
                    const res = await fetch(`${API_BASE}/spaces/tasks/${activeCommentTask.taskId}/comments/${commentToDeleteId}`, { method: 'DELETE', headers: getAuthHeaders() });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.message || 'Failed to delete comment');
                    setTasks((prev: any[]) => prev.map((t: any) => t.taskId === activeCommentTask.taskId ? { ...t, comments: Array.isArray(data.comments) ? data.comments : [] } : t));
                  } catch (e: any) {
                    setError(e?.message || 'Failed to delete comment');
                  } finally {
                    setCommentToDeleteId(null);
                  }
                }}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteTaskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setBulkDeleteTaskModalOpen(false)}
        >
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-200 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Delete selected tasks</h3>
              <button
                type="button"
                onClick={() => setBulkDeleteTaskModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[14px] text-slate-600 mb-6">
              Are you sure you want to delete {selectedTaskCount} selected task{selectedTaskCount === 1 ? '' : 's'}? You can close this dialog and deletion will continue in the background.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkDeleteTaskModalOpen(false)}
                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
              <button
                type="button"
                disabled={bulkSaving}
                onClick={() => {
                  setBulkDeleteTaskModalOpen(false);
                  void deleteSelectedTasks();
                }}
                className="inline-flex min-w-[96px] items-center justify-center gap-2 rounded-full bg-brand-red px-5 py-2 text-[13px] font-semibold text-white hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-80"
              >
                {bulkSaving ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Yes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTaskModal && !bulkDeleteTaskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => {
            if (isDeletingTask) return;
            setDeleteTaskModal(null);
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-200 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete task</h3>
            <p className="text-[14px] text-slate-600 mb-6">Are you sure you want to delete &quot;{deleteTaskModal.title}&quot;?</p>
            <div className="flex justify-end gap-3">
              <button type="button" disabled={isDeletingTask} onClick={() => setDeleteTaskModal(null)} className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
              <button
                type="button"
                disabled={isDeletingTask}
                onClick={async () => {
                  if (!deleteTaskModal?.taskId || isDeletingTask) return;
                  setIsDeletingTask(true);
                  try {
                    const ok = await deleteTask(deleteTaskModal.taskId);
                    if (ok) {
                      setDeleteTaskModal(null);
                    }
                  } catch (e: any) {
                    setError(e?.message || 'Failed to delete task');
                  } finally {
                    setIsDeletingTask(false);
                  }
                }}
                className="inline-flex min-w-[116px] items-center justify-center gap-2 rounded-full bg-brand-red px-5 py-2 text-[13px] font-semibold text-white hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-80"
              >
                {isDeletingTask ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-slate-200 p-6">
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-slate-900">Send task back for updates</h3>
              <p className="mt-2 text-[14px] leading-6 text-slate-600">Share a clear reason for rejection and mention what needs to be updated before the employee submits this task again.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 mb-4">
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Task</div>
              <div className="mt-1 text-[15px] font-medium text-slate-900">{rejectTaskModal.title}</div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">Rejection feedback</label>
              <textarea value={rejectFeedbackDraft} onChange={(e) => setRejectFeedbackDraft(e.target.value)} rows={5} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red resize-none" placeholder="Example: The task is not ready for approval yet. Please attach the final update, correct the due-date deliverable, and confirm the client-facing notes are completed." />
              <p className="mt-2 text-[12px] text-slate-500">This feedback will be added to the task comments for the employee.</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setRejectTaskModal(null); setRejectFeedbackDraft(''); }} className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={!rejectFeedbackDraft.trim() || rejectingTask} onClick={confirmRejectTask} className={`px-5 py-2 rounded-full bg-amber-500 text-white text-[13px] font-semibold hover:bg-amber-600 ${!rejectFeedbackDraft.trim() || rejectingTask ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {rejectingTask ? 'Sending...' : 'Send Back'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SpacesTaskConfirmModals;
