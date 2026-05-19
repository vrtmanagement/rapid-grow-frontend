import React, { useMemo, useRef, useState } from 'react';
import { PlanningState, TeamMember } from '../types';
import { API_BASE, getAuthHeaders } from '../config/api';
import { Camera, Check, Eye, EyeOff } from 'lucide-react';
import AvatarCropModal from '../components/profile/AvatarCropModal';
import TwoFactorSettingsPanel from '../components/security/TwoFactorSettingsPanel';
import ThemeLanguagePanel from '../components/settings/ThemeLanguagePanel';
import { getDisplayAvatarUrl, notifyProfileAvatarUpdated, persistSessionEmployeeAvatar } from '../utils/avatar';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const SUPER_ADMIN_EMAIL = 'akumar@vrt9.com';

const ProfileView: React.FC<Props> = ({ state, updateState }) => {
  const isSuperAdmin = state.currentUser.email === SUPER_ADMIN_EMAIL;
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profileName, setProfileName] = useState(state.currentUser.name);
  const [profilePassword, setProfilePassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [infoDialogMessage, setInfoDialogMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  React.useEffect(() => {
    if (!infoDialogMessage) return;
    const timer = window.setTimeout(() => setInfoDialogMessage(null), 2000);
    return () => window.clearTimeout(timer);
  }, [infoDialogMessage]);

  const backendEmployee = useMemo(() => {
    try {
      const raw = localStorage.getItem('rapidgrow-admin');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.employee || null;
    } catch {
      return null;
    }
  }, []);

  const handleUserRecordChange = (
    updates: Partial<TeamMember>,
    options: { markDirty?: boolean } = {},
  ) => {
    if (options.markDirty !== false) {
      setHasChanges(true);
    }
    updateState(prev => {
      const updatedUser = { ...prev.currentUser, ...updates };
      const updatedTeam = prev.team.map(m => (m.id === prev.currentUser.id ? updatedUser : m));
      return { ...prev, currentUser: updatedUser, team: updatedTeam };
    });
    if (typeof updates.avatar === 'string') {
      persistSessionEmployeeAvatar(updates.avatar);
      notifyProfileAvatarUpdated({
        avatar: updates.avatar,
        empId: backendEmployee?.empId,
        userId: backendEmployee?._id || state.currentUser.id,
      });
    }
  };

  const handleAvatarFileChange = async (file: File | null) => {
    if (!file) return;
    if (!backendEmployee?._id) return;
    setUploadingAvatar(true);
    setProfileError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const headers = getAuthHeaders();
      delete (headers as any)['Content-Type'];
      const res = await fetch(`${API_BASE}/employees/${backendEmployee._id}/avatar`, {
        method: 'POST',
        headers,
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload profile image');
      }
      const nextAvatar = data.avatar || '';
      persistSessionEmployeeAvatar(nextAvatar, data);
      handleUserRecordChange({ avatar: nextAvatar }, { markDirty: false });
      notifyProfileAvatarUpdated({
        avatar: nextAvatar,
        empId: data.empId || backendEmployee?.empId,
        userId: data._id || backendEmployee?._id || state.currentUser.id,
      });
      setInfoDialogMessage('Profile image updated successfully.');
    } catch (e: any) {
      setProfileError(e?.message || 'Failed to upload profile image');
      throw e;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileError(null);
    const body: any = {};
    if (profileName.trim() && profileName.trim() !== state.currentUser.name) {
      body.empName = profileName.trim();
    }
    if (profilePassword.trim()) {
      body.password = profilePassword.trim();
    }
    const trimmedAvatar = (state.currentUser.avatar || '').trim();
    const backendAvatar = (backendEmployee?.avatar || '').trim();
    const isUrlAvatar = trimmedAvatar.startsWith('http://') || trimmedAvatar.startsWith('https://');
    if (isUrlAvatar && trimmedAvatar && trimmedAvatar !== backendAvatar) {
      body.avatar = trimmedAvatar;
    }
    if (!backendEmployee || !backendEmployee._id || Object.keys(body).length === 0) {
      if (profileName.trim() && profileName.trim() !== state.currentUser.name) {
        handleUserRecordChange({ name: profileName.trim() || state.currentUser.name });
      }
      setProfilePassword('');
      setHasChanges(false);
      setEditingProfile(false);
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/employees/${backendEmployee._id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }
      const persistedAvatar =
        (data as any).avatar && typeof (data as any).avatar === 'string'
          ? (data as any).avatar
          : isUrlAvatar
          ? trimmedAvatar
          : state.currentUser.avatar;
      handleUserRecordChange({
        name: data.empName || profileName.trim() || state.currentUser.name,
        avatar: persistedAvatar || state.currentUser.avatar,
      });
      try {
        persistSessionEmployeeAvatar(persistedAvatar, data);
      } catch {
        // ignore
      }
      notifyProfileAvatarUpdated({
        avatar: persistedAvatar,
        empId: data.empId || backendEmployee?.empId,
        userId: data._id || backendEmployee?._id || state.currentUser.id,
      });
      setProfilePassword('');
      setHasChanges(false);
      setEditingProfile(false);
      setInfoDialogMessage('Profile updated successfully.');
    } catch (e: any) {
      setProfileError(e?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileName(state.currentUser.name);
    setProfilePassword('');
    setHasChanges(false);
    setProfileError(null);
    setEditingProfile(false);
  };

  const displayAvatar = getDisplayAvatarUrl(
    state.currentUser.avatar,
    backendEmployee?.empName || state.currentUser.name,
  );

  const detailRows = [
    ['Role', state.currentUser.role || (isSuperAdmin ? 'Super Admin' : '-')],
    ['Email', state.currentUser.email || '-'],
    ['Employee ID', backendEmployee?.empId || '-'],
    ['Designation', backendEmployee?.designation || '-'],
    ['Department', backendEmployee?.department || '-'],
    ['Phone', backendEmployee?.phone || '-'],
  ];

  return (
    <div className="mx-auto max-w-4xl pb-24 animate-in fade-in duration-500">
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-4xl font-bold leading-tight text-slate-900">{state.uiConfig.profileTitle}</h2>
            <p className="mt-2 text-base text-slate-500">{state.uiConfig.profileSub}</p>
          </div>
          <button
            type="button"
            onClick={editingProfile ? handleCancelEdit : () => setEditingProfile(true)}
            className="rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            {editingProfile ? 'Cancel' : 'Edit'}
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-[112px_minmax(0,1fr)]">
          <div className="flex justify-center md:block">
            <div className="relative h-24 w-24">
              <img
                src={displayAvatar}
                className="h-24 w-24 rounded-full object-cover shadow-lg ring-4 ring-white"
                alt="Profile"
              />
              <button
                type="button"
                aria-label="Change profile image"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-lg ring-4 ring-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Camera size={16} />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={e => {
                  const file = e.target.files?.[0] || null;
                  if (file) {
                    setPendingAvatarFile(file);
                  }
                  e.target.value = '';
                }}
              />
            </div>
            {uploadingAvatar && (
              <p className="mt-4 text-center text-xs font-medium text-slate-500 md:text-left">Uploading...</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid gap-2 border-b border-slate-100 pb-4 sm:grid-cols-[160px_minmax(0,1fr)]">
              <span className="text-base text-slate-500">Full Name</span>
              {editingProfile ? (
                <input
                  type="text"
                  value={profileName}
                  onChange={e => {
                    setProfileName(e.target.value);
                    setHasChanges(true);
                  }}
                  className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-1 text-base font-semibold text-slate-900 outline-none focus:border-red-400"
                />
              ) : (
                <span className="break-words text-base font-semibold text-slate-900">
                  {state.currentUser.name || '-'}
                </span>
              )}
            </div>

            {detailRows.map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 border-b border-slate-100 pb-4 sm:grid-cols-[160px_minmax(0,1fr)]"
              >
                <span className="text-base text-slate-500">{label}</span>
                <span className="break-words text-base font-semibold text-slate-800">{value}</span>
              </div>
            ))}

            {editingProfile && (
              <div className="grid gap-2 border-b border-slate-100 pb-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                <span className="text-base text-slate-500">Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={profilePassword}
                    onChange={e => {
                      setProfilePassword(e.target.value);
                      setHasChanges(true);
                    }}
                    className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-1 pr-10 text-base font-semibold text-slate-900 outline-none focus:border-red-400"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {profileError && <div className="text-sm text-red-600">{profileError}</div>}

            {editingProfile && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile || !hasChanges}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {infoDialogMessage && (
        <div className="fixed right-6 top-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={18} />
            </div>
            <div className="pr-2">
              <p className="text-sm font-semibold text-slate-900">Profile updated</p>
              <p className="text-sm text-slate-500">{infoDialogMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-6">
        <ThemeLanguagePanel />
        <TwoFactorSettingsPanel />
      </div>

      <AvatarCropModal
        open={!!pendingAvatarFile}
        file={pendingAvatarFile}
        onClose={() => setPendingAvatarFile(null)}
        onConfirm={handleAvatarFileChange}
      />
    </div>
  );
};

export default ProfileView;
