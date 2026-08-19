import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { crmJson } from '../services/crmApi';
import { getStoredAuthSession } from '../config/api';
import { getUserTimeZone } from '../utils/timezone';
import CRMLeadDetailPanels from '../components/crm/CRMLeadDetailPanels';

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
      timeZone: getUserTimeZone(),
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

  if (loading && !lead) {
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


  return <CRMLeadDetailPanels ctx={{actionDescription, actionModalOpen, actionTitle, actions, actorAvatarUrl, actorInitials, actorName, canEditLeadType, canUseAllPeopleScope, companyLinkedIn, currentTabLabel, customFieldEntries, customFieldsDraft, customTabs, deleteLeadConfirmOpen, deleteTarget, deletingLead, editForm, editingAction, editingCustomFields, editingNotes, editingSection, fixedCustomFieldKeys, formActiveTab, formatActionDateTime, fullName, fullViewAction, getStoredActionsFromLead, handleSaveDetails, hasCustomFieldsCard, hasNotesCard, initializeEditForm, initializeMetaDrafts, initials, lead, leadFormOpen, leadTypeTone, linkedInProfile, loading, navigate, normalizeCustomFieldKey, notesDraft, notesValue, openLeadFormModal, persistActions, persistMeta, pushToast, readCustomField, readCustomFieldByAliases, renderClickableValue, role, savingDetails, savingMeta, sessionEmployee, setActionDescription, setActionModalOpen, setActionTitle, setActions, setCustomFieldsDraft, setCustomTabs, setDeleteLeadConfirmOpen, setDeleteTarget, setDeletingLead, setEditForm, setEditingAction, setEditingCustomFields, setEditingNotes, setEditingSection, setFullViewAction, setLead, setLeadFormOpen, setLoading, setNotesDraft, setSavingDetails, setSavingMeta, setToasts, statusTone, tabOptions, toasts}} />;
};

export default CRMLeadDetailPage;
