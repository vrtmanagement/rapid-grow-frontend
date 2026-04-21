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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <button className="mb-3 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-sm" onClick={() => navigate('/crm')}>Back</button>
          <h3 className="text-lg font-semibold text-slate-900">{`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead Details'}</h3>
          <p className="text-sm text-slate-500">View complete lead profile and manage actions.</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ['Email Address', lead.email || '-'],
            ['URL', lead.url || '-'],
            ['Company', lead.company || '-'],
            ['Position', lead.position || '-'],
            ['Connected On', lead.connectedOn ? new Date(lead.connectedOn).toLocaleDateString() : '-'],
            ['Employee Count', lead.employeeCount ?? '-'],
            ['Lead Type', lead.leadType || '-'],
            ['Status', lead.status || '-'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
              <div className="text-sm font-medium text-slate-800 mt-1">{value as any}</div>
            </div>
          ))}
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Notes</div>
            <div className="text-sm font-medium text-slate-800 mt-1">{lead.notes || '-'}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-bold text-slate-900">Actions</h4>
            <p className="text-sm text-slate-500">Add task/action items for this card.</p>
          </div>
          <button
            className="px-4 py-2 rounded-lg bg-brand-red text-white"
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
            <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 flex items-start justify-between gap-3">
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
                  className="px-3 py-1.5 rounded border border-slate-300 text-sm"
                  onClick={() => {
                    setEditingAction(item);
                    setActionTitle(item.title);
                    setActionDescription(item.description);
                    setActionModalOpen(true);
                  }}
                >
                  Edit
                </button>
                <button className="px-3 py-1.5 rounded border border-red-300 text-red-600 text-sm" onClick={() => setDeleteTarget(item)}>
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
