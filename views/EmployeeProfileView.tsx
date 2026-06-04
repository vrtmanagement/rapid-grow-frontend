import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  Calendar,
  Camera,
  ChartLine,
  Check,
  Hash,
  KeyRound,
  Lock,
  Mail,
  Network,
  Palette,
  Phone,
  ScrollText,
  Shield,
  User,
  X,
} from 'lucide-react';
import AuditLogsView from './AuditLogsView';
import { usePermissions } from '../context/usePermissions';
import AnalysisView from './AnalysisView';
import { API_BASE, getAuthHeaders } from '../config/api';
import { fetchOrgChart } from '../services/p3Api';
import { PlanningState, TeamMember } from '../types';
import AvatarCropModal from '../components/profile/AvatarCropModal';
import SecuritySettingsPanel from '../components/security/SecuritySettingsPanel';
import NotificationPreferencesPanel from '../components/settings/NotificationPreferencesPanel';
import ThemeLanguagePanel from '../components/settings/ThemeLanguagePanel';
import { getDisplayAvatarUrl, notifyProfileAvatarUpdated, persistSessionEmployeeAvatar } from '../utils/avatar';
import type { AttendanceSummaryResponse, LeaveRequest } from '../components/attendance/attendanceUtils';
import DataPrivacyView from './DataPrivacyView';
import PermissionsView from './PermissionsView';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

type SettingsTab =
  | 'profile'
  | 'notifications'
  | 'security'
  | 'appearance'
  | 'analysis'
  | 'privacy'
  | 'permissions'
  | 'audit-log';

const SETTINGS_TABS: SettingsTab[] = [
  'profile',
  'notifications',
  'security',
  'appearance',
  'analysis',
  'privacy',
  'permissions',
  'audit-log',
];

const isSettingsTab = (value: string | null): value is SettingsTab => (
  !!value && SETTINGS_TABS.includes(value as SettingsTab)
);

const formatDateLabel = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
};

