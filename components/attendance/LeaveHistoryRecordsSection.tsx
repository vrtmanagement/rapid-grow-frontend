import React, { RefObject } from 'react';
import { Sparkles } from 'lucide-react';
import { LeaveRequest } from './attendanceUtils';
import { AttendanceLeaveOverviewSkeleton } from '../ui/Skeleton';
import FilterDropdown, { type FilterDropdownOption } from './FilterDropdown';
import LeaveHistoryCard from './LeaveHistoryCard';
import { calculateLeaveDays, getEmployeeRecordLabel } from './leaveManagementPanelUtils';

interface LeaveHistoryRecordsSectionProps {
  showHistoryEmployeeFilter: boolean;
  statusFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
  setStatusFilter: React.Dispatch<React.SetStateAction<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>>;
  historyStatusLabel: string;
  historyStatusOptions: FilterDropdownOption[];
  historyStatusPickerOpen: boolean;
  setHistoryStatusPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setHistoryEmployeePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setHistoryMonthPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  historyStatusPickerRef: RefObject<HTMLDivElement | null>;
  historyEmployeeFilter: string;
  setHistoryEmployeeFilter: (value: string) => void;
  historyEmployeeLabel: string;
  historyEmployeeOptions: string[];
  formatHistoryEmployeeOptionLabel: (label: string) => string;
  historyEmployeePickerOpen: boolean;
  historyEmployeePickerRef: RefObject<HTMLDivElement | null>;
  historyMonthFilter: string;
  setHistoryMonthFilter: (value: string) => void;
  historyMonthLabel: string;
  historyMonthOptions: string[];
  historyMonthPickerOpen: boolean;
  historyMonthPickerRef: RefObject<HTMLDivElement | null>;
  leaveLoading: boolean;
  filteredLeaves: LeaveRequest[];
  isApproverPortal: boolean;
  viewerRole: 'employee' | 'team_lead' | 'admin';
  getDecisionLabel: (leave: LeaveRequest) => string;
  onViewDetails: (leave: LeaveRequest) => void;
  onEditLeave: (leave: LeaveRequest) => void;
  onDeleteLeave: (leave: LeaveRequest) => void;
}

const LeaveHistoryRecordsSection: React.FC<LeaveHistoryRecordsSectionProps> = ({
  showHistoryEmployeeFilter,
  statusFilter,
  setStatusFilter,
  historyStatusLabel,
  historyStatusOptions,
  historyStatusPickerOpen,
  setHistoryStatusPickerOpen,
  setHistoryEmployeePickerOpen,
  setHistoryMonthPickerOpen,
  historyStatusPickerRef,
  historyEmployeeFilter,
  setHistoryEmployeeFilter,
  historyEmployeeLabel,
  historyEmployeeOptions,
  formatHistoryEmployeeOptionLabel,
  historyEmployeePickerOpen,
  historyEmployeePickerRef,
  historyMonthFilter,
  setHistoryMonthFilter,
  historyMonthLabel,
  historyMonthOptions,
  historyMonthPickerOpen,
  historyMonthPickerRef,
  leaveLoading,
  filteredLeaves,
  isApproverPortal,
  viewerRole,
  getDecisionLabel,
  onViewDetails,
  onEditLeave,
  onDeleteLeave,
}) => {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red">
            <Sparkles size={14} />
            Leave history
          </div>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">Leave history records</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Filter, review, and inspect leave records in a professional card-based layout built for SaaS dashboards.
          </p>
        </div>

        <div className={`w-full ${showHistoryEmployeeFilter ? 'md:max-w-4xl' : 'md:ml-auto md:max-w-[420px]'}`}>
          <div
            className={`grid grid-cols-1 gap-3 rounded-[26px] border border-slate-200 bg-slate-50/70 p-3 ${
              showHistoryEmployeeFilter ? 'md:grid-cols-[170px_minmax(0,1fr)_220px]' : 'md:grid-cols-[170px_220px]'
            }`}
          >
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Status</span>
              <FilterDropdown
                value={statusFilter}
                selectedLabel={historyStatusLabel}
                options={historyStatusOptions}
                open={historyStatusPickerOpen}
                onToggle={() => {
                  setHistoryStatusPickerOpen((prev) => !prev);
                  setHistoryEmployeePickerOpen(false);
                  setHistoryMonthPickerOpen(false);
                }}
                onSelect={(value) => {
                  setStatusFilter(value as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED');
                  setHistoryStatusPickerOpen(false);
                }}
                containerRef={historyStatusPickerRef}
              />
            </label>

            {showHistoryEmployeeFilter ? (
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Select employee</span>
                <FilterDropdown
                  value={historyEmployeeFilter}
                  selectedLabel={historyEmployeeLabel}
                  options={[
                    { value: '', label: 'All employees' },
                    ...historyEmployeeOptions.map((employee) => ({
                      value: employee,
                      label: formatHistoryEmployeeOptionLabel(employee),
                    })),
                  ]}
                  open={historyEmployeePickerOpen}
                  onToggle={() => {
                    setHistoryEmployeePickerOpen((prev) => !prev);
                    setHistoryStatusPickerOpen(false);
                    setHistoryMonthPickerOpen(false);
                  }}
                  onSelect={(value) => {
                    setHistoryEmployeeFilter(value);
                    setHistoryEmployeePickerOpen(false);
                  }}
                  containerRef={historyEmployeePickerRef}
                />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Select month</span>
              <FilterDropdown
                value={historyMonthFilter}
                selectedLabel={historyMonthLabel}
                options={[
                  { value: '', label: 'All months' },
                  ...historyMonthOptions.map((monthValue) => ({
                    value: monthValue,
                    label: new Date(`${monthValue}-01T00:00:00`).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    }),
                  })),
                ]}
                open={historyMonthPickerOpen}
                onToggle={() => {
                  setHistoryMonthPickerOpen((prev) => !prev);
                  setHistoryStatusPickerOpen(false);
                  setHistoryEmployeePickerOpen(false);
                }}
                onSelect={(value) => {
                  setHistoryMonthFilter(value);
                  setHistoryMonthPickerOpen(false);
                }}
                containerRef={historyMonthPickerRef}
                maxHeightClass="max-h-52"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {leaveLoading ? (
          <AttendanceLeaveOverviewSkeleton count={4} />
        ) : filteredLeaves.length === 0 ? (
          <div className="xl:col-span-2 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <p className="text-base font-semibold text-slate-900">No leave records found</p>
            <p className="mt-2 text-sm text-slate-500">Try adjusting the filters or submit a new leave request.</p>
          </div>
        ) : (
          filteredLeaves.map((leave) => (
            <LeaveHistoryCard
              key={leave._id}
              leave={leave}
              showEmployee={isApproverPortal}
              employeeLabel={getEmployeeRecordLabel(leave)}
              totalDays={calculateLeaveDays(
                leave.startDate.slice(0, 10),
                leave.endDate.slice(0, 10),
                true,
                { type: leave.type, dayPortion: leave.dayPortion }
              ).total}
              canManagePending={viewerRole !== 'admin'}
              decisionLabel={getDecisionLabel(leave)}
              onViewDetails={onViewDetails}
              onEdit={onEditLeave}
              onDelete={onDeleteLeave}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default LeaveHistoryRecordsSection;
