import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CRMStatsCards from './crm/CRMStatsCards';
import CRMTable from './crm/CRMTable';
import CRMLeadForm, { CRMLeadPayload } from './crm/CRMLeadForm';
import CRMImportModal from './crm/CRMImportModal';
import CRMExportButton from './crm/CRMExportButton';
import { ChevronDown } from 'lucide-react';
import { getStoredAuthSession } from '../config/api';
import { crmJson, crmUploadFile } from '../services/crmApi';

const baseTabs = ['HOT', 'WARM', 'COLD'];
const RESERVED_TAB_NAMES = new Set(baseTabs);
const PAGE_SIZE = 20;

type ConfirmAction = 'deleteOne' | 'deleteBulk' | 'deleteAll' | null;
type TabInfo = { id: string; name: string };
type ToastTone = 'success' | 'error';
type ToastItem = { id: number; tone: ToastTone; message: string };
type StaffOption = { id: string; empId: string; name: string; role: string };
type LeadActionItem = { id: string; title: string; description: string };

const CRMPage: React.FC = () => {
  const navigate = useNavigate();
  const sessionEmployee = getStoredAuthSession()?.employee || {};
  const role = String(sessionEmployee?.role || '');
  const currentUserRoleLabel = role === 'TEAM_LEAD' ? 'TL' : role === 'ADMIN' || role === 'SUPER_ADMIN' ? 'ADMIN' : 'EMP';
  const currentUserId = String(sessionEmployee?._id || '');
  const [stats, setStats] = useState({
    total: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    converted: 0,
    thisMonth: 0,
    customCounts: [] as Array<{ name: string; count: number }>,
  });
  const [activeTab, setActiveTab] = useState('HOT');
  const [customTabs, setCustomTabs] = useState<TabInfo[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [personFilterId, setPersonFilterId] = useState('');
  const [personDropdownOpen, setPersonDropdownOpen] = useState(false);
  const [personSearch, setPersonSearch] = useState('');
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [createTabOpen, setCreateTabOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveDestination, setMoveDestination] = useState('HOT');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmTargetLead, setConfirmTargetLead] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [deletingTab, setDeletingTab] = useState<TabInfo | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const tabs = useMemo(() => [...baseTabs, ...customTabs.map((tab) => tab.name)], [customTabs]);
  const canUseRoleFilters = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'TEAM_LEAD';
  const peopleOptions = useMemo(
    () =>
      staffOptions
        .filter((member) => member.role === 'EMPLOYEE' || member.role === 'TEAM_LEAD')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staffOptions],
  );
  const selectedPerson = useMemo(
    () => peopleOptions.find((member) => member.id === personFilterId) || null,
    [peopleOptions, personFilterId],
  );
  const filteredPeopleOptions = useMemo(() => {
    const q = personSearch.trim().toLowerCase();
    if (!q) return peopleOptions;
    return peopleOptions.filter((member) =>
      `${member.name} ${member.empId} ${member.role}`.toLowerCase().includes(q),
    );
  }, [peopleOptions, personSearch]);
  const customTabMap = useMemo(() => {
    const map: Record<string, TabInfo> = {};
    for (const tab of customTabs) map[tab.name] = tab;
    return map;
  }, [customTabs]);

  const pushToast = (message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  };

  const load = async () => {
    setPageLoading(true);
    const leadType = baseTabs.includes(activeTab) ? activeTab : 'CUSTOM';
    const customTabName = baseTabs.includes(activeTab) ? '' : activeTab;
    const params = new URLSearchParams({
      q: search,
      page: String(page),
      limit: String(PAGE_SIZE),
      leadType,
      ...(customTabName ? { customTabName } : {}),
      ...(selectedPerson?.role === 'TEAM_LEAD' ? { teamLeadId: selectedPerson.id } : {}),
      ...(selectedPerson?.role !== 'TEAM_LEAD' && selectedPerson?.id ? { employeeId: selectedPerson.id } : {}),
    });
    const [statsRes, tabsRes, listRes] = await Promise.all([
      crmJson<any>('/crm/stats'),
      crmJson<any>('/crm/custom-tabs'),
      crmJson<any>(`/crm?${params.toString()}`),
    ]);
    setStats(statsRes);
    setCustomTabs(Array.isArray(tabsRes.tabs) ? tabsRes.tabs : []);
    setLeads(listRes.items || []);
    setTotal(Number(listRes.total || 0));
    setPageLoading(false);
  };

  useEffect(() => {
    load().catch((e) => {
      pushToast(e.message || 'Failed to load CRM data', 'error');
      setPageLoading(false);
    });
  }, [activeTab, page, search, personFilterId]);


  useEffect(() => {
    if (!canUseRoleFilters) return;
    crmJson<any>('/employees')
      .then((rows) => {
        const normalized = Array.isArray(rows)
          ? rows.map((row: any) => ({
              id: String(row._id || ''),
              empId: String(row.empId || ''),
              name: String(row.empName || 'Unknown'),
              role: String(row.role || ''),
            }))
          : [];
        setStaffOptions(normalized.filter((row: StaffOption) => !!row.id));
      })
      .catch(() => {
        setStaffOptions([]);
      });
  }, [canUseRoleFilters]);

  const currentCustomTab = baseTabs.includes(activeTab) ? '' : activeTab;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageWindowStart = Math.max(1, page - 2);
  const pageWindowEnd = Math.min(totalPages, page + 2);
  const pageNumbers = Array.from({ length: Math.max(0, pageWindowEnd - pageWindowStart + 1) }, (_, idx) => pageWindowStart + idx);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-300 bg-gradient-to-r from-slate-50 via-white to-slate-100 px-6 py-5 text-slate-900 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">CRM Command Center</h1>
        <p className="text-sm text-slate-600 mt-1">Manage hot, warm, cold, and custom leads with fast actions and clean workflows.</p>
      </div>
      {leadFormOpen ? (
        <CRMLeadForm
          mode={editingLead ? 'edit' : 'create'}
          initialData={editingLead || undefined}
          activeTab={activeTab}
          onCancel={() => { setLeadFormOpen(false); setEditingLead(null); }}
          onSubmit={async (payload: CRMLeadPayload) => {
            const method = editingLead ? 'PATCH' : 'POST';
            const path = editingLead ? `/crm/${editingLead._id}` : '/crm';
            await crmJson(path, { method, body: JSON.stringify(payload) });
            setLeadFormOpen(false);
            setEditingLead(null);
            pushToast(editingLead ? 'Lead updated successfully.' : 'Lead created successfully.');
            load();
          }}
          onError={(message) => pushToast(message, 'error')}
        />
      ) : (
      <>
      <CRMStatsCards stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 items-start">
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden sticky top-4">
        <aside className="bg-slate-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Lead Tabs</div>
          <div className="space-y-2">
            {tabs.map((tab) => (
              <div key={tab} className={`w-full inline-flex items-center justify-between rounded-lg border ${tab === activeTab ? 'bg-brand-red text-white border-brand-red' : 'bg-white border-slate-300 text-slate-700'}`}>
                <button className="px-3 py-2 text-sm text-left flex-1" onClick={() => { setPage(1); setActiveTab(tab); }}>
                  {tab}
                </button>
                {!baseTabs.includes(tab) && (
                  <button
                    className={`pr-3 text-sm ${tab === activeTab ? 'text-white/90 hover:text-white' : 'text-red-600 hover:text-red-700'}`}
                    onClick={() => setDeletingTab(customTabMap[tab] || null)}
                    title="Delete Custom Tab"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
            <button
              className="w-full px-3 py-2 rounded-lg border border-dashed border-slate-400 text-slate-700 text-sm text-left hover:bg-white"
              onClick={() => setCreateTabOpen(true)}
            >
              + Create Custom Tab
            </button>
          </div>
        </aside>
      </div>

      <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Lead Controls</h2>
          <span className="text-xs text-slate-500">Active Tab: <span className="font-semibold text-slate-700">{activeTab}</span></span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[300px] flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Search Leads</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Search by name, email, company, position..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          </div>
          <CRMExportButton leadType={activeTab} customTabName={currentCustomTab} />
          <button className="px-4 py-2 rounded-lg border border-slate-300 bg-white" onClick={() => setImportOpen(true)}>Import Excel</button>
          <button className="px-4 py-2 rounded-lg bg-brand-red text-white" onClick={() => { setEditingLead(null); setLeadFormOpen(true); }}>Add Lead</button>
        </div>
        {canUseRoleFilters && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Role Filters</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="relative">
                  <button
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-left text-sm text-slate-700 flex items-center justify-between"
                    onClick={() => setPersonDropdownOpen((open) => !open)}
                  >
                    <span>
                      {selectedPerson
                        ? `${selectedPerson.name} (${selectedPerson.role === 'TEAM_LEAD' ? 'TL' : selectedPerson.role === 'ADMIN' || selectedPerson.role === 'SUPER_ADMIN' ? 'ADMIN' : 'EMP'})`
                        : 'All People'}
                    </span>
                    <ChevronDown size={16} className="text-slate-500" />
                  </button>
                  {personDropdownOpen && (
                    <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl p-2">
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-2"
                        placeholder="Search people..."
                        value={personSearch}
                        onChange={(e) => setPersonSearch(e.target.value)}
                      />
                      <div className="max-h-56 overflow-y-auto">
                        <button
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-sm"
                          onClick={() => {
                            setPage(1);
                            setPersonFilterId('');
                            setPersonDropdownOpen(false);
                          }}
                        >
                          All People
                        </button>
                        {currentUserId ? (
                          <button
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-sm"
                            onClick={() => {
                              setPage(1);
                              setPersonFilterId(currentUserId);
                              setPersonDropdownOpen(false);
                            }}
                          >
                            You (My Leads) <span className="text-xs text-slate-500">({currentUserRoleLabel})</span>
                          </button>
                        ) : null}
                        {filteredPeopleOptions.map((member) => (
                          <button
                            key={member.id}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-sm"
                            onClick={() => {
                              setPage(1);
                              setPersonFilterId(member.id);
                              setPersonDropdownOpen(false);
                            }}
                          >
                            {member.name} <span className="text-xs text-slate-500">({member.role === 'TEAM_LEAD' ? 'TL' : 'EMP'})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <button
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
                  onClick={() => {
                    setPersonFilterId('');
                    setPersonSearch('');
                    setPersonDropdownOpen(false);
                    setPage(1);
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Bulk Actions</h3>
        <div className="flex gap-2 flex-wrap">
        <button
          className="px-4 py-2 rounded-lg border border-red-300 text-red-600 bg-red-50 disabled:opacity-50"
          disabled={!selectedIds.length || actionLoading}
          onClick={() => setConfirmAction('deleteBulk')}
        >
          {actionLoading && confirmAction === 'deleteBulk' ? 'Deleting...' : 'Bulk Delete'}
        </button>
        <button
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white disabled:opacity-50"
          disabled={!selectedIds.length || actionLoading}
          onClick={() => { setMoveDestination(activeTab); setMoveModalOpen(true); }}
        >
          {actionLoading && moveModalOpen ? 'Moving...' : 'Bulk Move'}
        </button>
        <button
          className="px-4 py-2 rounded-lg border border-red-400 text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          disabled={actionLoading || total === 0}
          onClick={() => setConfirmAction('deleteAll')}
        >
          {actionLoading && confirmAction === 'deleteAll' ? 'Deleting All...' : 'Delete All'}
        </button>
        </div>
      </div>

      {pageLoading ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-500">Loading leads...</div>
      ) : (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4">
          <CRMTable
            items={leads}
            selectedIds={selectedIds}
            deletingId={deletingId}
            onOpen={(item) => navigate(`/crm/lead/${item._id}`)}
            onToggleSelect={(id) => setSelectedIds(prev => (prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]))}
            onEdit={(item) => { setEditingLead(item); setLeadFormOpen(true); }}
            onDelete={(item) => {
              setConfirmTargetLead(item);
              setConfirmAction('deleteOne');
            }}
          />
        </div>
      </div>
      )}

      <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-800">{leads.length}</span> records (page <span className="font-semibold text-slate-800">{page}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>) - 20 per page
        </div>
        <div className="flex gap-2 items-center">
          <button className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(v => Math.max(1, v - 1))}>Prev</button>
          {pageNumbers.map((pageNo) => (
            <button
              key={pageNo}
              className={`px-3 py-1.5 rounded border text-sm ${pageNo === page ? 'border-brand-red bg-brand-red text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setPage(pageNo)}
            >
              {pageNo}
            </button>
          ))}
          <button className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage(v => Math.min(totalPages, v + 1))}>Next</button>
        </div>
      </div>
      </div>
      </div>

      <CRMImportModal
        isOpen={importOpen}
        activeTab={activeTab}
        onClose={() => setImportOpen(false)}
        onImport={async (file, duplicateStrategy) => {
          const form = new FormData();
          const leadType = baseTabs.includes(activeTab) ? activeTab : 'CUSTOM';
          form.append('file', file);
          form.append('leadType', leadType);
          if (leadType === 'CUSTOM') form.append('customTabName', activeTab);
          form.append('duplicateStrategy', duplicateStrategy);
          await crmUploadFile('/crm/import', form);
          setImportOpen(false);
          pushToast('Excel imported successfully.');
          load();
        }}
      />
      {createTabOpen && (
        <div className="fixed inset-0 z-[110] bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200"><h3 className="text-lg font-semibold text-slate-800">Create Custom Tab</h3></div>
            <div className="p-6">
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="e.g. Follow Up" value={newTabName} onChange={(e) => setNewTabName(e.target.value)} />
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={() => setCreateTabOpen(false)}>Cancel</button>
              <button
                className="px-4 py-2 rounded-lg bg-brand-red text-white"
                onClick={() => {
                  const tab = newTabName.trim();
                  if (!tab) {
                    pushToast('Tab name is required.', 'error');
                    return;
                  }
                  if (RESERVED_TAB_NAMES.has(tab.toUpperCase())) {
                    pushToast('Name reserved for default tabs.', 'error');
                    return;
                  }
                  setActionLoading(true);
                  crmJson<TabInfo>('/crm/custom-tabs', { method: 'POST', body: JSON.stringify({ name: tab }) })
                    .then((created) => {
                      setCustomTabs((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
                      setActiveTab(created.name);
                      setNewTabName('');
                      setCreateTabOpen(false);
                      pushToast('Custom tab created.');
                    })
                    .catch((e: any) => pushToast(e.message || 'Failed to create custom tab', 'error'))
                    .finally(() => setActionLoading(false));
                }}
              >
                {actionLoading ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
      {moveModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200"><h3 className="text-lg font-semibold text-slate-800">Move Selected Leads</h3></div>
            <div className="p-6">
              <select className="rounded-lg border border-slate-300 px-3 py-2 w-full" value={moveDestination} onChange={(e) => setMoveDestination(e.target.value)}>
                {tabs.map(tab => <option key={tab} value={tab}>{tab}</option>)}
              </select>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={() => setMoveModalOpen(false)}>Cancel</button>
              <button
                className="px-4 py-2 rounded-lg bg-brand-red text-white disabled:opacity-60"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    const normalized = moveDestination.toUpperCase();
                    const isBase = baseTabs.includes(normalized);
                    await crmJson('/crm/bulk-action', {
                      method: 'POST',
                      body: JSON.stringify({
                        action: 'MOVE',
                        leadIds: selectedIds,
                        targetLeadType: isBase ? normalized : 'CUSTOM',
                        customTabName: isBase ? '' : moveDestination,
                      }),
                    });
                    setSelectedIds([]);
                    setMoveModalOpen(false);
                    await load();
                  } catch (e: any) {
                    pushToast(e.message || 'Move failed', 'error');
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                {actionLoading ? 'Processing...' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmAction && (
        <div className="fixed inset-0 z-[110] bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200"><h3 className="text-lg font-semibold text-slate-800">Confirm Delete</h3></div>
            <div className="p-6 text-slate-700">
              {confirmAction === 'deleteOne' && 'Delete this lead permanently?'}
              {confirmAction === 'deleteBulk' && `Delete ${selectedIds.length} selected leads permanently?`}
              {confirmAction === 'deleteAll' && `Delete all leads in ${activeTab} tab?`}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={() => { setConfirmAction(null); setConfirmTargetLead(null); }}>No</button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-60"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    if (confirmAction === 'deleteOne' && confirmTargetLead?._id) {
                      setDeletingId(confirmTargetLead._id);
                      await crmJson(`/crm/${confirmTargetLead._id}`, { method: 'DELETE' });
                      pushToast('Lead deleted.');
                    }
                    if (confirmAction === 'deleteBulk') {
                      await crmJson('/crm/bulk-action', { method: 'POST', body: JSON.stringify({ action: 'DELETE', leadIds: selectedIds }) });
                      setSelectedIds([]);
                      pushToast('Selected leads deleted.');
                    }
                    if (confirmAction === 'deleteAll') {
                      const leadType = baseTabs.includes(activeTab) ? activeTab : 'CUSTOM';
                      await crmJson('/crm/delete-all-in-tab', {
                        method: 'POST',
                        body: JSON.stringify({ leadType, customTabName: leadType === 'CUSTOM' ? activeTab : '' }),
                      });
                      setSelectedIds([]);
                      pushToast(`All leads deleted from ${activeTab}.`);
                    }
                    setConfirmAction(null);
                    setConfirmTargetLead(null);
                    await load();
                  } catch (e: any) {
                    pushToast(e.message || 'Delete failed', 'error');
                  } finally {
                    setDeletingId('');
                    setActionLoading(false);
                  }
                }}
              >
                {actionLoading ? 'Processing...' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
      {deletingTab && (
        <div className="fixed inset-0 z-[110] bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200"><h3 className="text-lg font-semibold text-slate-800">Delete Custom Tab</h3></div>
            <div className="p-6 text-slate-700">Delete tab <span className="font-semibold">{deletingTab.name}</span> and all leads inside it?</div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={() => setDeletingTab(null)}>Cancel</button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-60"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await crmJson(`/crm/custom-tabs/${deletingTab.id}`, { method: 'DELETE' });
                    if (activeTab === deletingTab.name) setActiveTab('HOT');
                    setDeletingTab(null);
                    pushToast('Custom tab deleted.');
                    await load();
                  } catch (e: any) {
                    pushToast(e.message || 'Failed to delete custom tab', 'error');
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                {actionLoading ? 'Deleting...' : 'Delete Tab'}
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
            <p
              className={`text-xs font-semibold uppercase tracking-[0.14em] ${
                toast.tone === 'success' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {toast.tone === 'success' ? 'Success' : 'Error'}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {toast.message}
            </p>
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  );
};

export default CRMPage;