const titleCase = (value?: string | null) => {
  if (!value) return '-';
  return value
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getStatusBadgeClasses = (status?: string | null) => {
  const normalized = String(status || 'active').trim().toLowerCase();
  if (normalized === 'inactive') return 'bg-slate-100 text-slate-600';
  if (normalized === 'on leave') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
};

const getCurrentMonthDateValue = () => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-01`;
};

const getWorkingDaysForCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const lastCountedDay = now.getDate();
  let totalWorkingDays = 0;

  for (let day = 1; day <= lastCountedDay; day += 1) {
    const current = new Date(year, monthIndex, day);
    if (current.getDay() !== 0) {
      totalWorkingDays += 1;
    }
  }

  return totalWorkingDays;
};

const buildAttendanceStats = (summary?: AttendanceSummaryResponse | null, employee?: any) => {
  const present = summary?.days?.length ?? Number(employee?.attendanceStats?.present ?? employee?.presentDays ?? 0);
  const totalWorkingDays = getWorkingDaysForCurrentMonth();
  const absent = Math.max(
    0,
    totalWorkingDays - present,
  );
  const late = Number(employee?.attendanceStats?.late ?? employee?.lateDays ?? 0);
  const rate = totalWorkingDays > 0 ? Math.round((present / totalWorkingDays) * 100) : 0;

  return {
    present,
    absent,
    late,
    rate,
  };
};

const EmployeeProfileView: React.FC<Props> = ({ state, updateState }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [employee, setEmployee] = useState<any>(null);
  const [profileName, setProfileName] = useState('');
  const [profileDesignation, setProfileDesignation] = useState('');
  const [profileDepartment, setProfileDepartment] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('profile');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resumeEditModalAfterAvatarCrop, setResumeEditModalAfterAvatarCrop] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryResponse | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [reportsToName, setReportsToName] = useState('-');
  const [projectsInvolvedCount, setProjectsInvolvedCount] = useState<number | null>(null);
  const optimisticAvatarRef = useRef<{ url: string; expiresAt: number } | null>(null);
  const canAccessPrivacyTab = ['ADMIN', 'SUPER_ADMIN'].includes(String(employee?.role || '').toUpperCase());
  const canAccessPermissionsTab = canAccessPrivacyTab;
  const canAccessAuditLogTab = canAccessPrivacyTab;
  const canAccessAnalysisTab = hasPermission('ANALYSIS_VIEW');
  const auditLogEntityType = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return String(params.get('entityType') || params.get('recordType') || '').trim();
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const requestedTab = params.get('tab');
    const nextTab = isSettingsTab(requestedTab) ? requestedTab : 'profile';
    let resolvedTab = nextTab;
    if (resolvedTab === 'privacy' && !canAccessPrivacyTab) resolvedTab = 'profile';
    if (resolvedTab === 'permissions' && !canAccessPermissionsTab) resolvedTab = 'profile';
    if (resolvedTab === 'analysis' && !canAccessAnalysisTab) resolvedTab = 'profile';
    if (resolvedTab === 'audit-log' && !canAccessAuditLogTab) resolvedTab = 'profile';

    setActiveSettingsTab((currentTab) => (currentTab === resolvedTab ? currentTab : resolvedTab));
  }, [canAccessAnalysisTab, canAccessAuditLogTab, canAccessPermissionsTab, canAccessPrivacyTab, location.search]);

  const handleSettingsTabChange = useCallback((nextTab: SettingsTab) => {
    setActiveSettingsTab(nextTab);

    const params = new URLSearchParams(location.search || '');
    if (nextTab === 'profile') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }

    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  const resolvePreferredAvatar = useCallback((incomingAvatar?: string | null, fallbackAvatar?: string | null) => {
    const nextAvatar = String(incomingAvatar || '').trim();
    const fallback = String(fallbackAvatar || '').trim();
    const optimisticAvatar = optimisticAvatarRef.current;

    if (!optimisticAvatar?.url) {
      return nextAvatar || fallback;
    }

    if (nextAvatar === optimisticAvatar.url) {
      optimisticAvatarRef.current = null;
      return nextAvatar;
    }

    if (Date.now() < optimisticAvatar.expiresAt) {
      return optimisticAvatar.url;
    }

    optimisticAvatarRef.current = null;
    return nextAvatar || fallback;
  }, []);

  const syncCurrentUser = useCallback((updates: Partial<TeamMember>) => {
    updateState((prev) => {
      const updatedUser = { ...prev.currentUser, ...updates };
      const updatedTeam = prev.team.map((member) => (member.id === prev.currentUser.id ? updatedUser : member));
      return { ...prev, currentUser: updatedUser, team: updatedTeam };
    });
    if (typeof updates.avatar === 'string') {
      persistSessionEmployeeAvatar(updates.avatar, updates as Record<string, unknown>);
      notifyProfileAvatarUpdated({
        avatar: updates.avatar,
        empId: employee?.empId,
        userId: employee?._id || state.currentUser.id,
      });
    }
  }, [employee?._id, employee?.empId, state.currentUser.id, updateState]);

  const resetFormFromEmployee = useCallback((emp: any) => {
    setProfileName(emp?.empName || '');
    setProfileDesignation(emp?.designation || '');
    setProfileDepartment(emp?.department || '');
    setProfileEmail(emp?.email || '');
    setProfilePhone(emp?.phone || '');
    setHasChanges(false);
    setError(null);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('rapidgrow-admin');
    if (!stored) return;
    try {
      const { employee: storedEmployee } = JSON.parse(stored);
      setEmployee(storedEmployee);
      setAvatar(storedEmployee?.avatar || '');
      resetFormFromEmployee(storedEmployee);
      syncCurrentUser({
        name: storedEmployee?.empName || state.currentUser.name,
        email: storedEmployee?.email || state.currentUser.email,
        avatar: storedEmployee?.avatar || state.currentUser.avatar,
      });
    } catch {
      // Ignore malformed session state.
    }
  }, [resetFormFromEmployee, state.currentUser.avatar, state.currentUser.email, state.currentUser.name, syncCurrentUser]);

  useEffect(() => {
    if (!infoMessage) return undefined;
    const timer = window.setTimeout(() => setInfoMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [infoMessage]);

  useEffect(() => {
    if (!employee?._id && !employee?.empId) return undefined;

    let active = true;

    async function loadProfileInsights() {
      try {
        const headers = getAuthHeaders();
        const monthDate = getCurrentMonthDateValue();

        const [employeeRes, attendanceRes, leaveRes] = await Promise.allSettled([
          fetch(`${API_BASE}/employees/${encodeURIComponent(employee._id || employee.empId)}`, { headers }),
          fetch(`${API_BASE}/attendance/me?range=month&date=${encodeURIComponent(monthDate)}`, { headers }),
          fetch(`${API_BASE}/leaves/me`, { headers }),
        ]);

        if (!active) return;

        if (employeeRes.status === 'fulfilled' && employeeRes.value.ok) {
          const nextEmployee = await employeeRes.value.json();
          const nextAvatar = resolvePreferredAvatar(
            nextEmployee?.avatar,
            avatar || employee?.avatar || state.currentUser.avatar,
          );
          const mergedEmployee = { ...(employee || {}), ...nextEmployee, avatar: nextAvatar };
          setEmployee((prev: any) => ({ ...(prev || {}), ...mergedEmployee }));
          setAvatar(nextAvatar);
          if (!editModalOpen) {
            resetFormFromEmployee(mergedEmployee);
          }
          syncCurrentUser({
            name: mergedEmployee?.empName || state.currentUser.name,
            email: mergedEmployee?.email || state.currentUser.email,
            avatar: nextAvatar || state.currentUser.avatar,
          });
        }

        if (attendanceRes.status === 'fulfilled' && attendanceRes.value.ok) {
          const nextAttendance = await attendanceRes.value.json();
          setAttendanceSummary(nextAttendance);
        }

        if (leaveRes.status === 'fulfilled' && leaveRes.value.ok) {
          const nextLeaveHistory = await leaveRes.value.json();
          setLeaveHistory(Array.isArray(nextLeaveHistory) ? nextLeaveHistory : []);
        }
      } catch (loadError) {
        console.error('Failed to load profile insights', loadError);
      }
    }

    loadProfileInsights();

    return () => {
      active = false;
    };
  }, [avatar, editModalOpen, employee?._id, employee?.empId, employee?.avatar, resetFormFromEmployee, resolvePreferredAvatar, state.currentUser.avatar, state.currentUser.email, state.currentUser.name, syncCurrentUser]);

  useEffect(() => {
    if (!employee?.empId) return undefined;

    let active = true;

    async function loadEmploymentDetailsExtras() {
      try {
        const data = await fetchOrgChart();
        if (!active) return;

        const employees = Array.isArray(data?.employees) ? data.employees : [];
        const selectedEmployee = employees.find((item: any) => String(item?.empId || '').trim() === String(employee.empId || '').trim());

        if (!selectedEmployee) {
          setReportsToName('-');
          setProjectsInvolvedCount(null);
          return;
        }

        const parent = employees.find((item: any) => String(item?._id || '') === String(selectedEmployee?.createdBy || ''));
        setReportsToName(parent?.empName || 'Root');
        setProjectsInvolvedCount(
          Number.isFinite(Number(selectedEmployee?.metrics?.projectCount))
            ? Number(selectedEmployee.metrics.projectCount)
            : 0,
        );
      } catch (loadError) {
        console.error('Failed to load org chart employment details', loadError);
      }
    }

    loadEmploymentDetailsExtras();

    return () => {
      active = false;
    };
  }, [employee?.empId]);

  const displayAvatar = useMemo(
    () => getDisplayAvatarUrl(avatar, employee?.empName),
    [avatar, employee?.empName],
  );

  const canEditExtendedFields = ['ADMIN', 'SUPER_ADMIN', 'TEAM_LEAD'].includes(String(employee?.role || '').toUpperCase());

  const handleAvatarPickerOpen = useCallback(
    (file: File | null, options?: { returnToEditModal?: boolean }) => {
      if (!file) return;
      setError(null);
      setInfoMessage(null);
      const shouldReturnToEditModal = Boolean(options?.returnToEditModal);
      setResumeEditModalAfterAvatarCrop(shouldReturnToEditModal);
      if (shouldReturnToEditModal) {
        setEditModalOpen(false);
      }
      setPendingAvatarFile(file);
    },
    [],
  );

  const handleAvatarCropClose = useCallback(() => {
    setPendingAvatarFile(null);
    if (resumeEditModalAfterAvatarCrop) {
      setEditModalOpen(true);
      setResumeEditModalAfterAvatarCrop(false);
    }
  }, [resumeEditModalAfterAvatarCrop]);

  const handleAvatarFileChange = async (file: File | null) => {
    if (!file || !employee?._id) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const headers = getAuthHeaders();
      delete (headers as Record<string, string>)['Content-Type'];
      const res = await fetch(`${API_BASE}/employees/${employee._id}/avatar`, {
        method: 'POST',
        headers,
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to upload profile image');

      const nextAvatar =
        typeof data.avatar === 'string' && data.avatar.trim()
          ? data.avatar.trim()
          : String(avatar || employee?.avatar || '').trim();
      optimisticAvatarRef.current = nextAvatar
        ? { url: nextAvatar, expiresAt: Date.now() + 15000 }
        : null;
      const nextEmployee = { ...employee, ...data, avatar: nextAvatar };
      setEmployee(nextEmployee);
      setAvatar(nextAvatar);
      persistSessionEmployeeAvatar(nextAvatar, nextEmployee);
      notifyProfileAvatarUpdated({
        avatar: nextAvatar,
        empId: nextEmployee.empId,
        userId: nextEmployee._id || state.currentUser.id,
      });
      syncCurrentUser({
        avatar: nextAvatar,
        name: nextEmployee.empName || state.currentUser.name,
        email: nextEmployee.email || state.currentUser.email,
      });
      setInfoMessage('Profile image updated successfully.');
    } catch (e: unknown) {
      const nextError = e instanceof Error ? e.message : 'Failed to upload profile image';
      setError(nextError);
      throw e;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileSave = async () => {
    if (!employee?._id && !employee?.empId) return;

    setError(null);
    const body: Record<string, string> = {};

    if (profileName.trim() && profileName.trim() !== employee.empName) {
      body.empName = profileName.trim();
    }
    if (canEditExtendedFields) {
      if (profileDesignation.trim() !== (employee.designation || '')) {
        body.designation = profileDesignation.trim();
      }
      if (profileDepartment.trim() !== (employee.department || '')) {
        body.department = profileDepartment.trim();
      }
      if (profileEmail.trim() !== (employee.email || '')) {
        body.email = profileEmail.trim();
      }
      if (profilePhone.trim() !== (employee.phone || '')) {
        body.phone = profilePhone.trim();
      }
    }

    if (Object.keys(body).length === 0) {
      setEditModalOpen(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/employees/${employee._id || employee.empId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      const nextAvatar =
        typeof data.avatar === 'string'
          ? data.avatar.trim()
          : String(avatar || employee?.avatar || '').trim();
      const nextEmployee = {
        ...employee,
        ...data,
        avatar: nextAvatar,
        empName: data.empName || profileName,
        designation: data.designation ?? profileDesignation,
        department: data.department ?? profileDepartment,
        email: data.email ?? profileEmail,
        phone: data.phone ?? profilePhone,
      };

      setEmployee(nextEmployee);
      setAvatar(nextAvatar);
      resetFormFromEmployee(nextEmployee);
      persistSessionEmployeeAvatar(nextAvatar, nextEmployee);
      syncCurrentUser({
        name: nextEmployee.empName,
        avatar: nextAvatar,
        email: nextEmployee.email || state.currentUser.email,
      });
      setInfoMessage('Profile updated successfully.');
      setEditModalOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const attendanceStats = buildAttendanceStats(attendanceSummary, employee);

  const settingsNavItems = [
    { key: 'profile' as SettingsTab, label: 'Profile', icon: User },
    { key: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { key: 'security' as SettingsTab, label: 'Security', icon: Shield },
    { key: 'appearance' as SettingsTab, label: 'Appearance', icon: Palette },
    ...(canAccessAnalysisTab ? [{ key: 'analysis' as SettingsTab, label: 'Analysis', icon: ChartLine }] : []),
    ...(canAccessPrivacyTab ? [{ key: 'privacy' as SettingsTab, label: 'Data & privacy', icon: Lock }] : []),
    ...(canAccessPermissionsTab ? [{ key: 'permissions' as SettingsTab, label: 'Permissions', icon: KeyRound }] : []),
    ...(canAccessAuditLogTab ? [{ key: 'audit-log' as SettingsTab, label: 'Audit log', icon: ScrollText }] : []),
  ];

  const employmentCards = [
    { label: 'Reports / Created By', value: reportsToName || '-', icon: Network },
    { label: 'Join Date', value: formatDateLabel(employee?.createdAt || employee?.joinDate), icon: Calendar },
    { label: 'Projects Involved', value: String(projectsInvolvedCount ?? 0), icon: BriefcaseBusiness },
    { label: 'Employee ID', value: employee?.empId || '-', icon: Hash },
  ];

  const overviewContacts = [
    { label: 'Email', value: employee?.email || '-', icon: Mail },
    { label: 'Phone', value: employee?.phone || '-', icon: Phone },
    { label: 'Department', value: employee?.department || '-', icon: Building2 },
    { label: 'Role', value: titleCase(employee?.role), icon: BadgeCheck },
  ];

  const activeSettingsTitle = {
    profile: 'Profile',
    notifications: 'Notifications',
    security: 'Security',
    appearance: 'Appearance',
    analysis: 'Analysis',
    privacy: 'Data & privacy',
    permissions: 'Permissions',
    'audit-log': 'Audit log',
  }[activeSettingsTab];

  const activeSettingsSubtitle = {
    profile: '',
    notifications: '',
    security: '',
    appearance: '',
    analysis: 'Upload Trimetrix reports and generate DISC-based communication guidance.',
    privacy: '',
    permissions: 'Manage role-based feature access for your organization.',
    'audit-log': 'Review account activity and record changes across your organization.',
  }[activeSettingsTab];

  const settingsSectionClassName =
    activeSettingsTab === 'notifications'
      ? '-mt-2 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] lg:px-6 lg:py-5'
      : '-mt-2 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] lg:p-6';

  const settingsHeaderClassName =
    activeSettingsTab === 'notifications' ||
    activeSettingsTab === 'profile' ||
    activeSettingsTab === 'security' ||
    activeSettingsTab === 'appearance' ||
    activeSettingsTab === 'privacy' ||
    activeSettingsTab === 'permissions' ||
    activeSettingsTab === 'audit-log'
      ? 'pb-0'
      : 'border-b border-slate-100 pb-6';

  if (!employee) return null;

  return (
    <div className="mx-auto w-full max-w-none px-0 pb-12 lg:-ml-10 lg:-mr-88 xl:-ml-12 xl:-mr-[6.5rem]">
      <div className="-mt-8 space-y-2">
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <div className="-mt-2 lg:sticky lg:top-0 lg:z-10">
              <nav
                aria-label="Profile settings"
                className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
              >
                <div className="space-y-2">
                  {settingsNavItems.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSettingsTabChange(key)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                        activeSettingsTab === key
                          ? 'bg-red-50 text-red-600'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon size={17} />
                      {label}
                    </button>
                  ))}
                </div>
              </nav>
            </div>
          </aside>

          <section className={`min-w-0 ${settingsSectionClassName}`}>
            <div className={settingsHeaderClassName}>
              {activeSettingsTab !== 'profile' &&
              activeSettingsTab !== 'security' &&
              activeSettingsTab !== 'appearance' &&
              activeSettingsTab !== 'privacy' &&
              activeSettingsTab !== 'permissions' &&
              activeSettingsTab !== 'audit-log' ? (
                <h3 className="text-2xl font-bold text-slate-900">{activeSettingsTitle}</h3>
              ) : null}
              {activeSettingsTab === 'audit-log' && canAccessAuditLogTab ? (
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{activeSettingsTitle}</h3>
                  {activeSettingsSubtitle ? (
                    <p className="mt-1 text-sm text-slate-500">{activeSettingsSubtitle}</p>
                  ) : null}
                </div>
              ) : null}
              {activeSettingsTab === 'permissions' && canAccessPermissionsTab ? (
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{activeSettingsTitle}</h3>
                  {activeSettingsSubtitle ? (
                    <p className="mt-1 text-sm text-slate-500">{activeSettingsSubtitle}</p>
                  ) : null}
                </div>
              ) : null}
              {activeSettingsSubtitle &&
              activeSettingsTab !== 'permissions' &&
              activeSettingsTab !== 'audit-log' ? (
                <p className="mt-1 text-sm text-slate-500">{activeSettingsSubtitle}</p>
              ) : null}
            </div>

            {activeSettingsTab === 'profile' ? (
              <div className="mt-3">
                <ProfileOverviewSection
                  employee={employee}
                  displayAvatar={displayAvatar}
                  uploadingAvatar={uploadingAvatar}
                  overviewContacts={overviewContacts}
                  employmentCards={employmentCards}
                  attendanceStats={attendanceStats}
                  leaveHistory={leaveHistory}
                  onAvatarSelect={(file) => handleAvatarPickerOpen(file)}
                  onUpdateProfile={() => setEditModalOpen(true)}
                />
              </div>
            ) : null}

            {activeSettingsTab === 'notifications' ? (
              <div className="mt-3">
                <NotificationPreferencesPanel />
              </div>
            ) : null}

            {activeSettingsTab === 'security' ? (
              <div className="mt-3">
                <SecuritySettingsPanel />
              </div>
            ) : null}

            {activeSettingsTab === 'appearance' ? (
              <div className="mt-3">
                <ThemeLanguagePanel />
              </div>
            ) : null}

            {activeSettingsTab === 'analysis' && canAccessAnalysisTab ? (
              <div className="mt-3">
                <AnalysisView embedded />
              </div>
            ) : null}

            {activeSettingsTab === 'privacy' && canAccessPrivacyTab ? (
              <div className="mt-3">
                <DataPrivacyView />
              </div>
            ) : null}

            {activeSettingsTab === 'permissions' && canAccessPermissionsTab ? (
              <div className="mt-3">
                <PermissionsView canEdit embedded />
              </div>
            ) : null}

            {activeSettingsTab === 'audit-log' && canAccessAuditLogTab ? (
              <div className="mt-3">
                <AuditLogsView embedded initialEntityType={auditLogEntityType} />
              </div>
            ) : null}

          </section>
        </div>
      </div>

      <ProfileEditModal
        open={editModalOpen}
        displayAvatar={displayAvatar}
        uploadingAvatar={uploadingAvatar}
        canEditExtendedFields={canEditExtendedFields}
        profileName={profileName}
        profileDesignation={profileDesignation}
        profileDepartment={profileDepartment}
        profileEmail={profileEmail}
        profilePhone={profilePhone}
        employeeId={employee.empId || ''}
        error={error}
        saving={saving}
        hasChanges={hasChanges}
        onClose={() => {
          resetFormFromEmployee(employee);
          setEditModalOpen(false);
        }}
        onSave={handleProfileSave}
        onAvatarSelect={(file) => handleAvatarPickerOpen(file, { returnToEditModal: true })}
        onProfileNameChange={(value) => {
          setProfileName(value);
          setHasChanges(true);
        }}
        onProfileDesignationChange={(value) => {
          setProfileDesignation(value);
          setHasChanges(true);
        }}
        onProfileDepartmentChange={(value) => {
          setProfileDepartment(value);
          setHasChanges(true);
        }}
        onProfileEmailChange={(value) => {
          setProfileEmail(value);
          setHasChanges(true);
        }}
        onProfilePhoneChange={(value) => {
          setProfilePhone(value);
          setHasChanges(true);
        }}
      />

      {infoMessage ? (
        <div className="fixed right-6 top-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={18} />
            </div>
            <div className="pr-2">
              <p className="text-sm font-semibold text-slate-900">Profile updated</p>
              <p className="text-sm text-slate-500">{infoMessage}</p>
            </div>
          </div>
        </div>
      ) : null}

      <AvatarCropModal
        open={!!pendingAvatarFile}
        file={pendingAvatarFile}
        onClose={handleAvatarCropClose}
        onConfirm={handleAvatarFileChange}
      />
    </div>
  );
};

const PROFILE_EDIT_AVATAR_INPUT_ID = 'profile-edit-avatar-input';

interface ProfileOverviewSectionProps {
  employee: any;
  displayAvatar: string;
  uploadingAvatar: boolean;
  overviewContacts: Array<{ label: string; value: string; icon: React.ComponentType<{ size?: number; className?: string }> }>;
  employmentCards: Array<{ label: string; value: string; icon: React.ComponentType<{ size?: number; className?: string }> }>;
  attendanceStats: { present: number; absent: number; late: number; rate: number };
  leaveHistory: any[];
  onAvatarSelect: (file: File | null) => void;
  onUpdateProfile: () => void;
}

const ProfileOverviewSection: React.FC<ProfileOverviewSectionProps> = ({
  employee,
  displayAvatar,
  uploadingAvatar,
  overviewContacts,
  employmentCards,
  attendanceStats,
  leaveHistory,
  onAvatarSelect,
  onUpdateProfile,
}) => (
  <div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)]">
    <section className="self-start rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)] lg:p-5">
      <div className="flex flex-col items-center text-center">
        <div className="relative h-24 w-24">
          <img
            src={displayAvatar}
            alt="Profile"
            className="h-24 w-24 rounded-full object-cover shadow-lg ring-4 ring-white"
          />
          <label
            className={`absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow-lg ring-4 ring-white transition hover:bg-red-600 ${
              uploadingAvatar ? 'cursor-not-allowed opacity-60' : ''
            }`}
            aria-label="Change profile image"
          >
            <Camera size={15} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingAvatar}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                onAvatarSelect(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        <h2 className="mt-4 text-[1.38rem] font-semibold leading-tight text-slate-900">{employee.empName || '-'}</h2>
        <p className="mt-1.5 text-[0.84rem] font-medium text-slate-500">{employee.designation || titleCase(employee.role)}</p>
        <span className={`mt-4 inline-flex rounded-full px-4 py-1.5 text-[0.84rem] font-semibold ${getStatusBadgeClasses(employee.status)}`}>
          {titleCase(employee.status || 'Active')}
        </span>
        <button
          type="button"
          onClick={onUpdateProfile}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-red-500 px-5 py-2.5 text-[0.9rem] font-semibold text-white transition hover:bg-red-600"
        >
          Update Profile
        </button>
      </div>

      <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
        {overviewContacts.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-start gap-4">
            <span className="mt-1 text-slate-900">
              <Icon size={18} />
            </span>
            <div>
              <p className="text-[0.85rem] font-semibold text-slate-900">{label}</p>
              <p className="mt-1 text-[0.8rem] text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    <div className="space-y-5">
      <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <h3 className="text-[1.55rem] font-semibold text-slate-900">Employment Details</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {employmentCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-[16px] border border-slate-200 p-4">
              <div className="flex items-center gap-3 text-slate-900">
                <Icon size={17} className="text-slate-500" />
                <p className="text-[0.96rem] font-semibold">{label}</p>
              </div>
              <p className="mt-3 text-[0.92rem] text-slate-600">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <h3 className="text-[1.55rem] font-semibold text-slate-900">Attendance Statistics</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <StatsItem label="Present" value={attendanceStats.present} valueClassName="text-emerald-500" />
          <StatsItem label="Absent" value={attendanceStats.absent} valueClassName="text-red-500" />
          <StatsItem label="Late" value={attendanceStats.late} valueClassName="text-orange-500" />
          <StatsItem label="Attendance Rate" value={`${attendanceStats.rate}%`} valueClassName="text-slate-900" />
        </div>
      </section>

      <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <h3 className="text-[1.55rem] font-semibold text-slate-900">Leave History</h3>
        <div className="mt-4 space-y-3">
          {leaveHistory.length > 0 ? (
            leaveHistory.slice(0, 5).map((leave: any, index: number) => (
              <div key={leave._id || `${leave.type}-${index}`} className="flex items-center justify-between gap-4 rounded-[14px] border border-slate-100 px-4 py-3">
                <div>
                  <p className="text-[0.92rem] font-semibold text-slate-900">{leave.type || 'Leave'}</p>
                  <p className="mt-1 text-[0.8rem] text-slate-500">
                    {formatDateLabel(leave.startDate)}
                    {leave.endDate ? ` - ${formatDateLabel(leave.endDate)}` : ''}
                  </p>
                  {leave.reason ? (
                    <p className="mt-2 text-[0.8rem] text-slate-500">{leave.reason}</p>
                  ) : null}
                </div>
                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[0.78rem] font-semibold text-slate-700">
                  {titleCase(leave.status || 'Approved')}
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-[14px] border border-dashed border-slate-200 px-5 py-6 text-center text-[0.84rem] text-slate-500">
              No leave history available yet.
            </div>
          )}
        </div>
      </section>
    </div>
  </div>
);

const StatsItem: React.FC<{ label: string; value: string | number; valueClassName: string }> = ({
  label,
  value,
  valueClassName,
}) => (
  <div>
    <p className="whitespace-nowrap text-[0.84rem] font-medium text-slate-900">{label}</p>
    <p className={`mt-3 text-[2rem] font-bold ${valueClassName}`}>{value}</p>
  </div>
);

interface ProfileEditModalProps {
  open: boolean;
  displayAvatar: string;
  uploadingAvatar: boolean;
  canEditExtendedFields: boolean;
  profileName: string;
  profileDesignation: string;
  profileDepartment: string;
  profileEmail: string;
  profilePhone: string;
  employeeId: string;
  error: string | null;
  saving: boolean;
  hasChanges: boolean;
  onClose: () => void;
  onSave: () => void;
  onAvatarSelect: (file: File | null) => void;
  onProfileNameChange: (value: string) => void;
  onProfileDesignationChange: (value: string) => void;
  onProfileDepartmentChange: (value: string) => void;
  onProfileEmailChange: (value: string) => void;
  onProfilePhoneChange: (value: string) => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  open,
  displayAvatar,
  uploadingAvatar,
  canEditExtendedFields,
  profileName,
  profileDesignation,
  profileDepartment,
  profileEmail,
  profilePhone,
  employeeId,
  error,
  saving,
  hasChanges,
  onClose,
  onSave,
  onAvatarSelect,
  onProfileNameChange,
  onProfileDesignationChange,
  onProfileDepartmentChange,
  onProfileEmailChange,
  onProfilePhoneChange,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile editor"
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col gap-5 pr-14 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 shrink-0">
            <img
              src={displayAvatar}
              alt="Profile"
              className="h-20 w-20 rounded-full object-cover shadow-lg ring-4 ring-white"
            />
            <label
              htmlFor={PROFILE_EDIT_AVATAR_INPUT_ID}
              className={`absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow-lg ring-4 ring-white transition hover:bg-red-600 ${
                uploadingAvatar ? 'cursor-not-allowed opacity-60' : ''
              }`}
              aria-label="Change profile image"
            >
              <Camera size={14} />
              <input
                id={PROFILE_EDIT_AVATAR_INPUT_ID}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  onAvatarSelect(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Profile Photo</h4>
            <p className="text-sm text-slate-500">Upload a clear profile image for your account.</p>
            <label
              htmlFor={PROFILE_EDIT_AVATAR_INPUT_ID}
              className={`mt-2 inline-block text-sm font-semibold ${
                uploadingAvatar ? 'cursor-not-allowed text-red-300' : 'cursor-pointer text-red-500'
              }`}
            >
              {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
            </label>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <InputField label="Full Name" value={profileName} onChange={onProfileNameChange} />
          <InputField label="Employee ID" value={employeeId} readOnly muted />
          <InputField
            label="Job Title"
            value={profileDesignation}
            onChange={onProfileDesignationChange}
            disabled={!canEditExtendedFields}
          />
          <InputField
            label="Department"
            value={profileDepartment}
            onChange={onProfileDepartmentChange}
            disabled={!canEditExtendedFields}
          />
          <InputField
            label="Email Address"
            type="email"
            value={profileEmail}
            onChange={onProfileEmailChange}
            disabled={!canEditExtendedFields}
          />
          <InputField
            label="Phone Number"
            value={profilePhone}
            onChange={onProfilePhoneChange}
            disabled={!canEditExtendedFields}
          />
        </div>

        {error ? <div className="mt-5 text-sm text-red-600">{error}</div> : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !hasChanges}
            className="rounded-xl bg-red-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface InputFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  disabled?: boolean;
  muted?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  readOnly = false,
  disabled = false,
  muted = false,
}) => (
  <label className="space-y-2">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      className={`h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50 ${
        muted || readOnly
          ? 'bg-slate-50 text-slate-500'
          : 'bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'
      }`}
    />
  </label>
);

export default EmployeeProfileView;
