import React from 'react';
import CRMLeadForm, { CRMLeadPayload } from '../../views/crm/CRMLeadForm';
import { crmJson } from '../../services/crmApi';

type CRMLeadDetailModalsProps = { ctx: Record<string, any> };

const CRMLeadDetailModals: React.FC<CRMLeadDetailModalsProps> = ({ ctx }) => {
  const {
    actionDescription,
    actionModalOpen,
    actionTitle,
    actions,
    actorAvatarUrl,
    actorInitials,
    actorName,
    canEditLeadType,
    canUseAllPeopleScope,
    companyLinkedIn,
    currentTabLabel,
    customFieldEntries,
    customFieldsDraft,
    customTabs,
    deleteLeadConfirmOpen,
    deleteTarget,
    deletingLead,
    editForm,
    editingAction,
    editingCustomFields,
    editingNotes,
    editingSection,
    fixedCustomFieldKeys,
    formActiveTab,
    formatActionDateTime,
    fullName,
    fullViewAction,
    getStoredActionsFromLead,
    handleSaveDetails,
    hasCustomFieldsCard,
    hasNotesCard,
    initializeEditForm,
    initializeMetaDrafts,
    initials,
    lead,
    leadFormOpen,
    leadTypeTone,
    linkedInProfile,
    loading,
    navigate,
    normalizeCustomFieldKey,
    notesDraft,
    notesValue,
    openLeadFormModal,
    persistActions,
    persistMeta,
    pushToast,
    readCustomField,
    readCustomFieldByAliases,
    renderClickableValue,
    role,
    savingDetails,
    savingMeta,
    sessionEmployee,
    setActionDescription,
    setActionModalOpen,
    setActionTitle,
    setActions,
    setCustomFieldsDraft,
    setCustomTabs,
    setDeleteLeadConfirmOpen,
    setDeleteTarget,
    setDeletingLead,
    setEditForm,
    setEditingAction,
    setEditingCustomFields,
    setEditingNotes,
    setEditingSection,
    setFullViewAction,
    setLead,
    setLeadFormOpen,
    setLoading,
    setNotesDraft,
    setSavingDetails,
    setSavingMeta,
    setToasts,
    statusTone,
    tabOptions,
    toasts,
  } = ctx;

  return (
    <>
    {fullViewAction ? (
      <div className="fixed inset-0 z-[111] bg-black/35 backdrop-blur-[2px] p-4" onClick={() => setFullViewAction(null)}>
        <div
          className="mx-auto mt-6 w-full max-w-6xl rounded-2xl border border-indigo-100 bg-white shadow-[0_28px_65px_rgba(15,23,42,0.28)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-rose-50 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs shadow-sm">
              <span className="text-indigo-600 font-semibold">Action Details</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-700 font-medium truncate max-w-[260px]">{fullViewAction.title}</span>
            </div>
            <button
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-semibold shadow-sm hover:shadow-md"
              onClick={() => setFullViewAction(null)}
            >
              Close
            </button>
          </div>
          <div className="p-6 max-h-[calc(86vh-72px)] overflow-y-auto bg-white">
            <div className="flex items-center gap-3 mb-4">
              {fullViewAction.actorAvatarUrl ? (
                <img
                  src={fullViewAction.actorAvatarUrl}
                  alt={fullViewAction.actorName}
                  className="h-10 w-10 rounded-full object-cover border border-indigo-200"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-sm font-semibold inline-flex items-center justify-center">
                  {fullViewAction.actorInitials}
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-slate-900">{fullViewAction.actorName}</div>
                <div className="text-xs text-slate-500">{formatActionDateTime(fullViewAction.updatedAt)}</div>
              </div>
              {fullViewAction.edited ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Edited
                </span>
              ) : null}
            </div>
            <h5 className="text-lg font-semibold text-slate-900">{fullViewAction.title}</h5>
            <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm leading-7 text-slate-700 whitespace-pre-wrap break-words">
              {fullViewAction.description || '-'}
            </div>
          </div>
        </div>
      </div>
    ) : null}

    {actionModalOpen && (
      <div className="fixed inset-0 z-[110] bg-black/35 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">{editingAction ? 'Edit Action' : 'Add Action'}</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Title</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Description</label>
              <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[220px]" value={actionDescription} onChange={(e) => setActionDescription(e.target.value)} />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={() => setActionModalOpen(false)}>Cancel</button>
            <button
              className="px-4 py-2 rounded-lg bg-brand-red text-white"
              onClick={async () => {
                const title = actionTitle.trim();
                if (!title) {
                  pushToast('Action title is required.', 'error');
                  return;
                }
                if (editingAction) {
                  const nextActions = actions.map((item) =>
                      item.id === editingAction.id
                        ? {
                            ...item,
                            title,
                            description: actionDescription.trim(),
                            updatedAt: new Date().toISOString(),
                            edited: true,
                          }
                        : item,
                  );
                  await persistActions(nextActions);
                  pushToast('Action updated.');
                } else {
                  const nowIso = new Date().toISOString();
                  const nextActions = [
                    ...actions,
                    {
                      id: `${Date.now()}-${Math.random()}`,
                      title,
                      description: actionDescription.trim(),
                      createdAt: nowIso,
                      updatedAt: nowIso,
                      edited: false,
                      actorName,
                      actorInitials,
                      actorAvatarUrl,
                    },
                  ];
                  await persistActions(nextActions);
                  pushToast('Action added.');
                }
                setActionModalOpen(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}

    {leadFormOpen && (
      <CRMLeadForm
        variant="modal"
        mode="edit"
        initialData={lead}
        activeTab={formActiveTab}
        onCancel={() => setLeadFormOpen(false)}
        onSubmit={async (payload: CRMLeadPayload) => {
          const updated = await crmJson<any>(`/crm/${lead._id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
          setLead(updated);
          initializeEditForm(updated);
          setLeadFormOpen(false);
          pushToast('Lead updated successfully.');
        }}
        onError={(message) => pushToast(message, 'error')}
      />
    )}

    {deleteLeadConfirmOpen && (
      <div className="fixed inset-0 z-[110] bg-black/35 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Delete lead</h3>
          </div>
          <div className="p-6 text-slate-700">
            Delete <span className="font-semibold">{fullName}</span> permanently? This cannot be undone.
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-lg border border-slate-300"
              onClick={() => setDeleteLeadConfirmOpen(false)}
              disabled={deletingLead}
            >
              No
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-60"
              disabled={deletingLead}
              onClick={async () => {
                setDeletingLead(true);
                try {
                  await crmJson(`/crm/${lead._id}`, { method: 'DELETE' });
                  pushToast('Lead deleted.');
                  navigate('/crm');
                } catch (e: any) {
                  pushToast(e.message || 'Failed to delete lead', 'error');
                } finally {
                  setDeletingLead(false);
                  setDeleteLeadConfirmOpen(false);
                }
              }}
            >
              {deletingLead ? 'Deleting...' : 'Yes'}
            </button>
          </div>
        </div>
      </div>
    )}

    {deleteTarget && (
      <div className="fixed inset-0 z-[110] bg-black/35 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-200"><h3 className="text-lg font-semibold text-slate-800">Delete Action</h3></div>
          <div className="p-6 text-slate-700">Delete action <span className="font-semibold">{deleteTarget.title}</span>?</div>
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={() => setDeleteTarget(null)}>No</button>
            <button
              className="px-4 py-2 rounded-lg bg-red-600 text-white"
              onClick={async () => {
                const nextActions = actions.filter((item) => item.id !== deleteTarget.id);
                await persistActions(nextActions);
                setDeleteTarget(null);
                pushToast('Action deleted.');
              }}
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="fixed top-6 right-6 space-y-3 z-[130]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`max-w-sm rounded-[24px] border bg-white px-5 py-4 shadow-[0_22px_50px_rgba(15,23,42,0.16)] animate-in slide-in-from-top-2 fade-in duration-300 ${
            toast.tone === 'success' ? 'border-emerald-200' : 'border-rose-200'
          }`}
        >
          <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${toast.tone === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {toast.tone === 'success' ? 'Success' : 'Error'}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{toast.message}</p>
        </div>
      ))}
    </div>
    </>
  );
};

export default CRMLeadDetailModals;
