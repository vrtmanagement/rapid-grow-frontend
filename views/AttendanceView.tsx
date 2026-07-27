import { useNavigate } from 'react-router-dom';
import { useAttendanceViewController } from '../hooks/attendance/useAttendanceViewController';
import type { AttendancePortalMode } from '../hooks/attendance/attendanceViewTypes';
import AttendancePortalSubnav from '../components/attendance/AttendancePortalSubnav';
import AttendanceViewContent from '../components/attendance/AttendanceViewContent';
import LateLoginSettingsModal from '../components/attendance/LateLoginSettingsModal';

interface Props {
  mode?: AttendancePortalMode;
}

const AttendanceView = ({ mode = 'manager' }: Props) => {
  const navigate = useNavigate();
  const ctrl = useAttendanceViewController(mode);

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-700">
      <AttendancePortalSubnav
        isEmployeePortal={ctrl.isEmployeePortal}
        isHistoryRoute={ctrl.isHistoryRoute}
        activeView={ctrl.activeView}
        hasExpenseView={ctrl.hasPermission('EXPENSE_VIEW')}
        showAttendanceSubnavControls={ctrl.showAttendanceSubnavControls}
        showLeaveSubnavControls={ctrl.showLeaveSubnavControls}
        range={ctrl.range}
        setRange={ctrl.setRange}
        headerMonthPickerRef={ctrl.headerMonthPickerRef}
        headerMonthPickerOpen={ctrl.headerMonthPickerOpen}
        setHeaderMonthPickerOpen={ctrl.setHeaderMonthPickerOpen}
        selectedMonth={ctrl.selectedMonth}
        headerSelectedMonthLabel={ctrl.headerSelectedMonthLabel}
        headerVisibleYear={ctrl.headerVisibleYear}
        setHeaderVisibleYear={ctrl.setHeaderVisibleYear}
        headerMonthItems={ctrl.headerMonthItems}
        headerCurrentDate={ctrl.headerCurrentDate}
        handleHeaderMonthSelect={ctrl.handleHeaderMonthSelect}
        setSelectedMonth={ctrl.setSelectedMonth}
        availableLeaveSections={ctrl.availableLeaveSections}
        effectiveLeaveSection={ctrl.effectiveLeaveSection}
        handleActiveViewChange={ctrl.handleActiveViewChange}
        handleLeaveSectionChange={ctrl.handleLeaveSectionChange}
        onNavigateExpense={() => navigate('/expense-travel')}
      />

      <div className={`${ctrl.attendanceContentWidthClassName} mx-auto space-y-10`}>
        <AttendanceViewContent ctrl={ctrl} />

        <LateLoginSettingsModal
          open={ctrl.lateLoginSettingsModalOpen}
          isBackendAdminRole={ctrl.isBackendAdminRole}
          lateLoginCutoffDraft={ctrl.lateLoginCutoffDraft}
          currentLateLoginCutoffLabel={ctrl.currentLateLoginCutoffLabel}
          lateLoginSettingsMessage={ctrl.lateLoginSettingsMessage}
          lateLoginSettingsSaving={ctrl.lateLoginSettingsSaving}
          onCutoffDraftChange={ctrl.setLateLoginCutoffDraft}
          onClose={() => {
            ctrl.setLateLoginSettingsModalOpen(false);
            ctrl.setLateLoginSettingsMessage(null);
          }}
          onSave={() => {
            void ctrl.handleUpdateLateLoginCutoff();
          }}
        />
      </div>
    </div>
  );
};

export default AttendanceView;
