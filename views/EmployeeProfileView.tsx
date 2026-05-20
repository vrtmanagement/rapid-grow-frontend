import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Building2,
  Camera,
  Check,
  Eye,
  EyeOff,
  Globe,
  Mail,
  Phone,
  Shield,
  User,
} from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { PlanningState, TeamMember } from '../types';
import AvatarCropModal from '../components/profile/AvatarCropModal';
import TwoFactorSettingsPanel from '../components/security/TwoFactorSettingsPanel';
import ThemeLanguagePanel from '../components/settings/ThemeLanguagePanel';
import { getDisplayAvatarUrl, notifyProfileAvatarUpdated, persistSessionEmployeeAvatar } from '../utils/avatar';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const SETTINGS_MODE_HASH = '#/profile?mode=settings';

const getSettingsModeFromHash = () =>
  typeof window !== 'undefined' && window.location.hash.includes('mode=settings');

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

const EmployeeProfileView: React.FC<Props> = ({ state, updateState }) => {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [profileName, setProfileName] = useState('');
  const [profileDesignation, setProfileDesignation] = useState('');
  const [profileDepartment, setProfileDepartment] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [avatar, setAvatar] = useState<string>('');
  const [settingsMode, setSettingsMode] = useState(getSettingsModeFromHash);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'notifications' | 'security' | 'appearance' | 'preferences'>('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  const syncCurrentUser = useCallback((updates: Partial<TeamMember>) => {
    updateState((prev) => {
      const updatedUser = { ...prev.currentUser, ...updates };
      const updatedTeam = prev.team.map((m) => (m.id === prev.currentUser.id ? updatedUser : m));
      return { ...prev, currentUser: updatedUser, team: updatedTeam };
    });
    if (typeof updates.avatar === 'string') {
      persistSessionEmployeeAvatar(updates.avatar);
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
    setProfilePassword('');
    setShowPassword(false);
    setHasChanges(false);
    setError(null);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('rapidgrow-admin');
    if (!stored) return;
    try {
      const { employee: emp } = JSON.parse(stored);
      setEmployee(emp);
      setAvatar(emp?.avatar || '');
      resetFormFromEmployee(emp);
      syncCurrentUser({
        name: emp?.empName || state.currentUser.name,
        email: emp?.email || state.currentUser.email,
        avatar: emp?.avatar || state.currentUser.avatar,
      });
    } catch {
      // ignore malformed session state
    }
  }, [resetFormFromEmployee, state.currentUser.avatar, state.currentUser.email, state.currentUser.name, syncCurrentUser]);

  useEffect(() => {
    const syncMode = () => setSettingsMode(getSettingsModeFromHash());
    window.addEventListener('hashchange', syncMode);
    syncMode();
    return () => window.removeEventListener('hashchange', syncMode);
  }, []);

  useEffect(() => {
    if (settingsMode) {
      setActiveSettingsTab('profile');
    }
  }, [settingsMode]);

  useEffect(() => {
    if (!infoMessage) return;
    const timer = window.setTimeout(() => setInfoMessage(null), 2000);
    return () => window.clearTimeout(timer);
  }, [infoMessage]);

  if (!employee) return null;

  const displayAvatar = getDisplayAvatarUrl(avatar, employee.empName);
  const canEditExtendedFields = ['ADMIN', 'SUPER_ADMIN', 'TEAM_LEAD'].includes(String(employee.role || '').toUpperCase());

  const openSettingsMode = () => {
    setError(null);
    window.location.hash = SETTINGS_MODE_HASH;
  };

  const closeSettingsMode = () => {
    resetFormFromEmployee(employee);
    window.location.hash = '#/profile';
  };

  const handleAvatarFileChange = async (file: File | null) => {
    if (!file || !employee?._id) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const headers = getAuthHeaders();
      delete (headers as any)['Content-Type'];
      const res = await fetch(`${API_BASE}/employees/${employee._id}/avatar`, {
        method: 'POST',
        headers,
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to upload profile image');
      const nextAvatar = data.avatar || '';
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
    } catch (e: any) {
      setError(e?.message || 'Failed to upload profile image');
      throw e;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!employee?._id && !employee?.empId) return;

    setError(null);
    const body: Record<string, string> = {};

    if (profileName.trim() && profileName.trim() !== employee.empName) {
      body.empName = profileName.trim();
    }
    if (profilePassword.trim()) {
      body.password = profilePassword.trim();
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

    const trimmedAvatar = avatar.trim();
    const isUrlAvatar = trimmedAvatar.startsWith('http://') || trimmedAvatar.startsWith('https://');
    if (isUrlAvatar && trimmedAvatar !== (employee.avatar || '')) {
      body.avatar = trimmedAvatar;
    }

    if (Object.keys(body).length === 0) {
      closeSettingsMode();
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
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      const persistedAvatar =
        typeof data.avatar === 'string'
          ? data.avatar
          : isUrlAvatar
            ? trimmedAvatar
            : employee.avatar;
      const nextEmployee = {
        ...employee,
        ...data,
        avatar: persistedAvatar,
        empName: data.empName || profileName,
        designation: data.designation ?? profileDesignation,
        department: data.department ?? profileDepartment,
        email: data.email ?? profileEmail,
        phone: data.phone ?? profilePhone,
      };
      setEmployee(nextEmployee);
      setAvatar(persistedAvatar || '');
      resetFormFromEmployee(nextEmployee);
      persistSessionEmployeeAvatar(persistedAvatar, nextEmployee);
      notifyProfileAvatarUpdated({
        avatar: persistedAvatar,
        empId: nextEmployee.empId,
        userId: nextEmployee._id || state.currentUser.id,
      });
      syncCurrentUser({
        name: nextEmployee.empName,
        avatar: persistedAvatar || '',
        email: nextEmployee.email || state.currentUser.email,
      });
      setInfoMessage('Profile updated successfully.');
      window.location.hash = '#/profile';
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const attendanceStats = {
    present: Number(employee?.attendanceStats?.present ?? employee?.presentDays ?? 0),
    absent: Number(employee?.attendanceStats?.absent ?? employee?.absentDays ?? 0),
    late: Number(employee?.attendanceStats?.late ?? employee?.lateDays ?? 0),
    rate: Number(employee?.attendanceStats?.rate ?? employee?.attendanceRate ?? 0),
  };

  const leaveHistory = Array.isArray(employee?.leaveHistory) ? employee.leaveHistory : [];

  const settingsNavItems = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'appearance', label: 'Appearance', icon: Globe },
    { key: 'preferences', label: 'Preferences', icon: Building2 },
  ];

  const employmentCards = [
    { label: 'Department', value: employee.department || '-', icon: Building2 },
    { label: 'Join Date', value: formatDateLabel(employee.createdAt || employee.joinDate), icon: BriefcaseBusiness },
    { label: 'Role', value: titleCase(employee.role), icon: Shield },
    { label: 'Employee ID', value: employee.empId || '-', icon: User },
  ];

  const overviewContacts = [
    { label: 'Email', value: employee.email || '-', icon: Mail },
    { label: 'Phone', value: employee.phone || '-', icon: Phone },
    { label: 'Department', value: employee.department || '-', icon: Building2 },
    { label: 'Role', value: titleCase(employee.role), icon: Shield },
  ];

  const activeSettingsTitle = {
    profile: 'Profile Settings',
    notifications: 'Notifications',
    security: 'Security',
    appearance: 'Appearance',
    preferences: 'Preferences',
  }[activeSettingsTab];

  const activeSettingsSubtitle = {
    profile: 'Update your profile details with a clean, secure workflow.',
    notifications: 'Review how account notifications are shown and delivered.',
    security: 'Manage your account protection and verification settings.',
    appearance: 'Adjust how your workspace looks and feels.',
    preferences: 'Control your personal account preferences.',
  }[activeSettingsTab];

  return (
    <div className="mx-auto w-full max-w-none px-0 pb-12">
      {settingsMode ? (
        <div className="-mt-8 space-y-2">
          <div className="grid items-start gap-2 lg:grid-cols-[200px_minmax(0,1fr)]">
            <aside className="sticky  -mt-2 h-fit self-start rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="space-y-2">
                {settingsNavItems.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveSettingsTab(key)}
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
            </aside>

            <section className="-mt-2 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-6 border-b border-slate-100 pb-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{activeSettingsTitle}</h3>
                  <p className="mt-1 text-sm text-slate-500">{activeSettingsSubtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={closeSettingsMode}
                  className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <ArrowLeft size={16} />
                  Back to profile
                </button>
              </div>
              {activeSettingsTab === 'profile' ? (
                <>
                  <div className="mt-8 flex flex-col gap-5 rounded-[22px] border border-slate-100 bg-slate-50/60 p-6 sm:flex-row sm:items-center">
                    <div className="relative h-20 w-20 shrink-0">
                      <img
                        src={displayAvatar}
                        alt="Profile"
                        className="h-20 w-20 rounded-full object-cover shadow-lg ring-4 ring-white"
                      />
                      <button
                        type="button"
                        aria-label="Change profile image"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg ring-4 ring-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Camera size={14} />
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingAvatar}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) setPendingAvatarFile(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">Profile Photo</h4>
                      <p className="text-sm text-slate-500">Upload a clear profile image for your account.</p>
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="mt-2 text-sm font-semibold text-red-500 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Full Name</span>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => {
                          setProfileName(e.target.value);
                          setHasChanges(true);
                        }}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Employee ID</span>
                      <input
                        type="text"
                        value={employee.empId || ''}
                        readOnly
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500 outline-none"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Job Title</span>
                      <input
                        type="text"
                        value={profileDesignation}
                        onChange={(e) => {
                          setProfileDesignation(e.target.value);
                          setHasChanges(true);
                        }}
                        disabled={!canEditExtendedFields}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Department</span>
                      <input
                        type="text"
                        value={profileDepartment}
                        onChange={(e) => {
                          setProfileDepartment(e.target.value);
                          setHasChanges(true);
                        }}
                        disabled={!canEditExtendedFields}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Email Address</span>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => {
                          setProfileEmail(e.target.value);
                          setHasChanges(true);
                        }}
                        disabled={!canEditExtendedFields}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Phone Number</span>
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => {
                          setProfilePhone(e.target.value);
                          setHasChanges(true);
                        }}
                        disabled={!canEditExtendedFields}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </label>

                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">New Password</span>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={profilePassword}
                          onChange={(e) => {
                            setProfilePassword(e.target.value);
                            setHasChanges(true);
                          }}
                          placeholder="Leave blank to keep your current password"
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </label>
                  </div>

                  {error && <div className="mt-5 text-sm text-red-600">{error}</div>}

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={closeSettingsMode}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                      className="rounded-xl bg-red-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              ) : null}

              {activeSettingsTab === 'notifications' ? (
                <div className="mt-8 rounded-[22px] border border-slate-100 bg-slate-50/60 p-6">
                  <h4 className="text-lg font-semibold text-slate-900">Notification preferences</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Account notifications are currently managed from your top-bar notification center and the related
                    module workflows. This tab is ready for future delivery-channel controls.
                  </p>
                </div>
              ) : null}

              {activeSettingsTab === 'security' ? (
                <div className="mt-8">
                  <TwoFactorSettingsPanel />
                </div>
              ) : null}

              {activeSettingsTab === 'appearance' ? (
                <div className="mt-8">
                  <ThemeLanguagePanel />
                </div>
              ) : null}

              {activeSettingsTab === 'preferences' ? (
                <div className="mt-8 rounded-[22px] border border-slate-100 bg-slate-50/60 p-6">
                  <h4 className="text-lg font-semibold text-slate-900">Preferences</h4>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">Timezone</p>
                      <p className="mt-1 text-sm text-slate-500">Asia/Kolkata</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">Current role</p>
                      <p className="mt-1 text-sm text-slate-500">{titleCase(employee.role)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">Department</p>
                      <p className="mt-1 text-sm text-slate-500">{employee.department || '-'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">Status</p>
                      <p className="mt-1 text-sm text-slate-500">{titleCase(employee.status || 'active')}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-xl px-1 py-1 text-base font-medium text-slate-900 transition hover:text-red-500"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <section className="rounded-[18px] border border-slate-200 bg-white p-7 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col items-center text-center">
                <div className="relative h-28 w-28">
                  <img
                    src={displayAvatar}
                    alt="Profile"
                    className="h-28 w-28 rounded-full object-cover shadow-lg ring-4 ring-white"
                  />
                  <button
                    type="button"
                    aria-label="Change profile image"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg ring-4 ring-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Camera size={16} />
                  </button>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) setPendingAvatarFile(file);
                    e.target.value = '';
                  }}
                />
                <h2 className="mt-6 text-[2.2rem] font-semibold leading-none text-slate-900">{employee.empName || '-'}</h2>
                <p className="mt-3 text-lg text-slate-500">{employee.designation || titleCase(employee.role)}</p>
                <span className="mt-5 inline-flex rounded-full bg-emerald-100 px-5 py-2 text-sm font-semibold text-emerald-700">
                  {titleCase(employee.status || 'Active')}
                </span>
                <button
                  type="button"
                  onClick={openSettingsMode}
                  className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-red-500 px-5 py-3 text-base font-bold text-white transition hover:bg-red-600"
                >
                  Edit Profile
                </button>
              </div>

              <div className="mt-8 space-y-6 border-t border-slate-100 pt-8">
                {overviewContacts.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-4">
                    <span className="mt-1 text-slate-500">
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="text-lg font-medium text-slate-900">{label}</p>
                      <p className="mt-1 text-sm text-slate-500">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-[18px] border border-slate-200 bg-white p-7 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <h3 className="text-[2rem] font-semibold text-slate-900">Employment Details</h3>
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  {employmentCards.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-[16px] border border-slate-200 p-6">
                      <div className="flex items-center gap-3 text-slate-900">
                        <Icon size={18} className="text-slate-500" />
                        <p className="text-lg font-semibold">{label}</p>
                      </div>
                      <p className="mt-4 text-lg text-slate-600">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[18px] border border-slate-200 bg-white p-7 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <h3 className="text-[2rem] font-semibold text-slate-900">Attendance Statistics</h3>
                <div className="mt-7 grid gap-5 sm:grid-cols-4">
                  <div>
                    <p className="text-lg text-slate-900">Present</p>
                    <p className="mt-3 text-4xl font-bold text-emerald-500">{attendanceStats.present}</p>
                  </div>
                  <div>
                    <p className="text-lg text-slate-900">Absent</p>
                    <p className="mt-3 text-4xl font-bold text-red-500">{attendanceStats.absent}</p>
                  </div>
                  <div>
                    <p className="text-lg text-slate-900">Late</p>
                    <p className="mt-3 text-4xl font-bold text-orange-500">{attendanceStats.late}</p>
                  </div>
                  <div>
                    <p className="text-lg text-slate-900">Attendance Rate</p>
                    <p className="mt-3 text-4xl font-bold text-slate-900">{attendanceStats.rate}%</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[18px] border border-slate-200 bg-white p-7 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <h3 className="text-[2rem] font-semibold text-slate-900">Leave History</h3>
                <div className="mt-6 space-y-5">
                  {leaveHistory.length > 0 ? (
                    leaveHistory.map((leave: any, index: number) => (
                      <div key={leave._id || `${leave.type}-${index}`} className="flex items-center justify-between gap-4 rounded-[14px] border border-slate-100 px-5 py-4">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{leave.type || 'Leave'}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDateLabel(leave.startDate)}{leave.endDate ? ` - ${formatDateLabel(leave.endDate)}` : ''}
                          </p>
                        </div>
                        <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                          {titleCase(leave.status || 'Approved')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[14px] border border-dashed border-slate-200 px-5 py-8 text-center text-sm text-slate-500">
                      No leave history available yet.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      )}

      {infoMessage && (
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
      )}

      <AvatarCropModal
        open={!!pendingAvatarFile}
        file={pendingAvatarFile}
        onClose={() => setPendingAvatarFile(null)}
        onConfirm={handleAvatarFileChange}
      />
    </div>
  );
};

export default EmployeeProfileView;
