import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { API_BASE, getStoredAuthSession } from '../config/api';
import { peekApiCache } from '../services/apiCache';
import { crmJson } from '../services/crmApi';
import CRMPagePanels from '../components/crm/CRMPagePanels';

const baseTabs = ['HOT', 'WARM', 'COLD'];
const RESERVED_TAB_NAMES = new Set(baseTabs);
const PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const CRM_ROLE_FILTER_STORAGE_KEY = 'crm_role_filter_selection_v1';
const CRM_ACTIVE_TAB_STORAGE_KEY = 'crm_active_tab_selection_v1';

type ConfirmAction =
  | 'deleteOne'
  | 'deleteBulk'
  | 'deleteAll'
  | 'deleteTab'
  | 'deleteHiddenCustom'
  | null;
type TabInfo = { id: string; name: string };
type ToastTone = 'success' | 'error';
type ToastItem = { id: number; tone: ToastTone; message: string };
type StaffOption = { id: string; empId: string; name: string; role: string };
type ScopedPerson = { id: string; role: string; name: string };
type LeadActionItem = { id: string; title: string; description: string };
type CardFilter =
  | { type: 'none' }
  | { type: 'total' }
  | { type: 'hot' }
  | { type: 'warm' }
  | { type: 'cold' }
  | { type: 'thisMonth' }
  | { type: 'custom'; customTabName: string };

