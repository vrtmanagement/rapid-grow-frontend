import React from 'react';

interface LateLoginSettingsModalProps {
  open: boolean;
  isBackendAdminRole: boolean;
  lateLoginCutoffDraft: string;
  currentLateLoginCutoffLabel: string;
  lateLoginSettingsMessage: string | null;
  lateLoginSettingsSaving: boolean;
  onCutoffDraftChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

const LateLoginSettingsModal: React.FC<LateLoginSettingsModalProps> = ({
  open,
  isBackendAdminRole,
  lateLoginCutoffDraft,
  currentLateLoginCutoffLabel,
  lateLoginSettingsMessage,
  lateLoginSettingsSaving,
  onCutoffDraftChange,
  onClose,
  onSave,
}) => {
  if (!open || !isBackendAdminRole) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Late login cutoff
            </p>
            <h4 className="mt-2 text-xl font-semibold text-slate-950">
              Update login restriction time
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Only admins can change the daily cutoff time for late-login approval.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            Close
          </button>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-[13px] font-semibold text-slate-700">
            Cutoff time
          </span>
          <input
            type="time"
            value={lateLoginCutoffDraft}
            onChange={(event) => onCutoffDraftChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/10"
          />
        </label>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Current cutoff: {currentLateLoginCutoffLabel}
        </div>

        {lateLoginSettingsMessage ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {lateLoginSettingsMessage}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={lateLoginSettingsSaving || !lateLoginCutoffDraft}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              lateLoginSettingsSaving || !lateLoginCutoffDraft
                ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {lateLoginSettingsSaving ? 'Saving...' : 'Update cutoff time'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LateLoginSettingsModal;
