import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import {
  AttendanceOpsSettings,
  AttendanceRegularization,
  CompanyHoliday,
  OrgAttendanceReport,
  clearLateLoginRecords,
  clearRegularizations,
  createHoliday,
  createRegularization,
  decideRegularization,
  deleteHoliday,
  deleteLateLoginRecord,
  deleteRegularization,
  downloadOrgAttendanceReport,
  fetchAttendanceOpsSettings,
  fetchHolidays,
  fetchOrgAttendanceReport,
  fetchRegularizations,
  runLoginReminderNow,
  updateAttendanceOpsSettings,
} from './attendanceOpsApi';
import { getDefaultMonth, LateRecord } from './attendanceReportsPanelUtils';
import AttendanceReportsOverview from './AttendanceReportsOverview';
import AttendanceReportsEmployees from './AttendanceReportsEmployees';
import AttendanceReportsRequests, { RegularizationFormState } from './AttendanceReportsRequests';
import AttendanceReportsSetupSection from './AttendanceReportsSetupSection';
import { API_BASE, getAuthHeaders } from '../../config/api';

type ReportSection = 'overview' | 'employees' | 'requests' | 'setup';

interface Props {
  canManageOps: boolean;
  canReviewTeam: boolean;
  defaultMonth?: string;
  defaultSection?: ReportSection;
}

const SECTION_TABS: Array<{
  id: ReportSection;
  label: string;
  teamOnly?: boolean;
  adminOnly?: boolean;
}> = [
  { id: 'overview', label: '1. Overview', teamOnly: true },
  { id: 'employees', label: '2. Employees', teamOnly: true },
  { id: 'requests', label: '3. Requests' },
  { id: 'setup', label: '4. Setup', adminOnly: true },
];