const CRMPage: React.FC = () => {
  const getStoredRoleFilter = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(CRM_ROLE_FILTER_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { personFilterId?: string; initialized?: boolean };
      return {
        personFilterId: String(parsed?.personFilterId || ''),
        initialized: !!parsed?.initialized,
      };
    } catch {
      return null;
    }
  };
  const storedRoleFilter = getStoredRoleFilter();
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
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'HOT';
    const stored = window.localStorage.getItem(CRM_ACTIVE_TAB_STORAGE_KEY);
    return stored && stored.trim() ? stored : 'HOT';
  });
  const [customTabs, setCustomTabs] = useState<TabInfo[]>([]);
  const [tabsHydrated, setTabsHydrated] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const isSearchPending = search !== debouncedSearch;
  const [personFilterId, setPersonFilterId] = useState(storedRoleFilter?.personFilterId || '');
  const [personFilterInitialized, setPersonFilterInitialized] = useState(!!storedRoleFilter?.initialized);
  const [personDropdownOpen, setPersonDropdownOpen] = useState(false);
  const [personSearch, setPersonSearch] = useState('');
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [createTabOpen, setCreateTabOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveDestination, setMoveDestination] = useState('HOT');
  const [moveDropdownOpen, setMoveDropdownOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmTargetLead, setConfirmTargetLead] = useState<any | null>(null);
  const [confirmDeleteTab, setConfirmDeleteTab] = useState<TabInfo | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingHiddenCustomLeads, setDeletingHiddenCustomLeads] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [renamingTab, setRenamingTab] = useState<TabInfo | null>(null);
  const [renamingTabName, setRenamingTabName] = useState('');
  const [openLeftTabMenu, setOpenLeftTabMenu] = useState('');
  const [pageLoading, setPageLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [cardFilter, setCardFilter] = useState<CardFilter>({ type: 'none' });
  const latestLoadRequestRef = useRef(0);
  const roleFilterDropdownRef = useRef<HTMLDivElement | null>(null);
  const leftTabsMenuRef = useRef<HTMLDivElement | null>(null);

  const tabs = useMemo(() => [...baseTabs, ...customTabs.map((tab) => tab.name)], [customTabs]);
  const canUseRoleFilters = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'TEAM_LEAD';
  const peopleOptions = useMemo(
    () => {
      const normalizedRole = role.toUpperCase();
      const filtered = staffOptions.filter((member) => {
        const memberRole = String(member.role || '').toUpperCase();
        if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN') {
          return memberRole === 'TEAM_LEAD' || memberRole === 'EMPLOYEE';
        }
        if (normalizedRole === 'TEAM_LEAD') {
          return memberRole === 'EMPLOYEE' || (memberRole === 'TEAM_LEAD' && member.id === currentUserId);
        }
        return false;
      });
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    },
    [currentUserId, role, staffOptions],
  );
  const selectedPerson = useMemo(
    () => peopleOptions.find((member) => member.id === personFilterId) || null,
    [peopleOptions, personFilterId],
  );
  const selectedScopePerson = useMemo<ScopedPerson | null>(() => {
    if (!personFilterId) return null;
    if (selectedPerson) return selectedPerson;
    if (personFilterId === currentUserId) {
      return {
        id: currentUserId,
        role: role || 'EMPLOYEE',
        name: String(sessionEmployee?.empName || sessionEmployee?.name || 'You'),
      };
    }
    // Fallback to employee scope when selected id exists but option list has not hydrated yet.
    return { id: personFilterId, role: 'EMPLOYEE', name: 'Selected Person' };
  }, [currentUserId, personFilterId, role, selectedPerson, sessionEmployee?.empName, sessionEmployee?.name]);
  const selectedPersonLabel = useMemo(() => {
    if (!selectedScopePerson) return 'All People';
    const personRole = String(selectedScopePerson.role || '').toUpperCase();
    const shortRole =
      personRole === 'TEAM_LEAD' ? 'TL' : personRole === 'ADMIN' || personRole === 'SUPER_ADMIN' ? 'ADMIN' : 'EMP';
    return `${selectedScopePerson.name} (${shortRole})`;
  }, [selectedScopePerson]);
  const personParams = useMemo(
    () => {
      const selectedScopeRole = String(selectedScopePerson?.role || '').toUpperCase();
      return {
        ...(canUseRoleFilters && !selectedScopePerson ? { allPeople: '1' } : {}),
        ...(selectedScopeRole === 'TEAM_LEAD' && selectedScopePerson?.id ? { teamLeadId: selectedScopePerson.id } : {}),
        ...(selectedScopeRole !== 'TEAM_LEAD' && selectedScopePerson?.id ? { employeeId: selectedScopePerson.id } : {}),
      };
    },
    [canUseRoleFilters, selectedScopePerson],
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

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CRM_ROLE_FILTER_STORAGE_KEY,
        JSON.stringify({ personFilterId, initialized: personFilterInitialized }),
      );
    } catch {
      // Ignore storage failures (private mode / restricted environments).
    }
  }, [personFilterId, personFilterInitialized]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(CRM_ACTIVE_TAB_STORAGE_KEY, activeTab);
    } catch {
      // Ignore storage failures.
    }
  }, [activeTab]);

  useEffect(() => {
    if (!personDropdownOpen) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (!roleFilterDropdownRef.current) return;
      if (!roleFilterDropdownRef.current.contains(event.target as Node)) {
        setPersonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [personDropdownOpen]);

  useEffect(() => {
    if (!openLeftTabMenu) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (!leftTabsMenuRef.current) return;
      if (!leftTabsMenuRef.current.contains(event.target as Node)) {
        setOpenLeftTabMenu('');
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [openLeftTabMenu]);

  const buildListQuery = useCallback(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartIso = monthStart.toISOString().slice(0, 10);

    let leadType = '';
    let customTabName = '';
    if (cardFilter.type === 'hot') leadType = 'HOT';
    else if (cardFilter.type === 'warm') leadType = 'WARM';
    else if (cardFilter.type === 'cold') leadType = 'COLD';
    else if (cardFilter.type === 'custom') {
      leadType = 'CUSTOM';
      customTabName = cardFilter.customTabName;
    } else if (cardFilter.type === 'none') {
      leadType = baseTabs.includes(activeTab) ? activeTab : 'CUSTOM';
      customTabName = baseTabs.includes(activeTab) ? '' : activeTab;
    }

    const params = new URLSearchParams({
      q: debouncedSearch,
      page: String(page),
      limit: String(pageSize),
      ...(leadType ? { leadType } : {}),
      ...(customTabName ? { customTabName } : {}),
      ...(cardFilter.type === 'thisMonth' ? { fromDate: monthStartIso } : {}),
      ...personParams,
    });
    return `/crm?${params.toString()}`;
  }, [activeTab, cardFilter, debouncedSearch, page, pageSize, personParams]);

  const syncActiveTabCount = useCallback(
    (listTotal: number, tabRows: TabInfo[], statsRes: any) => {
      const normalizedCustomCounts = Array.isArray(statsRes?.customCounts)
        ? statsRes.customCounts.map((entry: any) => ({
            name: String(entry?.name || '').trim(),
            count: Number(entry?.count || 0),
          }))
        : [];
      const tabNamesByNormalized = new Map(
        tabRows
          .map((tab) => String(tab.name || '').trim())
          .filter(Boolean)
          .map((name) => [name.toUpperCase(), name]),
      );
      const customCountByNormalized = new Map(
        normalizedCustomCounts.map((entry) => [entry.name.toUpperCase(), entry.count] as const),
      );
      const filteredCustomCounts = Array.from(tabNamesByNormalized.entries()).map(([normalizedName, displayName]) => ({
        name: displayName,
        count: customCountByNormalized.get(normalizedName) || 0,
      }));
      const shouldSyncActiveCustomTabCount = !baseTabs.includes(activeTab);
      if (!shouldSyncActiveCustomTabCount) return filteredCustomCounts;
      const activeTabNormalized = activeTab.trim().toUpperCase();
      let found = false;
      const next = filteredCustomCounts.map((entry) => {
        if (entry.name.trim().toUpperCase() !== activeTabNormalized) return entry;
        found = true;
        return { ...entry, count: listTotal };
      });
      if (!found && activeTab.trim()) {
        next.push({ name: activeTab.trim(), count: listTotal });
      }
      return next;
    },
    [activeTab],
  );

  const loadMeta = useCallback(async () => {
    const tabsParams = new URLSearchParams(personParams);
    const statsPath = `/crm/stats${tabsParams.toString() ? `?${tabsParams.toString()}` : ''}`;
    const tabsPath = `/crm/custom-tabs${tabsParams.toString() ? `?${tabsParams.toString()}` : ''}`;
    const [statsRes, tabsRes] = await Promise.all([crmJson<any>(statsPath), crmJson<any>(tabsPath)]);
    const tabRows: TabInfo[] = Array.isArray(tabsRes.tabs) ? tabsRes.tabs : [];
    const normalizedCustomCounts = Array.isArray(statsRes?.customCounts)
      ? statsRes.customCounts.map((entry: any) => ({
          name: String(entry?.name || '').trim(),
          count: Number(entry?.count || 0),
        }))
      : [];
    const tabNamesByNormalized = new Map(
      tabRows
        .map((tab) => String(tab.name || '').trim())
        .filter(Boolean)
        .map((name) => [name.toUpperCase(), name]),
    );
    const customCountByNormalized = new Map(
      normalizedCustomCounts.map((entry) => [entry.name.toUpperCase(), entry.count] as const),
    );
    const filteredCustomCounts = Array.from(tabNamesByNormalized.entries()).map(([normalizedName, displayName]) => ({
      name: displayName,
      count: customCountByNormalized.get(normalizedName) || 0,
    }));
    setStats({
      ...statsRes,
      customCounts: filteredCustomCounts,
    });
    setCustomTabs(tabRows);
    setTabsHydrated(true);
  }, [personParams]);

  const loadLeads = useCallback(async () => {
    const requestId = latestLoadRequestRef.current + 1;
    latestLoadRequestRef.current = requestId;
    const listPath = buildListQuery();
    const hasCachedList = !!peekApiCache(`${API_BASE}${listPath}`);
    if (!hasCachedList) setPageLoading(true);
    try {
      const listRes = await crmJson<any>(listPath);
      if (requestId !== latestLoadRequestRef.current) return;
      const listTotal = Number(listRes?.total || 0);
      setLeads(listRes.items || []);
      setTotal(listTotal);
      setStats((prev) => ({
        ...prev,
        customCounts: syncActiveTabCount(listTotal, customTabs, prev),
      }));
    } finally {
      if (requestId === latestLoadRequestRef.current) {
        setPageLoading(false);
      }
    }
  }, [buildListQuery, customTabs, syncActiveTabCount]);

  const loadAll = useCallback(async () => {
    await loadMeta();
    await loadLeads();
  }, [loadLeads, loadMeta]);

  useEffect(() => {
    loadMeta().catch((e) => {
      pushToast(e.message || 'Failed to load CRM data', 'error');
    });
  }, [loadMeta]);

  useEffect(() => {
    if (!tabsHydrated) return;
    loadLeads().catch((e) => {
      pushToast(e.message || 'Failed to load CRM leads', 'error');
      setPageLoading(false);
    });
  }, [loadLeads, tabsHydrated]);

  useEffect(() => {
    if (!tabsHydrated) return;
    if (baseTabs.includes(activeTab)) return;
    const activeNormalized = activeTab.trim().toUpperCase();
    const matchedTab = customTabs.find((tab) => tab.name.trim().toUpperCase() === activeNormalized);
    if (matchedTab) {
      return;
    }
    setActiveTab('HOT');
    setCardFilter({ type: 'none' });
  }, [activeTab, customTabs, tabsHydrated]);


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

  useEffect(() => {
    // Default role scope should be current logged-in user on initial page load.
    if (!canUseRoleFilters || !currentUserId || personFilterInitialized) return;
    setPersonFilterId(currentUserId);
    setPersonFilterInitialized(true);
    setPage(1);
  }, [canUseRoleFilters, currentUserId, personFilterInitialized]);

  const currentCustomTab = baseTabs.includes(activeTab) ? '' : activeTab;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const visibleCustomCount = useMemo(
    () => (Array.isArray(stats.customCounts) ? stats.customCounts.reduce((sum, entry) => sum + Number(entry.count || 0), 0) : 0),
    [stats.customCounts],
  );
  const hiddenCustomLeadsCount = Math.max(0, Number(stats.total || 0) - Number(stats.hot || 0) - Number(stats.warm || 0) - Number(stats.cold || 0) - visibleCustomCount);
  const pageWindowStart = Math.max(1, page - 2);
  const pageWindowEnd = Math.min(totalPages, page + 2);
  const pageNumbers = Array.from({ length: Math.max(0, pageWindowEnd - pageWindowStart + 1) }, (_, idx) => pageWindowStart + idx);
  const closeDeleteConfirm = useCallback(() => {
    setConfirmAction(null);
    setConfirmTargetLead(null);
    setConfirmDeleteTab(null);
  }, []);


  return <CRMPagePanels ctx={{CRM_ACTIVE_TAB_STORAGE_KEY, CRM_ROLE_FILTER_STORAGE_KEY, PAGE_SIZE, PAGE_SIZE_OPTIONS, RESERVED_TAB_NAMES, actionLoading, activeTab, baseTabs, buildListQuery, canUseRoleFilters, cardFilter, closeDeleteConfirm, confirmAction, confirmDeleteTab, confirmTargetLead, createTabOpen, currentCustomTab, currentUserId, currentUserRoleLabel, customTabMap, customTabs, debouncedSearch, deletingHiddenCustomLeads, deletingId, editingLead, filteredPeopleOptions, getStoredRoleFilter, hiddenCustomLeadsCount, importOpen, isSearchPending, latestLoadRequestRef, leadFormOpen, leads, leftTabsMenuRef, loadAll, loadLeads, loadMeta, moveDestination, moveDropdownOpen, moveModalOpen, navigate, newTabName, openLeftTabMenu, page, pageLoading, pageNumbers, pageSize, pageWindowEnd, pageWindowStart, peopleOptions, personDropdownOpen, personFilterId, personFilterInitialized, personParams, personSearch, pushToast, renamingTab, renamingTabName, role, roleFilterDropdownRef, search, selectedIds, selectedPerson, selectedPersonLabel, selectedScopePerson, sessionEmployee, setActionLoading, setActiveTab, setCardFilter, setConfirmAction, setConfirmDeleteTab, setConfirmTargetLead, setCreateTabOpen, setCustomTabs, setDeletingHiddenCustomLeads, setDeletingId, setEditingLead, setImportOpen, setLeadFormOpen, setLeads, setMoveDestination, setMoveDropdownOpen, setMoveModalOpen, setNewTabName, setOpenLeftTabMenu, setPage, setPageLoading, setPageSize, setPersonDropdownOpen, setPersonFilterId, setPersonFilterInitialized, setPersonSearch, setRenamingTab, setRenamingTabName, setSearch, setSelectedIds, setStaffOptions, setStats, setTabsHydrated, setToasts, setTotal, staffOptions, stats, storedRoleFilter, syncActiveTabCount, tabs, tabsHydrated, toasts, total, totalPages, visibleCustomCount}} />;
};

export default CRMPage;
