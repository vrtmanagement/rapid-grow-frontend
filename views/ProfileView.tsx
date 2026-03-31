
import React, { useMemo, useState } from 'react';
import { PlanningState, TeamMember } from '../types';
import { API_BASE, getAuthHeaders } from '../config/api';
import { User, Eye, EyeOff, Check, Settings, Image as ImageIcon } from 'lucide-react';
import AvatarCropModal from '../components/profile/AvatarCropModal';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const SUPER_ADMIN_EMAIL = 'akumar@vrt9.com';


const ProfileView: React.FC<Props> = ({ state, updateState }) => {
  const isSuperAdmin = state.currentUser.email === SUPER_ADMIN_EMAIL;
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

  const handleUserRecordChange = (updates: Partial<TeamMember>) => {
    setHasChanges(true);
    updateState(prev => {
      const updatedUser = { ...prev.currentUser, ...updates };
      const updatedTeam = prev.team.map(m => (m.id === prev.currentUser.id ? updatedUser : m));
      return { ...prev, currentUser: updatedUser, team: updatedTeam };
    });
    if (updates.avatar) {
      try {
        const raw = localStorage.getItem('rapidgrow-admin');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.employee = { ...(parsed.employee || {}), avatar: updates.avatar };
          localStorage.setItem('rapidgrow-admin', JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }
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
      handleUserRecordChange({ avatar: nextAvatar });
      setHasChanges(true);
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
    const isUrlAvatar =
      trimmedAvatar.startsWith('http://') || trimmedAvatar.startsWith('https://');
    if (isUrlAvatar && trimmedAvatar && trimmedAvatar !== backendAvatar) {
      body.avatar = trimmedAvatar;
    }
    if (!backendEmployee || !backendEmployee._id || Object.keys(body).length === 0) {
      if (profileName.trim() && profileName.trim() !== state.currentUser.name) {
        handleUserRecordChange({ name: profileName.trim() || state.currentUser.name });
      }
      setProfilePassword('');
      setHasChanges(false);
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
        const raw = localStorage.getItem('rapidgrow-admin');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.employee = {
            ...(parsed.employee || {}),
            ...data,
            avatar: persistedAvatar || parsed.employee?.avatar,
          };
          localStorage.setItem('rapidgrow-admin', JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }
      setProfilePassword('');
      setHasChanges(false);
      setInfoDialogMessage('Profile updated successfully.');
    } catch (e: any) {
      setProfileError(e?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const displayAvatar =
    state.currentUser.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      (backendEmployee?.empName || state.currentUser.name || 'User').replace(/\s/g, ''),
    )}`;

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pb-24 relative">
      <div className="bg-white p-16 rounded-[4rem] shadow-xl border border-slate-200 overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 border-b border-slate-50 pb-16 mb-16">
          <div className="flex items-center gap-10">
            <div className="w-24 h-24 bg-indigo-950 rounded-[3rem] flex items-center justify-center text-white shadow-3xl rotate-6 group">
              <Settings size={48} className="group-hover:rotate-180 transition-all duration-1000" />
            </div>
            <div>
              <h2 className="text-6xl text-slate-900 leading-none">{state.uiConfig.profileTitle}</h2>
              <p className="text-slate-500 text-xl mt-3">{state.uiConfig.profileSub}</p>
            </div>
          </div>
        </div>

        <div className="min-h-[400px] animate-in slide-in-from-bottom-6">
          <div className="flex flex-col md:flex-row gap-20 items-start">
            <div className="w-full md:w-1/3 flex flex-col items-center gap-8">
              <div className="aspect-square bg-slate-100 rounded-[4rem] border-[12px] border-white shadow-3xl overflow-hidden relative group">
                <img
                  src={displayAvatar}
                  className="w-full h-full object-cover transition-all group-hover:scale-110"
                  alt="Profile"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-[12px] text-center p-8">
                  Update profile image using URL or upload below
                </div>
              </div>
              <div className="w-full space-y-3">
                <label className="text-[13px] text-slate-700 px-2 flex items-center gap-2">
                  <ImageIcon size={16} /> Profile image URL
                </label>
                <input
                  type="text"
                  value={state.currentUser.avatar || ''}
                  onChange={e => handleUserRecordChange({ avatar: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  placeholder="https://example.com/avatar.png"
                />
                <div className="space-y-2 px-2">
                  <label className="text-[13px] text-slate-700">Or upload profile image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        setPendingAvatarFile(file);
                      }
                      e.target.value = '';
                    }}
                    className="block w-full text-[13px] text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[13px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    disabled={uploadingAvatar}
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 w-full space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[13px] text-slate-700 px-2 flex items-center gap-2">
                    <User size={16} /> Full name
                  </label>
                <input
                    type="text"
                    value={profileName}
                  onChange={e => {
                    setProfileName(e.target.value);
                    setHasChanges(true);
                  }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-md text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[13px] text-slate-700 px-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={profilePassword}
                      onChange={e => {
                        setProfilePassword(e.target.value);
                        setHasChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-md text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all pr-12"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[13px] text-slate-700 px-2">Email</label>
                  <input
                    type="text"
                    value={state.currentUser.email}
                    readOnly
                    className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-md text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>

                {backendEmployee?.empId && (
                  <div className="space-y-3">
                    <label className="text-[13px] text-slate-700 px-2">Employee ID</label>
                    <input
                      type="text"
                      value={backendEmployee.empId}
                      readOnly
                      className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-md text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>
                )}

                {backendEmployee?.designation && (
                  <div className="space-y-3">
                    <label className="text-[13px] text-slate-700 px-2">Designation</label>
                    <input
                      type="text"
                      value={backendEmployee.designation}
                      readOnly
                      className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-md text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>
                )}

                {backendEmployee?.department && (
                  <div className="space-y-3">
                    <label className="text-[13px] text-slate-700 px-2">Department</label>
                    <input
                      type="text"
                      value={backendEmployee.department}
                      readOnly
                      className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-md text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>
                )}

                {backendEmployee?.phone && (
                  <div className="space-y-3">
                    <label className="text-[13px] text-slate-700 px-2">Phone</label>
                    <input
                      type="text"
                      value={backendEmployee.phone}
                      readOnly
                      className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-md text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {profileError && (
                <div className="text-[13px] text-red-600 px-2">
                  {profileError}
                </div>
              )}
              {uploadingAvatar && (
                <div className="text-[13px] text-slate-600 px-2">Uploading profile image...</div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile || !hasChanges}
                  className="px-8 py-3 rounded-full bg-indigo-600 text-white text-[14px] font-bold tracking-[0.15em] uppercase shadow-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingProfile ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {infoDialogMessage && (
          <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
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

        <AvatarCropModal
          open={!!pendingAvatarFile}
          file={pendingAvatarFile}
          onClose={() => setPendingAvatarFile(null)}
          onConfirm={handleAvatarFileChange}
        />
      </div>
    </div>
  );
};

export default ProfileView;
