import React from 'react';
import { AttendanceSummaryResponse, formatMinutes, getBadgeColorsByMinutes } from './attendanceUtils';

interface Props {
  open: boolean;
  onClose: () => void;
  summary: AttendanceSummaryResponse | null;
}

const AttendanceHistoryModal: React.FC<Props> = ({ open, onClose, summary }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Attendance history</h3>
            <p className="text-[11px] text-slate-500">
              All days within the selected window with login / logout timestamps.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {summary && summary.days.length > 0 ? (
            summary.days
              .slice()
              .reverse()
              .map((d) => {
                const badge = getBadgeColorsByMinutes(d.minutes);
                return (
                  <div
                    key={d.date}
                    className="rounded-2xl border border-slate-100 p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {new Date(d.date).toLocaleDateString()}
                        </span>
                      </div>
                      <span
                        className="px-2 py-1 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {formatMinutes(d.minutes)}
                      </span>
                    </div>
                    {d.sessions.length === 0 ? (
                      <p className="text-slate-400">No sessions</p>
                    ) : (
                      <div className="space-y-1">
                        {d.sessions.map((s) => (
                          <div
                            key={s._id}
                            className="flex items-center justify-between text-[11px] text-slate-600"
                          >
                            <span>
                              {new Date(s.loginTime).toLocaleTimeString()} –{' '}
                              {s.logoutTime
                                ? new Date(s.logoutTime).toLocaleTimeString()
                                : 'active'}
                            </span>
                            <span className="font-mono text-slate-500">
                              {formatMinutes(s.durationMinutes || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          ) : (
            <p className="text-xs text-slate-500">
              No historical records for this window.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceHistoryModal;

