import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { crmJson } from '../services/crmApi';
import { getStoredAuthSession } from '../config/api';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import CRMLeadForm, { CRMLeadPayload } from './crm/CRMLeadForm';

type ToastTone = 'success' | 'error';
type ToastItem = { id: number; tone: ToastTone; message: string };
type LeadActionItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  actorName: string;
  actorInitials: string;
  actorAvatarUrl?: string;
};
type TabInfo = { id: string; name: string };
const normalizeCustomFieldKey = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const CRMLeadDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { leadId = '' } = useParams();
  const [lead, setLead] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [customTabs, setCustomTabs] = useState<TabInfo[]>([]);
  const [editingSection, setEditingSection] = useState<'none' | 'lead' | 'company'>('none');
  const [savingDetails, setSavingDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    leadTypeTab: 'HOT',
    status: 'ACTIVE',
    location: '',
    phoneNumber: '',
    linkedInProfile: '',
    company: '',
    designation: '',
    companyUrl: '',
    employeeCount: '',
    leadSource: '',
    industry: '',
    companyLinkedIn: '',
  });

  const [actions, setActions] = useState<LeadActionItem[]>([]);
  const [fullViewAction, setFullViewAction] = useState<LeadActionItem | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [editingCustomFields, setEditingCustomFields] = useState(false);
  const [customFieldsDraft, setCustomFieldsDraft] = useState<Record<string, string>>({});
  const [savingMeta, setSavingMeta] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<LeadActionItem | null>(null);
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<LeadActionItem | null>(null);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [deleteLeadConfirmOpen, setDeleteLeadConfirmOpen] = useState(false);
  const [deletingLead, setDeletingLead] = useState(false);
  const sessionEmployee = getStoredAuthSession()?.employee || {};
  const actorName = String(sessionEmployee?.empName || sessionEmployee?.name || 'User');
  const actorInitials =
    actorName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U';
  const actorAvatarUrl = String(
    sessionEmployee?.profileImage || sessionEmployee?.avatar || sessionEmployee?.photo || sessionEmployee?.profilePic || '',
  ).trim();
  const role = String(sessionEmployee?.role || '').toUpperCase();
  const canUseAllPeopleScope = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'TEAM_LEAD';
  const canEditLeadType = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const readCustomField = (source: any, key: string) => {
    const normalizedTarget = normalizeCustomFieldKey(key);
    const customFields = source?.customFields || {};
    const matchKey = Object.keys(customFields).find((entryKey) => normalizeCustomFieldKey(entryKey) === normalizedTarget);
    const raw = matchKey ? customFields[matchKey] : undefined;
    if (raw && typeof raw === 'object' && 'value' in raw) return String((raw as any).value ?? '');
    return String(raw ?? '');
  };
  const readCustomFieldByAliases = (source: any, keys: string[]) => {
    for (const key of keys) {
      const value = readCustomField(source, key);
      if (String(value || '').trim()) return value;
    }
    return '';
  };

  const pushToast = (message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };
  const getStoredActionsFromLead = (leadSource: any): LeadActionItem[] => {
    const customFields = leadSource?.customFields || {};
    const actionsRaw =
      customFields.action_items ??
      customFields.actionItems ??
      customFields.actions ??
      customFields.lead_actions;
    if (!Array.isArray(actionsRaw)) return [];
    return actionsRaw
      .map((entry: any) => {
        const title = String(entry?.title || '').trim();
        const description = String(entry?.description || '').trim();
        if (!title) return null;
        const createdAt = String(entry?.createdAt || new Date().toISOString());
        const updatedAt = String(entry?.updatedAt || createdAt);
        const actorNameValue = String(entry?.actorName || 'User').trim() || 'User';
        const actorInitialsValue =
          String(entry?.actorInitials || '')
            .trim()
            .toUpperCase() ||
          actorNameValue
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join('') ||
          'U';
        return {
          id: String(entry?.id || `${Date.now()}-${Math.random()}`),
          title,
          description,
          createdAt,
          updatedAt,
          edited: !!entry?.edited,
          actorName: actorNameValue,
          actorInitials: actorInitialsValue,
          actorAvatarUrl: String(entry?.actorAvatarUrl || '').trim(),
        } as LeadActionItem;
      })
      .filter(Boolean) as LeadActionItem[];
  };
  const persistActions = async (nextActions: LeadActionItem[]) => {
    if (!lead?._id) return;
    const mergedCustomFields = {
      ...(lead.customFields || {}),
      action_items: nextActions,
    };
    const updated = await crmJson<any>(`/crm/${lead._id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        customFields: mergedCustomFields,
      }),
    });
    setLead(updated);
    setActions(getStoredActionsFromLead(updated));
  };
  const initializeMetaDrafts = (leadSource: any) => {
    setNotesDraft(String(leadSource?.notes || ''));
    const draft: Record<string, string> = {};
    Object.entries(leadSource?.customFields || {}).forEach(([key, rawValue]) => {
      const normalized = normalizeCustomFieldKey(key);
      if (
        ['phone_number', 'linkedin_profile', 'lead_source', 'birthday', 'industry', 'address', 'company_url', 'company_linkedin', 'designation', 'location', 'action_items', 'actionitems', 'actions', 'lead_actions'].includes(normalized)
      ) {
        return;
      }
      const value = rawValue && typeof rawValue === 'object' && 'value' in (rawValue as any)
        ? String((rawValue as any).value ?? '')
        : String(rawValue ?? '');
      if (value.trim()) draft[key] = value;
    });
    setCustomFieldsDraft(draft);
  };
  const persistMeta = async (nextNotes: string, nextCustomFields: Record<string, string>) => {
    if (!lead?._id) return;
    setSavingMeta(true);
    try {
      const existingCustomFields = { ...(lead.customFields || {}) };
      Object.keys(existingCustomFields).forEach((key) => {
        const normalized = normalizeCustomFieldKey(key);
        if (
          ['phone_number', 'linkedin_profile', 'lead_source', 'birthday', 'industry', 'address', 'company_url', 'company_linkedin', 'designation', 'location', 'action_items', 'actionitems', 'actions', 'lead_actions'].includes(normalized)
        ) {
          return;
        }
        delete existingCustomFields[key];
      });
      const mergedCustomFields = {
        ...existingCustomFields,
        ...Object.fromEntries(
          Object.entries(nextCustomFields).map(([key, value]) => [key, String(value || '').trim()]),
        ),
      };
      const updated = await crmJson<any>(`/crm/${lead._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          notes: nextNotes,
          customFields: mergedCustomFields,
        }),
      });
      setLead(updated);
      initializeMetaDrafts(updated);
      setEditingNotes(false);
      setEditingCustomFields(false);
      pushToast('Notes and custom fields updated.');
    } catch (e: any) {
      pushToast(e.message || 'Failed to update notes/custom fields', 'error');
    } finally {
      setSavingMeta(false);
    }
  };
  const formatActionDateTime = (iso: string) => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const tabScopeParams = canUseAllPeopleScope ? '?allPeople=1' : '';
    Promise.all([
      crmJson<any>(`/crm/${leadId}`),
      crmJson<{ tabs?: TabInfo[] }>(`/crm/custom-tabs${tabScopeParams}`),
      crmJson<{ customCounts?: Array<{ name?: string; count?: number }> }>(`/crm/stats${tabScopeParams}`),
    ])
      .then(([data, tabsRes, statsRes]) => {
        setLead(data);
        setActions(getStoredActionsFromLead(data));
        initializeMetaDrafts(data);
        const tabRows = Array.isArray(tabsRes?.tabs) ? tabsRes.tabs : [];
        const fromTabs = tabRows
          .map((tab) => ({ id: String(tab.id || tab.name || ''), name: String(tab.name || '').trim() }))
          .filter((tab) => !!tab.name);
        const fromStats = Array.isArray(statsRes?.customCounts)
          ? statsRes.customCounts
              .map((entry) => String(entry?.name || '').trim())
              .filter(Boolean)
              .map((name) => ({ id: `stats-${name.toUpperCase()}`, name }))
          : [];
        const mergedByNormalized = new Map<string, TabInfo>();
        [...fromTabs, ...fromStats].forEach((tab) => {
          const key = tab.name.toUpperCase();
          if (!mergedByNormalized.has(key)) {
            mergedByNormalized.set(key, tab);
          }
        });
        setCustomTabs(Array.from(mergedByNormalized.values()));
      })
      .catch((e: any) => pushToast(e.message || 'Failed to load lead details', 'error'))
      .finally(() => setLoading(false));
  }, [canUseAllPeopleScope, leadId]);

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

  const fixedCustomFieldKeys = new Set([
    'phone_number',
    'linkedin_profile',
    'lead_source',
    'birthday',
    'industry',
    'address',
    'company_url',
    'company_linkedin',
    'designation',
    'location',
    'action_items',
    'actionitems',
    'actions',
    'lead_actions',
  ]);
  const customFieldEntries = Object.entries(lead?.customFields || {}).filter(([key, value]) => {
    if (fixedCustomFieldKeys.has(normalizeCustomFieldKey(key))) return false;
    if (value === undefined || value === null) return false;
    if (typeof value === 'object' && 'value' in (value as any)) return String((value as any).value ?? '').trim() !== '';
    return String(value).trim() !== '';
  });
  const notesValue = String(lead?.notes || '').trim();
  const hasNotesCard = notesValue.length > 0 && notesValue !== '-';
  const hasCustomFieldsCard = customFieldEntries.length > 0;

  const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead Details';
  const currentTabLabel =
    String(lead.leadType || '').toUpperCase() === 'CUSTOM'
      ? String(lead.customTabName || '').trim() || 'CUSTOM'
      : String(lead.leadType || '-');
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join('') || 'L';
  const linkedInProfile = readCustomField(lead, 'linkedin_profile') || '-';
  const companyLinkedIn = readCustomField(lead, 'company_linkedin') || '-';
  const renderClickableValue = (label: string, value: string) => {
    const safeValue = String(value || '').trim();
    if (!safeValue || safeValue === '-') return '-';
    if (label === 'Email') {
      return (
        <a className="text-blue-700 hover:underline break-all" href={`mailto:${safeValue}`}>
          {safeValue}
        </a>
      );
    }
    if (label === 'LinkedIn Profile' || label === 'Company LinkedIn') {
      const href = /^https?:\/\//i.test(safeValue) ? safeValue : `https://${safeValue}`;
      return (
        <a className="text-blue-700 hover:underline break-all" href={href} target="_blank" rel="noreferrer">
          {safeValue}
        </a>
      );
    }
    if (label === 'Company URL') {
      const href = /^https?:\/\//i.test(safeValue) ? safeValue : `https://${safeValue}`;
      return (
        <a className="text-blue-700 hover:underline break-all" href={href} target="_blank" rel="noreferrer">
          {safeValue}
        </a>
      );
    }
    return safeValue;
  };
  const initializeEditForm = (source: any) => {
    const sourceLeadType = String(source?.leadType || '').toUpperCase();
    const sourceCustomTab = String(source?.customTabName || '').trim();
    const next = {
      firstName: String(source?.firstName || ''),
      lastName: String(source?.lastName || ''),
      email: String(source?.email || ''),
      leadTypeTab: sourceLeadType === 'CUSTOM' ? sourceCustomTab || 'HOT' : sourceLeadType || 'HOT',
      status: String(source?.status || 'ACTIVE').toUpperCase() || 'ACTIVE',
      location: String(readCustomFieldByAliases(source, ['address', 'location']) || ''),
      phoneNumber: String(readCustomField(source, 'phone_number') || ''),
      linkedInProfile: String(readCustomField(source, 'linkedin_profile') || ''),
      company: String(source?.company || ''),
      designation: String(source?.position || readCustomField(source, 'designation') || ''),
      companyUrl: String(source?.url || readCustomField(source, 'company_url') || ''),
      employeeCount: source?.employeeCount === null || source?.employeeCount === undefined ? '' : String(source.employeeCount),
      leadSource: String(readCustomField(source, 'lead_source') || ''),
      industry: String(readCustomField(source, 'industry') || ''),
      companyLinkedIn: String(readCustomField(source, 'company_linkedin') || ''),
    };
    setEditForm(next);
    return next;
  };
  const handleSaveDetails = async () => {
    if (!lead?._id) return;
    const firstName = editForm.firstName.trim();
    if (!firstName) {
      pushToast('Lead first name is required.', 'error');
      return;
    }
    const mergedCustomFields = {
      ...(lead.customFields || {}),
      address: editForm.location.trim(),
      location: '',
      phone_number: editForm.phoneNumber.trim(),
      linkedin_profile: editForm.linkedInProfile.trim(),
      lead_source: editForm.leadSource.trim(),
      industry: editForm.industry.trim(),
      company_linkedin: editForm.companyLinkedIn.trim(),
      designation: editForm.designation.trim(),
      company_url: editForm.companyUrl.trim(),
    };
    const employeeCountValue = editForm.employeeCount.trim();
    setSavingDetails(true);
    try {
      const updated = await crmJson<any>(`/crm/${lead._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName,
          lastName: editForm.lastName.trim(),
          email: editForm.email.trim(),
          ...(canEditLeadType
            ? {
                leadType: ['HOT', 'WARM', 'COLD'].includes(String(editForm.leadTypeTab || '').toUpperCase())
                  ? String(editForm.leadTypeTab || '').toUpperCase()
                  : 'CUSTOM',
                customTabName: ['HOT', 'WARM', 'COLD'].includes(String(editForm.leadTypeTab || '').toUpperCase())
                  ? ''
                  : String(editForm.leadTypeTab || '').trim(),
              }
            : {}),
          status: String(editForm.status || 'ACTIVE').toUpperCase(),
          company: editForm.company.trim(),
          position: editForm.designation.trim(),
          url: editForm.companyUrl.trim(),
          employeeCount: employeeCountValue ? Number(employeeCountValue) : null,
          customFields: mergedCustomFields,
        }),
      });
      setLead(updated);
      setEditingSection('none');
      pushToast('Lead details updated.');
    } catch (e: any) {
      pushToast(e.message || 'Failed to update lead details', 'error');
    } finally {
      setSavingDetails(false);
    }
  };
  const tabOptions = (() => {
    const base = ['HOT', 'WARM', 'COLD'];
    const customNames = customTabs.map((tab) => tab.name).filter(Boolean);
    const currentCustomTab = String(lead.customTabName || '').trim();
    const merged = [...base, ...customNames];
    if (String(lead.leadType || '').toUpperCase() === 'CUSTOM' && currentCustomTab) {
      const exists = merged.some((name) => name.trim().toUpperCase() === currentCustomTab.toUpperCase());
      if (!exists) merged.push(currentCustomTab);
    }
    return merged;
  })();
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
  const formActiveTab =
    String(lead.leadType || '').toUpperCase() === 'CUSTOM'
      ? String(lead.customTabName || 'HOT').trim() || 'HOT'
      : String(lead.leadType || 'HOT');
  const openLeadFormModal = () => {
    setEditingSection('none');
    setLeadFormOpen(true);
  };

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
    </div>
  );
};

export default CRMLeadDetailPage;
