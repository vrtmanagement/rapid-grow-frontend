import React from 'react';
import { ArrowDownToLine, ArrowRightLeft, ChevronDown, FilterX, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import CRMStatsCards from '../../views/crm/CRMStatsCards';
import CRMTable from '../../views/crm/CRMTable';
import CRMLeadForm, { CRMLeadPayload } from '../../views/crm/CRMLeadForm';
import CRMImportModal from '../../views/crm/CRMImportModal';
import CRMExportButton from '../../views/crm/CRMExportButton';
import CRMDummyDownloadButton from '../../views/crm/CRMDummyDownloadButton';
import { crmJson, crmUploadFile } from '../../services/crmApi';

type TabInfo = { id: string; name: string };

type CRMPagePanelsProps = { ctx: Record<string, any> };

const CRMPagePanels: React.FC<CRMPagePanelsProps> = ({ ctx }) => {
  const {
    CRM_ACTIVE_TAB_STORAGE_KEY,
    CRM_ROLE_FILTER_STORAGE_KEY,
    PAGE_SIZE,
    PAGE_SIZE_OPTIONS,
    RESERVED_TAB_NAMES,
    actionLoading,
    activeTab,
    baseTabs,
    buildListQuery,
    canUseRoleFilters,
    cardFilter,
    closeDeleteConfirm,
    confirmAction,
    confirmDeleteTab,
    confirmTargetLead,
    createTabOpen,
    currentCustomTab,
    currentUserId,
    currentUserRoleLabel,
    customTabMap,
    customTabs,
    debouncedSearch,
    deletingHiddenCustomLeads,
    deletingId,
    editingLead,
    filteredPeopleOptions,
    getStoredRoleFilter,
    hiddenCustomLeadsCount,
    importOpen,
    isSearchPending,
    latestLoadRequestRef,
    leadFormOpen,
    leads,
    leftTabsMenuRef,
    loadAll,
    loadLeads,
    loadMeta,
    moveDestination,
    moveDropdownOpen,
    moveModalOpen,
    navigate,
    newTabName,
    openLeftTabMenu,
    page,
    pageLoading,
    pageNumbers,
    pageSize,
    pageWindowEnd,
    pageWindowStart,
    peopleOptions,
    personDropdownOpen,
    personFilterId,
    personFilterInitialized,
    personParams,
    personSearch,
    pushToast,
    renamingTab,
    renamingTabName,
    role,
    roleFilterDropdownRef,
    search,
    selectedIds,
    selectedPerson,
    selectedPersonLabel,
    selectedScopePerson,
    sessionEmployee,
    setActionLoading,
    setActiveTab,
    setCardFilter,
    setConfirmAction,
    setConfirmDeleteTab,
    setConfirmTargetLead,
    setCreateTabOpen,
    setCustomTabs,
    setDeletingHiddenCustomLeads,
    setDeletingId,
    setEditingLead,
    setImportOpen,
    setLeadFormOpen,
    setLeads,
    setMoveDestination,
    setMoveDropdownOpen,
    setMoveModalOpen,
    setNewTabName,
    setOpenLeftTabMenu,
    setPage,
    setPageLoading,
    setPageSize,
    setPersonDropdownOpen,
    setPersonFilterId,
    setPersonFilterInitialized,
    setPersonSearch,
    setRenamingTab,
    setRenamingTabName,
    setSearch,
    setSelectedIds,
    setStaffOptions,
    setStats,
    setTabsHydrated,
    setToasts,
    setTotal,
    staffOptions,
    stats,
    storedRoleFilter,
    syncActiveTabCount,
    tabs,
    tabsHydrated,
    toasts,
    total,
    totalPages,
    visibleCustomCount,
  } = ctx;

  return (
  <div className="-mt-10 -ml-10 space-y-4 bg-slate-50/70 p-4 pr-5">
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-slate-900">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">CRM</h1>
        <p className="mt-1 text-sm text-slate-600">Action-focused lead list with tabs, follow-ups, and quick communication.</p>
      </div>
    </div>
    <>
    <div className="grid grid-cols-1 lg:grid-cols-[236px_1fr] gap-4 items-start">
    <div ref={leftTabsMenuRef} className="rounded-lg bg-white border border-slate-200 overflow-visible sticky top-4 z-20">
      <aside className="p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lead Tabs</div>
          <button
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            onClick={() => setCreateTabOpen(true)}
            title="Create custom tab"
            aria-label="Create custom tab"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {tabs.map((tab) => (
            <div key={tab} className={`group relative w-full inline-flex items-center justify-between rounded-lg border transition-all duration-200 ${tab === activeTab ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}>
              <button className="flex-1 px-3 py-2 text-left text-sm" onClick={() => { setPage(1); setCardFilter({ type: 'none' }); setActiveTab(tab); }}>
                <span className="block truncate font-medium">{tab}</span>
              </button>
              {!baseTabs.includes(tab) ? (
                <>
                  <button
                    className={`absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md transition-all ${
                      tab === activeTab
                        ? 'opacity-100 text-white/90 hover:text-white hover:bg-white/15'
                        : 'opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    onClick={() => setOpenLeftTabMenu((prev) => (prev === tab ? '' : tab))}
                    title="Tab actions"
                  >
                    <MoreVertical size={15} />
                  </button>
                  {openLeftTabMenu === tab ? (
                    <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-[220] w-44 rounded-lg border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.20)] p-1">
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 border-l border-b border-slate-200 bg-white" />
                      <button
                        className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-indigo-50 text-indigo-700 disabled:opacity-60"
                        disabled={actionLoading}
                        onClick={() => {
                          setOpenLeftTabMenu('');
                          const target = customTabMap[tab] || null;
                          setRenamingTab(target);
                          setRenamingTabName(target?.name || '');
                        }}
                      >
                        Rename Tab
                      </button>
                      <button
                        className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-rose-50 text-rose-700 disabled:opacity-60"
                        disabled={actionLoading}
                        onClick={() => {
                          setOpenLeftTabMenu('');
                          const targetTab = customTabMap[tab] || null;
                          if (!targetTab) return;
                          setConfirmDeleteTab(targetTab);
                          setConfirmAction('deleteTab');
                        }}
                      >
                        Delete Tab
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ))}
        </div>
      </aside>
    </div>

    <div className="min-w-0 w-full space-y-4">
    <div className="rounded-lg bg-white border border-slate-200 p-4 space-y-4">
      <CRMStatsCards
        stats={stats}
        onCardClick={(card) => {
          setPage(1);
          if (card.type === 'custom' && card.customTabName) {
            setActiveTab(card.customTabName);
            setCardFilter({ type: 'custom', customTabName: card.customTabName });
            return;
          }
          setCardFilter({ type: card.type });
        }}
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[300px] flex-1">
          <label className="text-xs text-slate-500 mb-1 block">Search Leads</label>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-10 text-sm transition-all focus:border-brand-red/60 focus:ring-2 focus:ring-brand-red/20"
              placeholder="Search by name, email, company, position..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
            {(isSearchPending || (pageLoading && debouncedSearch.trim())) && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                Searching...
              </span>
            )}
          </div>
        </div>
        <CRMExportButton leadType={activeTab} customTabName={currentCustomTab} />
        <CRMDummyDownloadButton onError={(message) => pushToast(message, 'error')} />
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50" onClick={() => setImportOpen(true)}>
          <ArrowDownToLine size={15} />
          Import Excel
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white shadow-sm transition-colors hover:bg-slate-800" onClick={() => { setEditingLead(null); setLeadFormOpen(true); }}>
          <Plus size={15} />
          Add Lead
        </button>
      </div>
      {canUseRoleFilters && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Role Filters</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div ref={roleFilterDropdownRef} className="relative">
                <button
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                    selectedScopePerson
                      ? 'border-slate-300 bg-white text-slate-900 hover:border-slate-400'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                  onClick={() => setPersonDropdownOpen((open) => !open)}
                >
                  <span>
                    {selectedPersonLabel}
                  </span>
                  <ChevronDown size={16} className="text-slate-500" />
                </button>
                {personDropdownOpen && (
                  <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-2xl p-2">
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-2 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red/60 transition-all"
                      placeholder="Search people..."
                      value={personSearch}
                      onChange={(e) => setPersonSearch(e.target.value)}
                    />
                    <div className="max-h-56 overflow-y-auto">
                      <button
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          !personFilterId
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                        onClick={() => {
                          setPage(1);
                          setPersonFilterId('');
                          setPersonFilterInitialized(true);
                          setPersonSearch('');
                          setPersonDropdownOpen(false);
                        }}
                      >
                        All People
                      </button>
                      {currentUserId ? (
                        <button
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            personFilterId === currentUserId
                              ? 'bg-slate-900 text-white font-semibold'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                          onClick={() => {
                            setPage(1);
                            setPersonFilterId(currentUserId);
                            setPersonFilterInitialized(true);
                            setPersonSearch('');
                            setPersonDropdownOpen(false);
                          }}
                        >
                          You (My Leads) <span className="text-xs text-slate-500">({currentUserRoleLabel})</span>
                        </button>
                      ) : null}
                      {filteredPeopleOptions.map((member) => (
                        <button
                          key={member.id}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            personFilterId === member.id
                              ? 'bg-slate-900 text-white font-semibold'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                          onClick={() => {
                            setPage(1);
                            setPersonFilterId(member.id);
                            setPersonFilterInitialized(true);
                            setPersonSearch('');
                            setPersonDropdownOpen(false);
                          }}
                        >
                          {member.name}{' '}
                          <span className="text-xs text-slate-500">
                            ({member.role === 'TEAM_LEAD' ? 'TL' : member.role === 'ADMIN' || member.role === 'SUPER_ADMIN' ? 'ADMIN' : 'EMP'})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50"
                onClick={() => {
                  setPersonFilterId('');
                  setPersonSearch('');
                  setPersonDropdownOpen(false);
                  setPersonFilterInitialized(true);
                  setPage(1);
                }}
              >
                <FilterX size={15} />
                Clear Filters
              </button>
              {hiddenCustomLeadsCount > 0 ? (
                <button
                  className="ml-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
                  onClick={() => setConfirmAction('deleteHiddenCustom')}
                  disabled={deletingHiddenCustomLeads}
                >
                  {deletingHiddenCustomLeads ? 'Deleting...' : `Delete Hidden Custom Data (${hiddenCustomLeadsCount})`}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>

    <div className="rounded-lg bg-white border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700">Bulk Actions</h3>
        <span className="text-xs text-slate-500">{selectedIds.length} selected</span>
      </div>
      <div className="flex gap-2 flex-wrap">
      <button
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
        disabled={!selectedIds.length || actionLoading}
        onClick={() => setConfirmAction('deleteBulk')}
      >
        <Trash2 size={15} />
        {actionLoading && confirmAction === 'deleteBulk' ? 'Deleting...' : 'Bulk Delete'}
      </button>
      <button
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
        disabled={!selectedIds.length || actionLoading}
        onClick={() => { setMoveDestination(activeTab); setMoveModalOpen(true); }}
      >
        <ArrowRightLeft size={15} />
        {actionLoading && moveModalOpen ? 'Moving...' : 'Bulk Move'}
      </button>
      <button
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-400 text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 transition-all disabled:opacity-50"
        disabled={actionLoading || total === 0}
        onClick={() => setConfirmAction('deleteAll')}
      >
        <Trash2 size={15} />
        {actionLoading && confirmAction === 'deleteAll' ? 'Deleting All...' : 'Delete All'}
      </button>
      </div>
    </div>

    {pageLoading && leads.length === 0 ? (
      <div className="rounded-lg bg-white border border-slate-200 p-8 text-center text-slate-500">Loading leads...</div>
    ) : (
    <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
        <CRMTable
          items={leads}
          rowStart={(page - 1) * pageSize}
          selectedIds={selectedIds}
          onOpen={(item) => navigate(`/crm/lead/${item._id}`)}
          onToggleSelect={(id) => setSelectedIds(prev => (prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]))}
        />
    </div>
    )}

    <div className="rounded-lg bg-white border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-slate-600">
        Showing <span className="font-semibold text-slate-800">{leads.length}</span> records (page <span className="font-semibold text-slate-800">{page}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>) - {pageSize} per page
      </div>
      <div className="flex gap-2 items-center">
        <label htmlFor="crm-page-size" className="text-xs text-slate-500">Rows</label>
        <select
          id="crm-page-size"
          className="px-2 py-1.5 rounded border border-slate-300 bg-white text-sm text-slate-700"
          value={pageSize}
          onChange={(e) => {
            const next = Number(e.target.value || PAGE_SIZE);
            setPageSize(next);
            setPage(1);
          }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <button className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(v => Math.max(1, v - 1))}>Prev</button>
        {pageNumbers.map((pageNo) => (
          <button
            key={pageNo}
            className={`px-3 py-1.5 rounded border text-sm transition-all duration-200 ${pageNo === page ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
            onClick={() => setPage(pageNo)}
          >
            {pageNo}
          </button>
        ))}
        <button className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage(v => Math.min(totalPages, v + 1))}>Next</button>
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
        loadAll();
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
          <div className="p-6 relative">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">Target Tab</label>
            <button
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 bg-gradient-to-r from-white to-slate-50 text-left text-sm text-slate-700 flex items-center justify-between hover:border-brand-red/40 hover:shadow-sm transition-all"
              onClick={() => setMoveDropdownOpen((open) => !open)}
            >
              <span className="font-medium">{moveDestination}</span>
              <ChevronDown size={16} className={`text-slate-500 transition-transform ${moveDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {moveDropdownOpen ? (
              <div className="absolute z-40 mt-2 w-[calc(100%-3rem)] rounded-xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] p-2 max-h-56 overflow-y-auto">
                {tabs.map((tab) => {
                  const isActive = tab === moveDestination;
                  return (
                    <button
                      key={tab}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-brand-red/10 text-brand-red font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                      onClick={() => {
                        setMoveDestination(tab);
                        setMoveDropdownOpen(false);
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={() => { setMoveDropdownOpen(false); setMoveModalOpen(false); }}>Cancel</button>
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
                  await loadAll();
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
            {confirmAction === 'deleteHiddenCustom' &&
              `Delete ${hiddenCustomLeadsCount} hidden custom leads permanently?`}
            {confirmAction === 'deleteTab' && confirmDeleteTab ? (
              <>
                Delete tab <span className="font-semibold">{confirmDeleteTab.name}</span> and all leads in it?
                This cannot be undone.
              </>
            ) : null}
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-lg border border-slate-300"
              onClick={closeDeleteConfirm}
              disabled={actionLoading}
            >
              No
            </button>
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
                  if (confirmAction === 'deleteHiddenCustom') {
                    setDeletingHiddenCustomLeads(true);
                    const result = await crmJson<{ deletedCount?: number }>('/crm/delete-all-custom', {
                      method: 'POST',
                      body: JSON.stringify(personParams),
                    });
                    setSelectedIds([]);
                    setPage(1);
                    pushToast(`${Number(result?.deletedCount || 0)} hidden custom leads deleted.`);
                    setDeletingHiddenCustomLeads(false);
                  }
                  if (confirmAction === 'deleteTab' && confirmDeleteTab) {
                    await crmJson(`/crm/custom-tabs/${confirmDeleteTab.id}`, { method: 'DELETE' });
                    if (activeTab === confirmDeleteTab.name) setActiveTab('HOT');
                    setSelectedIds([]);
                    setPage(1);
                    pushToast(`Tab "${confirmDeleteTab.name}" and all its leads were deleted.`);
                  }
                  closeDeleteConfirm();
                  await loadAll();
                } catch (e: any) {
                  pushToast(e.message || 'Delete failed', 'error');
                } finally {
                  setDeletingId('');
                  setDeletingHiddenCustomLeads(false);
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
    {renamingTab && (
      <div className="fixed inset-0 z-[110] bg-black/35 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-200"><h3 className="text-lg font-semibold text-slate-800">Rename Custom Tab</h3></div>
          <div className="p-6">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={renamingTabName}
              onChange={(e) => setRenamingTabName(e.target.value)}
              placeholder="Enter new tab name"
            />
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={() => { setRenamingTab(null); setRenamingTabName(''); }}>Cancel</button>
            <button
              className="px-4 py-2 rounded-lg bg-brand-red text-white disabled:opacity-60"
              disabled={actionLoading}
              onClick={async () => {
                const next = renamingTabName.trim();
                if (!next) {
                  pushToast('Tab name is required.', 'error');
                  return;
                }
                setActionLoading(true);
                try {
                  const updated = await crmJson<TabInfo>(`/crm/custom-tabs/${renamingTab.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ name: next }),
                  });
                  setCustomTabs((prev) => prev.map((tab) => (tab.id === updated.id ? updated : tab)));
                  if (activeTab.trim().toUpperCase() === renamingTab.name.trim().toUpperCase()) {
                    setActiveTab(updated.name);
                  }
                  pushToast('Custom tab renamed.');
                  setRenamingTab(null);
                  setRenamingTabName('');
                  await loadAll();
                } catch (e: any) {
                  pushToast(e.message || 'Failed to rename tab', 'error');
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              {actionLoading ? 'Saving...' : 'Save'}
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
    {leadFormOpen && (
      <CRMLeadForm
        variant="modal"
        mode={editingLead ? 'edit' : 'create'}
        initialData={editingLead || undefined}
        activeTab={activeTab}
        onCancel={() => {
          setLeadFormOpen(false);
          setEditingLead(null);
        }}
        onSubmit={async (payload: CRMLeadPayload) => {
          const method = editingLead ? 'PATCH' : 'POST';
          const path = editingLead ? `/crm/${editingLead._id}` : '/crm';
          await crmJson(path, { method, body: JSON.stringify(payload) });
          setLeadFormOpen(false);
          setEditingLead(null);
          pushToast(editingLead ? 'Lead updated successfully.' : 'Lead created successfully.');
          loadAll();
        }}
        onError={(message) => pushToast(message, 'error')}
      />
    )}
    </>
  </div>
  );
};

export default CRMPagePanels;
