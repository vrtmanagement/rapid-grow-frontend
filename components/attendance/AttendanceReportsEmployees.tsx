import React from 'react';
import { Download, Search } from 'lucide-react';
import { OrgAttendanceReport } from './attendanceOpsApi';

interface Props {
  canReviewTeam: boolean;
  filteredEmployees: OrgAttendanceReport['employees'];
  report: OrgAttendanceReport | null;
  employeeSearch: string;
  onEmployeeSearchChange: (value: string) => void;
  onExportFilteredEmployees: () => void;
}

const AttendanceReportsEmployees: React.FC<Props> = ({
  canReviewTeam,
  filteredEmployees,
  report,
  employeeSearch,
  onEmployeeSearchChange,
  onExportFilteredEmployees,
}) => {
  return (
    <section className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Employee attendance</h3>
          <p className="mt-1 text-sm text-slate-500">
            Present / leave / absent inside the counted days. Sundays are excluded from absent.
          </p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-2">
          <button
            type="button"
            onClick={onExportFilteredEmployees}
            disabled={!canReviewTeam || filteredEmployees.length === 0}
            className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} />
            Export
          </button>
          <label className="relative block w-full">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={employeeSearch}
              onChange={(event) => onEmployeeSearchChange(event.target.value)}
              placeholder="Search name, ID, or department"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-800"
            />
          </label>
        </div>
      </div>

      {!canReviewTeam ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
          Employee report table is available to managers and admins.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Present</th>
                <th className="px-4 py-3">Absent</th>
                <th className="px-4 py-3">Leave</th>
                <th className="px-4 py-3">Late</th>
                <th className="px-4 py-3">Sunday</th>
                <th className="px-4 py-3">Presence</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((row) => (
                <tr key={row.empId} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{row.empName}</div>
                    <div className="text-xs text-slate-400">
                      {row.empId}
                      {row.department ? ` · ${row.department}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.coveredDays ?? report?.coveredDays ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{row.presentDays}</td>
                  <td className="px-4 py-3 text-slate-600">{row.absentDays}</td>
                  <td className="px-4 py-3 text-slate-600">{row.leaveDays}</td>
                  <td className="px-4 py-3 text-slate-600">{row.lateDays}</td>
                  <td className="px-4 py-3 text-slate-600">{row.sundayDays ?? row.weekendDays ?? 0}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.presenceRate}%</td>
                </tr>
              ))}
              {!filteredEmployees.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No employees match this search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AttendanceReportsEmployees;
