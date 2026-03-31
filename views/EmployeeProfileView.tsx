import React, { useState, useEffect } from 'react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { User, Eye, EyeOff, Image as ImageIcon, Check } from 'lucide-react';
import { PlanningState, TeamMember } from '../types';
import AvatarCropModal from '../components/profile/AvatarCropModal';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const EmployeeProfileView: React.FC<Props> = ({ state, updateState }) => {
  const [employee, setEmployee] = useState<any>(null);
  const [profileName, setProfileName] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [avatar, setAvatar] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  const syncCurrentUser = (updates: Partial<TeamMember>) => {
    updateState(prev => {
      const updatedUser = { ...prev.currentUser, ...updates };
      const updatedTeam = prev.team.map(m => (m.id === prev.currentUser.id ? updatedUser : m));
      return { ...prev, currentUser: updatedUser, team: updatedTeam };
    });
  };

  useEffect(() => {
    const stored = localStorage.getItem('rapidgrow-admin');
    if (!stored) return;
    try {
      const { employee: emp } = JSON.parse(stored);
      setEmployee(emp);
      setProfileName(emp?.empName || '');
      setAvatar(emp?.avatar || '');
      syncCurrentUser({
        name: emp?.empName || state.currentUser.name,
        email: emp?.email || state.currentUser.email,
        avatar: emp?.avatar || state.currentUser.avatar,
      });
    } catch {
      // ignore
    }
    // we intentionally don't include dependencies to avoid re-sync loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!infoMessage) return;
    const timer = window.setTimeout(() => setInfoMessage(null), 2000);
    return () => window.clearTimeout(timer);
  }, [infoMessage]);

  if (!employee) return null;

  const displayAvatar =
    avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      (employee.empName || 'User').replace(/\s/g, ''),
    )}`;

  const handleAvatarFileChange = async (file: File | null) => {
    if (!file) return;
    if (!employee?._id) return;
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
      setAvatar(nextAvatar);
      setHasChanges(true);
      syncCurrentUser({ avatar: nextAvatar });
    } catch (e: any) {
      setError(e?.message || 'Failed to upload profile image');
      throw e;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!employee?._id && !employee?.empId) {
      return;
    }
    setError(null);
    const body: any = {};
    if (profileName.trim() && profileName.trim() !== employee.empName) {
      body.empName = profileName.trim();
    }
    if (profilePassword.trim()) {
      body.password = profilePassword.trim();
    }
    const trimmedAvatar = avatar.trim();
    const isUrlAvatar =
      trimmedAvatar.startsWith('http://') || trimmedAvatar.startsWith('https://');
    if (isUrlAvatar && trimmedAvatar !== (employee.avatar || '')) {
      body.avatar = trimmedAvatar;
    }
    if (Object.keys(body).length === 0) {
      // Only image changed (name/password unchanged) – treat as successful local update
      setHasChanges(false);
      setInfoMessage('Profile updated successfully.');
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
        (data as any).avatar && typeof (data as any).avatar === 'string'
          ? (data as any).avatar
          : isUrlAvatar
          ? trimmedAvatar
          : employee.avatar;
      const nextEmployee = {
        ...employee,
        ...data,
        avatar: persistedAvatar,
        empName: data.empName || profileName,
      };
      setEmployee(nextEmployee);
      setAvatar(persistedAvatar || '');
      syncCurrentUser({ name: nextEmployee.empName, avatar: persistedAvatar || '' });
      setProfilePassword('');
      setHasChanges(false);

      try {
        const stored = localStorage.getItem('rapidgrow-admin');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.employee = nextEmployee;
          localStorage.setItem('rapidgrow-admin', JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }
      setInfoMessage('Profile updated successfully.');
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1.5 w-8 bg-brand-red rounded-full" />
          <span className="text-[15px] text-slate-500">Core identity</span>
        </div>
        <h2 className="text-4xl text-slate-900 leading-none">My Profile</h2>
        <p className="text-slate-500 text-lg mt-3">
          View your details and update your name, password, and profile image.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border-4 border-white shadow-lg">
              <img src={displayAvatar} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-2xl font-bold text-slate-900 break-words">{employee.empName}</h3>
            <p className="text-slate-600">
              {employee.designation} • {employee.department}
            </p>
            <span className="inline-block mt-1 px-4 py-1.5 bg-green-100 text-green-700 text-sm font-semibold rounded-full capitalize">
              {employee.status || 'active'}
            </span>
          </div>
        </div>

        <div className="p-8 space-y-10">
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
                  syncCurrentUser({ name: e.target.value });
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
                value={employee.email}
                readOnly
                className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-md text-slate-500 outline-none cursor-not-allowed"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[13px] text-slate-700 px-2">Employee ID</label>
              <input
                type="text"
                value={employee.empId}
                readOnly
                className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-md text-slate-500 outline-none cursor-not-allowed"
              />
            </div>

            {employee.phone && (
              <div className="space-y-3">
                <label className="text-[13px] text-slate-700 px-2">Phone</label>
                <input
                  type="text"
                  value={employee.phone}
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-md text-slate-500 outline-none cursor-not-allowed"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-[13px] text-slate-700 px-2 flex items-center gap-2">
              <ImageIcon size={16} /> Profile image URL
            </label>
            <input
              type="text"
              value={avatar}
              onChange={e => {
                const next = e.target.value;
                setAvatar(next);
                setHasChanges(true);
                syncCurrentUser({ avatar: next });
                try {
                  const stored = localStorage.getItem('rapidgrow-admin');
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    parsed.employee = { ...(parsed.employee || {}), avatar: next };
                    localStorage.setItem('rapidgrow-admin', JSON.stringify(parsed));
                  }
                } catch {
                  // ignore
                }
              }}
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
          {uploadingAvatar && <div className="text-[13px] text-slate-600">Uploading profile image...</div>}

          {error && (
            <div className="text-[13px] text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-8 py-3 rounded-full bg-indigo-600 text-white text-[14px] font-bold tracking-[0.15em] uppercase shadow-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      {infoMessage && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
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
