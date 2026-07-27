import React from 'react';
import { OrgAttendanceReport } from './attendanceOpsApi';

interface Props {
  monthLabel: string;
  report: OrgAttendanceReport | null;
  reportLoading: boolean;
  canReviewTeam: boolean;
}

const AttendanceReportsOverview: React.FC<Props> = ({ monthLabel, report, reportLoading, canReviewTeam }) => {
  return (
    <section className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 md:p-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">{monthLabel}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {report?.isMonthToDate
            ? `Counting day 1 through today (${report.asOfDateKey}) · ${report.coveredDays || 0} calendar days · Sundays are not marked absent`
            : report?.isFutureMonth
              ? 'This month has not started yet.'
              : `Full month through ${report?.asOfDateKey || 'month end'} · Sundays are not marked absent`}
        </p>
      </div>

      {reportLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          Loading overview…
        </div>
      ) : canReviewTeam ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Days covered', value: report?.coveredDays ?? report?.totals.coveredDays ?? '—' },
            { label: 'Working days', value: report?.totals.workingDays ?? '—' },
            { label: 'Sundays (ignored)', value: report?.totals.sundayDays ?? '—' },
            { label: 'Employees', value: report?.totals.employees ?? '—' },
            { label: 'Present days', value: report?.totals.presentDays ?? '—' },
            { label: 'Absent days', value: report?.totals.absentDays ?? '—' },
            { label: 'Leave days', value: report?.totals.leaveDays ?? '—' },
            { label: 'Presence rate', value: report ? `${report.totals.presenceRate}%` : '—' },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {card.label}
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
          Use Requests to submit a forgot-login correction. Team totals appear for managers/admins.
        </div>
      )}

      {(report?.departments || []).length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">People</th>
                <th className="px-4 py-3">Present</th>
                <th className="px-4 py-3">Absent</th>
                <th className="px-4 py-3">Leave</th>
                <th className="px-4 py-3">Late</th>
              </tr>
            </thead>
            <tbody>
              {(report?.departments || []).map((row) => (
                <tr key={row.department} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.department}</td>
                  <td className="px-4 py-3 text-slate-600">{row.employees}</td>
                  <td className="px-4 py-3 text-slate-600">{row.presentDays}</td>
                  <td className="px-4 py-3 text-slate-600">{row.absentDays}</td>
                  <td className="px-4 py-3 text-slate-600">{row.leaveDays}</td>
                  <td className="px-4 py-3 text-slate-600">{row.lateDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
};

export default AttendanceReportsOverview;
