import React from 'react';
import { LeaveRequest } from './attendanceUtils';
import { getLeaveTypeLabel } from './leaveManagementPanelUtils';

interface LeaveDetailModalProps {
  selectedDetailLeave: LeaveRequest | null;
  onClose: () => void;
  viewerRole: 'employee' | 'team_lead' | 'admin';
  isApproverPortal: boolean;
  getEmployeeRecordLabel: (leave: LeaveRequest) => string;
  formatDecisionRole: (role?: string | null) => string;
  leaveDetailStatusThemes: Record<LeaveRequest['status'], { shell: string; panel: string; badge: string }>;
}

const LeaveDetailModal: React.FC<LeaveDetailModalProps> = ({
  selectedDetailLeave,
  onClose,
  viewerRole,
  isApproverPortal,
  getEmployeeRecordLabel,
  formatDecisionRole,
  leaveDetailStatusThemes,
}) => {
  if (!selectedDetailLeave) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-xl rounded-[30px] border p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] ${leaveDetailStatusThemes[selectedDetailLeave.status].shell}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Leave details</p>
            <h3 className="mt-2 text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-950">{getLeaveTypeLabel(selectedDetailLeave.type)}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className={`rounded-2xl border p-4 ${leaveDetailStatusThemes[selectedDetailLeave.status].panel}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Date range</p>
            <p className="mt-3 whitespace-nowrap text-[1.18rem] font-semibold tracking-[-0.025em] text-slate-950">
              {new Date(selectedDetailLeave.startDate).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })} {'->'} {new Date(selectedDetailLeave.endDate).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}
            </p>
          </div>
          <div className={`rounded-2xl border p-4 ${leaveDetailStatusThemes[selectedDetailLeave.status].panel}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</p>
            <div className="mt-3">
              <span className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${leaveDetailStatusThemes[selectedDetailLeave.status].badge}`}>
                {selectedDetailLeave.status}
              </span>
            </div>
          </div>
        </div>

        {isApproverPortal && getEmployeeRecordLabel(selectedDetailLeave) ? (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Employee</p>
            <p className="mt-1 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-900 shadow-sm">
              {getEmployeeRecordLabel(selectedDetailLeave)}
            </p>
          </div>
        ) : null}

        {viewerRole === 'employee' && selectedDetailLeave.status !== 'PENDING' && formatDecisionRole(selectedDetailLeave.decidedByRole) ? (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Handled by</p>
            <p className="mt-1 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-900 shadow-sm">
              {formatDecisionRole(selectedDetailLeave.decidedByRole)}
            </p>
          </div>
        ) : null}

        <div className={`mt-5 rounded-2xl border p-4 ${leaveDetailStatusThemes[selectedDetailLeave.status].panel}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Reason</p>
          <p className="mt-2 text-[17px] font-medium leading-8 tracking-[-0.015em] text-slate-950">
            {selectedDetailLeave.reason || 'No reason added'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeaveDetailModal;
