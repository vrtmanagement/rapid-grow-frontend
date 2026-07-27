import React from 'react';
import { Camera, X } from 'lucide-react';
import { formatDateLabel, getStatusBadgeClasses, titleCase } from './employeeProfileHelpers';

export const PROFILE_EDIT_AVATAR_INPUT_ID = 'profile-edit-avatar-input';

export interface ProfileOverviewSectionProps {
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

export const ProfileOverviewSection: React.FC<ProfileOverviewSectionProps> = ({
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

export const StatsItem: React.FC<{ label: string; value: string | number; valueClassName: string }> = ({
  label,
  value,
  valueClassName,
}) => (
  <div>
    <p className="whitespace-nowrap text-[0.84rem] font-medium text-slate-900">{label}</p>
    <p className={`mt-3 text-[2rem] font-bold ${valueClassName}`}>{value}</p>
  </div>
);

export interface ProfileEditModalProps {
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

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
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

export interface InputFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  disabled?: boolean;
  muted?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
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

