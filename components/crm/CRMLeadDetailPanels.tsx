import React from 'react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import CRMLeadDetailModals from './CRMLeadDetailModals';

type CRMLeadDetailPanelsProps = { ctx: Record<string, any> };

const CRMLeadDetailPanels: React.FC<CRMLeadDetailPanelsProps> = ({ ctx }) => {
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
  <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-red/20 bg-rose-50 text-brand-red hover:bg-rose-100 hover:-translate-y-0.5 transition-all duration-200 text-sm font-semibold shadow-sm"
        onClick={() => navigate('/crm')}
      >
        <ArrowLeft size={15} />
        Back to Leads
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
          onClick={openLeadFormModal}
        >
          <Pencil size={15} />
          Edit lead
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 disabled:opacity-60"
          disabled={deletingLead}
          onClick={() => setDeleteLeadConfirmOpen(true)}
        >
          <Trash2 size={15} />
          {deletingLead ? 'Deleting...' : 'Delete lead'}
        </button>
      </div>
    </div>
    <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-indigo-50/60 shadow-[0_20px_55px_rgba(15,23,42,0.10)] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            disabled
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 text-sm cursor-not-allowed"
          >
            Lead History
          </button>
          <button
            disabled
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 text-sm cursor-not-allowed"
          >
            Lead Documents
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)] transition-all duration-300">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[1.7rem] font-semibold tracking-tight text-slate-900">Lead Information</h3>
            <div className="flex items-center gap-2">
              {editingSection === 'lead' ? (
                <>
                  <button
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50"
                    onClick={() => {
                      initializeEditForm(lead);
                      setEditingSection('none');
                    }}
                    disabled={savingDetails}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg bg-brand-red text-white text-sm disabled:opacity-60"
                    onClick={handleSaveDetails}
                    disabled={savingDetails}
                  >
                    {savingDetails ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  className="px-3 py-1.5 rounded-lg border border-brand-red/20 bg-rose-50 text-brand-red text-sm font-semibold hover:bg-rose-100"
                  onClick={openLeadFormModal}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          <div className="mt-5 flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-semibold flex items-center justify-center shadow-md">
              {initials}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {[
                [
                  'Lead Name',
                  editingSection === 'lead' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="First name"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      />
                      <input
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="Last name"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                  ) : (
                    fullName
                  ),
                ],
                [
                  'Lead Type',
                  editingSection === 'lead' ? (
                    <select
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={editForm.leadTypeTab}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, leadTypeTab: e.target.value }))}
                      disabled={!canEditLeadType}
                    >
                      {tabOptions.map((tabName) => (
                        <option key={tabName} value={tabName}>
                          {tabName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${leadTypeTone}`}>{currentTabLabel}</span>
                  ),
                ],
                [
                  'Status',
                  editingSection === 'lead' ? (
                    <select
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={editForm.status}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="CONVERTED">CONVERTED</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone}`}>{lead.status || '-'}</span>
                  ),
                ],
                [
                  'Email',
                  editingSection === 'lead' ? (
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={editForm.email}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  ) : (
                    renderClickableValue('Email', lead.email || '-')
                  ),
                ],
                [
                  'Location',
                  editingSection === 'lead' ? (
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={editForm.location}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                    />
                  ) : (
                    readCustomFieldByAliases(lead, ['address', 'location']) || '-'
                  ),
                ],
                [
                  'Phone Number',
                  editingSection === 'lead' ? (
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={editForm.phoneNumber}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    />
                  ) : (
                    readCustomField(lead, 'phone_number') || '-'
                  ),
                ],
                [
                  'LinkedIn Profile',
                  editingSection === 'lead' ? (
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={editForm.linkedInProfile}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, linkedInProfile: e.target.value }))}
                    />
                  ) : (
                    renderClickableValue('LinkedIn Profile', linkedInProfile)
                  ),
                ],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[130px_1fr] gap-3 text-sm">
                  <p className="text-slate-500">{label}</p>
                  <div className="font-semibold text-slate-800 break-words">{value as any}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)] transition-all duration-300">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[1.7rem] font-semibold tracking-tight text-slate-900">Company Information</h3>
            <div className="flex items-center gap-2">
              {editingSection === 'company' ? (
                <>
                  <button
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50"
                    onClick={() => {
                      initializeEditForm(lead);
                      setEditingSection('none');
                    }}
                    disabled={savingDetails}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg bg-brand-red text-white text-sm disabled:opacity-60"
                    onClick={handleSaveDetails}
                    disabled={savingDetails}
                  >
                    {savingDetails ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  className="px-3 py-1.5 rounded-lg border border-brand-red/20 bg-rose-50 text-brand-red text-sm font-semibold hover:bg-rose-100"
                  onClick={openLeadFormModal}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {[
              [
                'Company',
                editingSection === 'company' ? (
                  <input
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    value={editForm.company}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, company: e.target.value }))}
                  />
                ) : (
                  lead.company || '-'
                ),
              ],
              [
                'Designation',
                editingSection === 'company' ? (
                  <input
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    value={editForm.designation}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, designation: e.target.value }))}
                  />
                ) : (
                  lead.position || readCustomField(lead, 'designation') || '-'
                ),
              ],
              [
                'Company URL',
                editingSection === 'company' ? (
                  <input
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    value={editForm.companyUrl}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, companyUrl: e.target.value }))}
                  />
                ) : (
                  renderClickableValue('Company URL', lead.url || readCustomField(lead, 'company_url') || '-')
                ),
              ],
              [
                'Employee Count',
                editingSection === 'company' ? (
                  <input
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    value={editForm.employeeCount}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, employeeCount: e.target.value }))}
                  />
                ) : (
                  lead.employeeCount ?? '-'
                ),
              ],
              [
                'Lead Source',
                editingSection === 'company' ? (
                  <input
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    value={editForm.leadSource}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, leadSource: e.target.value }))}
                  />
                ) : (
                  readCustomField(lead, 'lead_source') || '-'
                ),
              ],
              [
                'Industry',
                editingSection === 'company' ? (
                  <input
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    value={editForm.industry}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, industry: e.target.value }))}
                  />
                ) : (
                  readCustomField(lead, 'industry') || '-'
                ),
              ],
              [
                'Company LinkedIn',
                editingSection === 'company' ? (
                  <input
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    value={editForm.companyLinkedIn}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, companyLinkedIn: e.target.value }))}
                  />
                ) : (
                  renderClickableValue('Company LinkedIn', companyLinkedIn)
                ),
              ],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[130px_1fr] gap-3 text-sm">
                <p className="text-slate-500">{label}</p>
                <p className="font-semibold text-slate-800 break-words">{value as any}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {hasNotesCard || hasCustomFieldsCard ? (
      <div className={`mt-6 grid grid-cols-1 gap-4 ${hasNotesCard && hasCustomFieldsCard ? 'lg:grid-cols-2' : ''}`}>
        {hasNotesCard ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-rose-600 font-semibold">Notes</div>
            <div className="flex items-center gap-2">
              {editingNotes ? (
                <>
                  <button
                    className="px-2.5 py-1 rounded-md border border-slate-300 text-xs"
                    onClick={() => {
                      setNotesDraft(String(lead.notes || ''));
                      setEditingNotes(false);
                    }}
                    disabled={savingMeta}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-2.5 py-1 rounded-md bg-brand-red text-white text-xs disabled:opacity-60"
                    onClick={() => persistMeta(notesDraft, customFieldsDraft)}
                    disabled={savingMeta}
                  >
                    {savingMeta ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  className="px-3 py-1.5 rounded-lg border border-brand-red/20 bg-rose-50 text-brand-red text-sm font-semibold hover:bg-rose-100"
                  onClick={() => setEditingNotes(true)}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          {editingNotes ? (
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mt-2 min-h-[110px]"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
            />
          ) : (
            <div className="text-sm font-medium text-slate-800 mt-1 whitespace-pre-wrap">{lead.notes || '-'}</div>
          )}
        </div>
        ) : null}
        {hasCustomFieldsCard ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-indigo-600 font-semibold">Custom Fields</div>
            <div className="flex items-center gap-2">
              {editingCustomFields ? (
                <>
                  <button
                    className="px-2.5 py-1 rounded-md border border-slate-300 text-xs"
                    onClick={() => {
                      initializeMetaDrafts(lead);
                      setEditingCustomFields(false);
                    }}
                    disabled={savingMeta}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-2.5 py-1 rounded-md bg-brand-red text-white text-xs disabled:opacity-60"
                    onClick={() => persistMeta(notesDraft, customFieldsDraft)}
                    disabled={savingMeta}
                  >
                    {savingMeta ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  className="px-3 py-1.5 rounded-lg border border-brand-red/20 bg-rose-50 text-brand-red text-sm font-semibold hover:bg-rose-100"
                  onClick={() => setEditingCustomFields(true)}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          {editingCustomFields ? (
            Object.keys(customFieldsDraft).length ? (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {Object.entries(customFieldsDraft).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{key.replace(/_/g, ' ')}</div>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      value={value}
                      onChange={(e) => setCustomFieldsDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm font-medium text-slate-800 mt-1">-</div>
            )
          ) : customFieldEntries.length ? (
            <div className="mt-3 grid grid-cols-1 gap-2">
              {customFieldEntries.map(([key, rawValue]) => {
                const value = rawValue && typeof rawValue === 'object' && 'value' in (rawValue as any)
                  ? String((rawValue as any).value ?? '')
                  : String(rawValue ?? '');
                return (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition-colors duration-200">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{key.replace(/_/g, ' ')}</div>
                    <div className="text-sm text-slate-800 mt-1 break-words">{value || '-'}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm font-medium text-slate-800 mt-1">-</div>
          )}
        </div>
        ) : null}
      </div>
      ) : null}
    </div>

    <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_12px_30px_rgba(15,23,42,0.08)] p-5">
      <div className="mb-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-rose-50 px-4 py-3 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-slate-900">Actions</h4>
          <p className="text-sm text-slate-600">Track follow-ups and updates for this lead in a timeline style.</p>
        </div>
        <button
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-red to-rose-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          onClick={() => {
            setEditingAction(null);
            setActionTitle('');
            setActionDescription('');
            setActionModalOpen(true);
          }}
        >
          Add Action
        </button>
      </div>
      <div className={`grid grid-cols-1 gap-4 ${actions.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {actions.map((item, idx) => (
          <div
            key={item.id}
            className={`group rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-indigo-50/40 p-4 flex flex-col justify-between min-h-[200px] shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:border-indigo-200 hover:shadow-[0_18px_36px_rgba(79,70,229,0.16)] hover:-translate-y-0.5 transition-all duration-300 ${
              actions.length > 1 && actions.length % 2 === 1 && idx === actions.length - 1 ? 'md:col-span-2' : ''
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {item.actorAvatarUrl ? (
                  <img
                    src={item.actorAvatarUrl}
                    alt={item.actorName}
                    className="h-8 w-8 rounded-full object-cover border border-indigo-200 shadow-sm"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-[11px] font-semibold inline-flex items-center justify-center shadow-sm">
                    {item.actorInitials}
                  </div>
                )}
                <div className="text-xs text-slate-500 leading-tight">
                  <div className="font-semibold text-slate-800">{item.actorName}</div>
                  <div>{formatActionDateTime(item.updatedAt)}</div>
                </div>
                {item.edited ? (
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 shadow-sm">
                    Edited
                  </span>
                ) : null}
              </div>
              <div className="font-semibold text-slate-900 text-[15px]">{item.title}</div>
              <div
                className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-all leading-6"
                style={{ maxHeight: '15rem', overflow: 'hidden' }} // preview mode
              >
                {item.description}
              </div>
            </div>
            <div className="flex gap-2 shrink-0 justify-end mt-3">
              {item.description && item.description.length > 250 ? (
                <button
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white/90 text-slate-700 text-sm font-medium shadow-sm hover:bg-slate-50 hover:border-slate-400 hover:-translate-y-0.5 transition-all duration-200 underline underline-offset-2"
                  onClick={() => setFullViewAction(item)}
                >
                  Show more
                </button>
              ) : null}
              <button
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-indigo-200 bg-white/90 text-indigo-700 text-sm font-medium shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-200"
                onClick={() => {
                  setEditingAction(item);
                  setActionTitle(item.title);
                  setActionDescription(item.description);
                  setActionModalOpen(true);
                }}
              >
                Edit
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-rose-200 bg-white/90 text-rose-600 text-sm font-medium shadow-sm hover:bg-rose-50 hover:border-rose-300 hover:-translate-y-0.5 transition-all duration-200"
                onClick={() => setDeleteTarget(item)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!actions.length && <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No actions added yet.</div>}
      </div>
    </div>

    <CRMLeadDetailModals ctx={ctx} />
  </div>
  );
};

export default CRMLeadDetailPanels;
