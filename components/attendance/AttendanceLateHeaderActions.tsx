import React from 'react';
import { Clock } from 'lucide-react';
import type { LateLoginSettings } from './attendanceUtils';
import type { AttendanceSummaryResponse } from './attendanceUtils';

interface AttendanceLateHeaderActionsProps {
  activeView: 'attendance' | 'leave' | 'late' | 'reports';
  isBackendAdminRole: boolean;
  currentLateLoginCutoffLabel: string;
  lateLoginSettings: LateLoginSettings | null;
  summary: AttendanceSummaryResponse | null;
  lateLoginSettingsLoading: boolean;
  setLateLoginCutoffDraft: (value: string) => void;
  setLateLoginSettingsMessage: (value: string | null) => void;
  setLateLoginSettingsModalOpen: (value: boolean) => void;
}

const AttendanceLateHeaderActions: React.FC<AttendanceLateHeaderActionsProps> = ({
  activeView,
  isBackendAdminRole,
  currentLateLoginCutoffLabel,
  lateLoginSettings,
  summary,
  lateLoginSettingsLoading,
  setLateLoginCutoffDraft,
  setLateLoginSettingsMessage,
  setLateLoginSettingsModalOpen,
}) => {
  if (activeView !== 'late' || !isBackendAdminRole) {
    return null;
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Late cutoff
      </span>
      <button
        type="button"
        onClick={() => {
          setLateLoginCutoffDraft(lateLoginSettings?.time || summary?.lateLoginPolicy?.cutoffTimeValue || '13:05');
          setLateLoginSettingsMessage(null);
          setLateLoginSettingsModalOpen(true);
        }}
        disabled={lateLoginSettingsLoading}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-colors hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Clock size={16} />
        <span>{currentLateLoginCutoffLabel}</span>
        <span className="text-slate-400">Edit</span>
      </button>
    </div>
  );
};

export default AttendanceLateHeaderActions;