const AttendanceReportsPanel: React.FC<Props> = ({
  canManageOps,
  canReviewTeam,
  defaultMonth,
  defaultSection = 'overview',
}) => {
  const [section, setSection] = useState<ReportSection>(defaultSection);
  const [month, setMonth] = useState(defaultMonth || getDefaultMonth());
  const [department, setDepartment] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [report, setReport] = useState<OrgAttendanceReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'info'; message: string } | null>(null);

  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidaySaving, setHolidaySaving] = useState(false);

  const [opsSettings, setOpsSettings] = useState<AttendanceOpsSettings | null>(null);
  const [opsDraft, setOpsDraft] = useState({
    officeStartTime: '09:30',
    whatsappReminderEnabled: true,
    reminderGraceMinutes: 0,
    reminderMessage:
      "Hey {{name}}, it's login time at the office. Please hurry up and clock in on Rapid Grow. Thanks!",
    skipWeekends: true,
  });
  const [opsSaving, setOpsSaving] = useState(false);
  const [reminderRunning, setReminderRunning] = useState(false);

  const [myRegularizations, setMyRegularizations] = useState<AttendanceRegularization[]>([]);
  const [teamRegularizations, setTeamRegularizations] = useState<AttendanceRegularization[]>([]);
  const [lateRecords, setLateRecords] = useState<LateRecord[]>([]);
  const [regForm, setRegForm] = useState<RegularizationFormState>({
    dateKey: '',
    reason: '',
    requestType: 'MISSED_PUNCH',
    proposedLoginTime: '09:30',
    proposedLogoutTime: '18:30',
  });
  const [regSaving, setRegSaving] = useState(false);

  const showToast = useCallback((tone: 'success' | 'info', message: string) => {
    setToast({ tone, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadReport = useCallback(async () => {
    if (!canReviewTeam) return;
    setReportLoading(true);
    try {
      const data = await fetchOrgAttendanceReport({
        month,
        department: department || undefined,
      });
      setReport(data);
    } catch (error) {
      console.error(error);
      showToast('info', error instanceof Error ? error.message : 'Unable to load report');
    } finally {
      setReportLoading(false);
    }
  }, [canReviewTeam, department, month, showToast]);

  const loadHolidays = useCallback(async () => {
    try {
      const year = Number(String(month).slice(0, 4)) || new Date().getFullYear();
      setHolidays(await fetchHolidays(year));
    } catch (error) {
      console.error(error);
    }
  }, [month]);

  const loadOps = useCallback(async () => {
    if (!canManageOps) return;
    try {
      const settings = await fetchAttendanceOpsSettings();
      setOpsSettings(settings);
      setOpsDraft({
        officeStartTime: settings.officeStartTime || '09:30',
        whatsappReminderEnabled: settings.whatsappReminderEnabled,
        reminderGraceMinutes: settings.reminderGraceMinutes,
        reminderMessage: settings.reminderMessage,
        skipWeekends: settings.skipWeekends,
      });
    } catch (error) {
      console.error(error);
    }
  }, [canManageOps]);

  const loadRequests = useCallback(async () => {
    try {
      const mine = await fetchRegularizations({ scope: 'me' });
      setMyRegularizations(mine);

      if (canReviewTeam || canManageOps) {
        const team = await fetchRegularizations({ scope: 'team' });
        setTeamRegularizations(team);
      }

      if (canReviewTeam || canManageOps) {
        const response = await fetch(`${API_BASE}/attendance/team-summary`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          setLateRecords(Array.isArray(data?.lateLoginRecords) ? data.lateLoginRecords : []);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }, [canManageOps, canReviewTeam]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    void loadHolidays();
    void loadOps();
    void loadRequests();
  }, [loadHolidays, loadOps, loadRequests]);

  const departmentOptions = useMemo(() => {
    const fromReport = (report?.departments || []).map((row) => row.department);
    return Array.from(new Set(fromReport.filter(Boolean))).sort();
  }, [report]);

  const filteredEmployees = useMemo(() => {
    const rows = report?.employees || [];
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.empName, row.empId, row.department, row.designation]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [employeeSearch, report]);

  const pendingRegularizations = useMemo(
    () => teamRegularizations.filter((row) => row.status === 'PENDING'),
    [teamRegularizations],
  );
  const pendingLateRecords = useMemo(
    () => lateRecords.filter((row) => row.status === 'REQUESTED'),
    [lateRecords],
  );

  const visibleTabs = useMemo(
    () =>
      SECTION_TABS.filter((tab) => {
        if (tab.teamOnly && !canReviewTeam) return false;
        if (tab.adminOnly && !(canManageOps || canReviewTeam)) return false;
        return true;
      }),
    [canManageOps, canReviewTeam],
  );

  useEffect(() => {
    const allowed = new Set(visibleTabs.map((tab) => tab.id));
    if (!allowed.has(section)) {
      setSection(canReviewTeam ? 'overview' : 'requests');
    }
  }, [canReviewTeam, section, visibleTabs]);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const file = await downloadOrgAttendanceReport({
        month,
        department: department || undefined,
      });
      const url = window.URL.createObjectURL(file.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Attendance report exported');
    } catch (error) {
      showToast('info', error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportFilteredEmployees = () => {
    if (!filteredEmployees.length) {
      showToast('info', 'No employees to export for this search');
      return;
    }

    const escapeCsv = (value: string | number) => {
      const text = String(value ?? '');
      if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
      return text;
    };

    const lines = [
      [
        'Employee ID',
        'Name',
        'Department',
        'Designation',
        'Days Covered',
        'Present',
        'Absent',
        'Leave',
        'Late',
        'Sunday',
        'Presence %',
      ].join(','),
      ...filteredEmployees.map((row) =>
        [
          row.empId,
          row.empName,
          row.department,
          row.designation,
          row.coveredDays ?? report?.coveredDays ?? '',
          row.presentDays,
          row.absentDays,
          row.leaveDays,
          row.lateDays,
          row.sundayDays ?? row.weekendDays ?? 0,
          row.presenceRate,
        ]
          .map(escapeCsv)
          .join(','),
      ),
    ];

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const searchSuffix = employeeSearch.trim()
      ? `-search-${employeeSearch.trim().replace(/\s+/g, '-')}`
      : '';
    anchor.href = url;
    anchor.download = `employee-attendance-${month}${searchSuffix}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    showToast('success', `Exported ${filteredEmployees.length} employee row(s)`);
  };

  const handleAddHoliday = async () => {
    if (!holidayDate || !holidayName.trim()) {
      showToast('info', 'Add holiday date and name');
      return;
    }
    setHolidaySaving(true);
    try {
      await createHoliday({ dateKey: holidayDate, name: holidayName.trim() });
      setHolidayDate('');
      setHolidayName('');
      await Promise.all([loadHolidays(), loadReport()]);
      showToast('success', 'Holiday saved');
    } catch (error) {
      showToast('info', error instanceof Error ? error.message : 'Unable to save holiday');
    } finally {
      setHolidaySaving(false);
    }
  };

  const handleSaveOps = async () => {
    setOpsSaving(true);
    try {
      const saved = await updateAttendanceOpsSettings(opsDraft);
      setOpsSettings(saved);
      showToast('success', 'Settings saved');
    } catch (error) {
      showToast('info', error instanceof Error ? error.message : 'Unable to save settings');
    } finally {
      setOpsSaving(false);
    }
  };

  const handleRunReminder = async () => {
    setReminderRunning(true);
    try {
      const result = await runLoginReminderNow();
      if (result.skipped) {
        showToast('info', `Skipped: ${String(result.reason || 'not ready').replace(/_/g, ' ')}`);
      } else {
        showToast(
          'success',
          `Reminders sent: ${result.sent || 0} · failed: ${result.failed || 0} · skipped: ${result.skippedCount || 0}`,
        );
      }
    } catch (error) {
      showToast('info', error instanceof Error ? error.message : 'Unable to run reminders');
    } finally {
      setReminderRunning(false);
    }
  };

  const handleCreateRegularization = async () => {
    if (!regForm.dateKey || !regForm.reason.trim()) {
      showToast('info', 'Date and reason are required');
      return;
    }
    setRegSaving(true);
    try {
      await createRegularization({
        dateKey: regForm.dateKey,
        reason: regForm.reason.trim(),
        requestType: regForm.requestType,
        proposedLoginTime: regForm.proposedLoginTime || undefined,
        proposedLogoutTime: regForm.proposedLogoutTime || undefined,
      });
      setRegForm((prev) => ({ ...prev, reason: '' }));
      await loadRequests();
      setSection('requests');
      showToast('success', 'Request sent to admin');
    } catch (error) {
      showToast('info', error instanceof Error ? error.message : 'Unable to submit request');
    } finally {
      setRegSaving(false);
    }
  };

  const handleDecide = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await decideRegularization(id, { status });
      await Promise.all([loadRequests(), loadReport()]);
      showToast('success', status === 'APPROVED' ? 'Approved' : 'Rejected');
    } catch (error) {
      showToast('info', error instanceof Error ? error.message : 'Unable to update request');
    }
  };

  const handleClearLateLoginRecords = async () => {
    try {
      const result = await clearLateLoginRecords();
      await loadRequests();
      showToast(
        'success',
        `Cleared late records (${(result.deletedAttempts || 0) + (result.deletedApprovals || 0)})`,
      );
    } catch (error) {
      showToast('info', error instanceof Error ? error.message : 'Clear failed');
    }
  };

  const handleClearRegularizationsAll = async () => {
    try {
      const result = await clearRegularizations();
      await loadRequests();
      showToast('success', `Cleared ${result.deletedCount || 0} correction records`);
    } catch (error) {
      showToast('info', error instanceof Error ? error.message : 'Clear failed');
    }
  };

  const handleDeleteLateLoginRecordRow = async (id: string) => {
    try {
      await deleteLateLoginRecord(id);
      await loadRequests();
      showToast('success', 'Late login record deleted');
    } catch (error) {
      showToast('info', error instanceof Error ? error.message : 'Delete failed');
    }
  };

  const handleDeleteRegularizationRow = async (id: string) => {
    try {
      await deleteRegularization(id);
      await loadRequests();
      showToast('success', 'Request deleted');
    } catch (error) {
      showToast('info', error instanceof Error ? error.message : 'Delete failed');
    }
  };

  const handleDeleteHolidayRow = async (id: string) => {
    await deleteHoliday(id);
    await Promise.all([loadHolidays(), loadReport()]);
    showToast('success', 'Holiday removed');
  };

  const monthLabel = useMemo(() => {
    const parsed = new Date(`${month}-01T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return month;
    return parsed.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [month]);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl text-slate-900 leading-none">
              {canReviewTeam ? 'Attendance Reports' : 'My attendance requests'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 md:text-base">
              {canReviewTeam
                ? 'Clear month totals, employee search, and an admin inbox for late-login / forgot-login requests.'
                : 'Submit forgot-login or wrong-time corrections. Admins get a notification in the portal.'}
            </p>
          </div>
          {canReviewTeam || canManageOps ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Month
                <input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
                />
              </label>
              {canReviewTeam ? (
                <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Department
                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="min-w-[150px] rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
                  >
                    <option value="">All</option>
                    {departmentOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void loadReport();
                  void loadRequests();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              {canReviewTeam ? (
                <button
                  type="button"
                  onClick={() => void handleExport()}
                  disabled={exportLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Download size={14} />
                  {exportLoading ? 'Exporting…' : 'Export CSV'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {visibleTabs.length > 1 ? (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  section === tab.id
                    ? 'bg-brand-red text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
                {tab.id === 'requests' && pendingLateRecords.length + pendingRegularizations.length > 0
                  ? ` (${pendingLateRecords.length + pendingRegularizations.length})`
                  : ''}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {toast ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            toast.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {section === 'overview' ? (
        <AttendanceReportsOverview
          monthLabel={monthLabel}
          report={report}
          reportLoading={reportLoading}
          canReviewTeam={canReviewTeam}
        />
      ) : null}

      {section === 'employees' ? (
        <AttendanceReportsEmployees
          canReviewTeam={canReviewTeam}
          filteredEmployees={filteredEmployees}
          report={report}
          employeeSearch={employeeSearch}
          onEmployeeSearchChange={setEmployeeSearch}
          onExportFilteredEmployees={handleExportFilteredEmployees}
        />
      ) : null}

      {section === 'requests' ? (
        <AttendanceReportsRequests
          canReviewTeam={canReviewTeam}
          canManageOps={canManageOps}
          pendingLateRecords={pendingLateRecords}
          pendingRegularizations={pendingRegularizations}
          lateRecords={lateRecords}
          myRegularizations={myRegularizations}
          regForm={regForm}
          setRegForm={setRegForm}
          regSaving={regSaving}
          onCreateRegularization={() => void handleCreateRegularization()}
          onDecide={(id, status) => void handleDecide(id, status)}
          onClearLateLoginRecords={() => void handleClearLateLoginRecords()}
          onClearRegularizations={() => void handleClearRegularizationsAll()}
          onDeleteLateLoginRecord={(id) => void handleDeleteLateLoginRecordRow(id)}
          onDeleteRegularization={(id) => void handleDeleteRegularizationRow(id)}
        />
      ) : null}

      {section === 'setup' ? (
        <AttendanceReportsSetupSection
          canManageOps={canManageOps}
          onToast={showToast}
          holidays={holidays}
          holidayName={holidayName}
          holidayDate={holidayDate}
          holidaySaving={holidaySaving}
          setHolidayName={setHolidayName}
          setHolidayDate={setHolidayDate}
          onAddHoliday={() => void handleAddHoliday()}
          onDeleteHoliday={(id) => void handleDeleteHolidayRow(id)}
          opsSettings={opsSettings}
          opsDraft={opsDraft}
          setOpsDraft={setOpsDraft}
          opsSaving={opsSaving}
          reminderRunning={reminderRunning}
          onSaveOps={() => void handleSaveOps()}
          onRunReminder={() => void handleRunReminder()}
        />
      ) : null}
    </div>
  );
};

export default AttendanceReportsPanel;
