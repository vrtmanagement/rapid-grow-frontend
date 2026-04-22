import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { crmJson } from '../services/crmApi';

type ToastTone = 'success' | 'error';
type ToastItem = { id: number; tone: ToastTone; message: string };
type LeadActionItem = { id: string; title: string; description: string };

const CRMLeadDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { leadId = '' } = useParams();
  const [lead, setLead] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [actions, setActions] = useState<LeadActionItem[]>([]);
  const [expandedActionIds, setExpandedActionIds] = useState<Record<string, boolean>>({});
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<LeadActionItem | null>(null);
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<LeadActionItem | null>(null);

  const readCustomField = (source: any, key: string) => {
    const raw = source?.customFields?.[key];
    if (raw && typeof raw === 'object' && 'value' in raw) return String((raw as any).value ?? '');
    return String(raw ?? '');
  };

  const pushToast = (message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    crmJson<any>(`/crm/${leadId}`)
      .then((data) => setLead(data))
      .catch((e: any) => pushToast(e.message || 'Failed to load lead details', 'error'))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-500">Loading lead details...</div>;
  }

  if (!lead) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
        <p className="text-slate-600">Lead not found.</p>
        <button className="mt-4 px-4 py-2 rounded-lg border border-slate-300" onClick={() => navigate('/crm')}>Back</button>
      </div>
    );
  }

  const fixedCustomFieldKeys = new Set(['phone_number', 'linkedin_profile', 'lead_source', 'birthday', 'industry']);
  const customFieldEntries = Object.entries(lead?.customFields || {}).filter(([key, value]) => {
    if (fixedCustomFieldKeys.has(key)) return false;
    if (value === undefined || value === null) return false;
    if (typeof value === 'object' && 'value' in (value as any)) return String((value as any).value ?? '').trim() !== '';
    return String(value).trim() !== '';
  });

  const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead Details';
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join('') || 'L';
  const linkedInProfile = readCustomField(lead, 'linkedin_profile') || '-';
  const leadTypeTone =
    lead.leadType === 'HOT'
      ? 'bg-rose-100 text-rose-700 border-rose-200'
      : lead.leadType === 'WARM'
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : lead.leadType === 'COLD'
          ? 'bg-sky-100 text-sky-700 border-sky-200'
          : 'bg-violet-100 text-violet-700 border-violet-200';
  const statusTone =
    String(lead.status || '').toUpperCase() === 'CONVERTED'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-indigo-50/60 shadow-[0_20px_55px_rgba(15,23,42,0.10)] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <button
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white/90 hover:bg-white hover:-translate-y-0.5 transition-all duration-200 text-sm"
            onClick={() => navigate('/crm')}
          >
            Back to Leads
          </button>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white/80 text-slate-700 text-sm hover:bg-white hover:-translate-y-0.5 transition-all duration-200">
              Lead History
            </button>
            <button className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white/80 text-slate-700 text-sm hover:bg-white hover:-translate-y-0.5 transition-all duration-200">
              Lead Documents
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)] transition-all duration-300">
            <h3 className="text-[1.7rem] font-semibold tracking-tight text-slate-900">Lead Information</h3>
            <div className="mt-5 flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-semibold flex items-center justify-center shadow-md">
                {initials}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                {[
                  ['Lead Name', fullName],
                  ['Lead Type', <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${leadTypeTone}`}>{lead.leadType || '-'}</span>],
                  ['Status', <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone}`}>{lead.status || '-'}</span>],
                  ['Email', lead.email || '-'],
                  ['Address', readCustomField(lead, 'address') || '-'],
                  ['Phone Number', readCustomField(lead, 'phone_number') || '-'],
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
            <h3 className="text-[1.7rem] font-semibold tracking-tight text-slate-900">Company Information</h3>
            <div className="mt-5 space-y-3">
              {[
                ['Company', lead.company || '-'],
                ['Designation', lead.position || '-'],
                ['Company URL', lead.url || '-'],
                ['Connected On', lead.connectedOn ? new Date(lead.connectedOn).toLocaleDateString() : '-'],
                ['Employee Count', lead.employeeCount ?? '-'],
                ['Lead Source', readCustomField(lead, 'lead_source') || '-'],
                ['Industry', readCustomField(lead, 'industry') || '-'],
                ['LinkedIn Profile', linkedInProfile],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[130px_1fr] gap-3 text-sm">
                  <p className="text-slate-500">{label}</p>
                  <p className="font-semibold text-slate-800 break-words">{value as any}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Notes</div>
            <div className="text-sm font-medium text-slate-800 mt-1 whitespace-pre-wrap">{lead.notes || '-'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Custom Fields</div>
            {customFieldEntries.length ? (
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
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_12px_30px_rgba(15,23,42,0.08)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-bold text-slate-900">Actions</h4>
            <p className="text-sm text-slate-500">Add task/action items for this card.</p>
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
        <div className="space-y-2">
          {actions.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-start justify-between gap-3 hover:border-slate-300 hover:shadow-sm transition-all duration-200">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-800">{item.title}</div>
                <div
                  className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-all"
                  style={
                    expandedActionIds[item.id]
                      ? undefined
                      : { maxHeight: '15rem', overflow: 'hidden' } // around 10 lines
                  }
                >
                  {item.description}
                </div>
                {item.description && item.description.length > 250 && (
                  <button
                    className="mt-2 text-xs font-semibold text-brand-red hover:underline"
                    onClick={() =>
                      setExpandedActionIds((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                  >
                    {expandedActionIds[item.id] ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  className="px-3 py-1.5 rounded border border-slate-300 text-sm hover:bg-slate-50 transition-colors duration-200"
                  onClick={() => {
                    setEditingAction(item);
                    setActionTitle(item.title);
                    setActionDescription(item.description);
                    setActionModalOpen(true);
                  }}
                >
                  Edit
                </button>
                <button className="px-3 py-1.5 rounded border border-red-300 text-red-600 text-sm hover:bg-red-50 transition-colors duration-200" onClick={() => setDeleteTarget(item)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!actions.length && <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No actions added yet.</div>}
        </div>
      </div>

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
                onClick={() => {
                  const title = actionTitle.trim();
                  if (!title) {
                    pushToast('Action title is required.', 'error');
                    return;
                  }
                  if (editingAction) {
                    setActions((prev) => prev.map((item) => item.id === editingAction.id ? { ...item, title, description: actionDescription.trim() } : item));
                    pushToast('Action updated.');
                  } else {
                    setActions((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, title, description: actionDescription.trim() }]);
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

      {deleteTarget && (
        <div className="fixed inset-0 z-[110] bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200"><h3 className="text-lg font-semibold text-slate-800">Delete Action</h3></div>
            <div className="p-6 text-slate-700">Delete action <span className="font-semibold">{deleteTarget.title}</span>?</div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={() => setDeleteTarget(null)}>No</button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 text-white"
                onClick={() => {
                  setActions((prev) => prev.filter((item) => item.id !== deleteTarget.id));
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
    </div>
  );
};

export default CRMLeadDetailPage;
