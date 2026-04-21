import React, { RefObject } from 'react';
import { ChevronDown } from 'lucide-react';

interface LeaveAdminLeaveOperationsSectionProps {
  viewerRole: 'employee' | 'team_lead' | 'admin';
  adminEmployeeFilter: string;
  setAdminEmployeeFilter: (value: string) => void;
  adminMonthFilter: string;
  setAdminMonthFilter: (value: string) => void;
  adminEmployeePickerOpen: boolean;
  setAdminEmployeePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  adminMonthPickerOpen: boolean;
  setAdminMonthPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  adminEmployeePickerRef: RefObject<HTMLDivElement | null>;
  adminMonthPickerRef: RefObject<HTMLDivElement | null>;
  adminEmployeeOptions: string[];
  adminMonthOptions: string[];
  leaveStats: { total: number; approved: number; pending: number; rejected: number };
}

const LeaveAdminLeaveOperationsSection: React.FC<LeaveAdminLeaveOperationsSectionProps> = ({
  viewerRole,
  adminEmployeeFilter,
  setAdminEmployeeFilter,
  adminMonthFilter,
  setAdminMonthFilter,
  adminEmployeePickerOpen,
  setAdminEmployeePickerOpen,
  adminMonthPickerOpen,
  setAdminMonthPickerOpen,
  adminEmployeePickerRef,
  adminMonthPickerRef,
  adminEmployeeOptions,
  adminMonthOptions,
  leaveStats,
}) => {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white px-6 py-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-1.5 w-8 rounded-full bg-brand-red" />
            <span className="text-[15px] text-slate-500">Approval Workspace</span>
          </div>
          <h3 className="text-2xl font-semibold text-slate-950">Leave operations</h3>
          <p className="mt-2 max-w-2xl text-[15px] leading-8 text-slate-600">
            Review leave activity and monitor pending approvals without changing the current dashboard flow.
          </p>
        </div>

        {viewerRole === 'admin' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:min-w-[520px]">
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-slate-600">Select employee</span>
              <div className="relative" ref={adminEmployeePickerRef}>
                <button
                  type="button"
                  onClick={() => {
                    setAdminEmployeePickerOpen((prev) => !prev);
                    setAdminMonthPickerOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3.5 text-left text-[15px] font-semibold text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.06)] outline-none transition-all hover:border-slate-300 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)] focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10"
                >
                  <span className="pr-4">{adminEmployeeFilter || 'All employees'}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-400 transition-transform ${adminEmployeePickerOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {adminEmployeePickerOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                    <div className="max-h-64 overflow-y-auto py-2">
                      {['All employees', ...adminEmployeeOptions].map((employee) => {
                        const value = employee === 'All employees' ? '' : employee;
                        const isSelected = adminEmployeeFilter === value;

                        return (
                          <button
                            key={employee}
                            type="button"
                            onClick={() => {
                              setAdminEmployeeFilter(value);
                              setAdminEmployeePickerOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                              isSelected ? 'bg-rose-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="pr-4 font-medium leading-6">{employee}</span>
                            {isSelected ? <span className="text-xs font-semibold text-brand-red">Selected</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-slate-600">Select month</span>
              <div className="relative" ref={adminMonthPickerRef}>
                <button
                  type="button"
                  onClick={() => {
                    setAdminMonthPickerOpen((prev) => !prev);
                    setAdminEmployeePickerOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3.5 text-left text-[15px] font-semibold text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.06)] outline-none transition-all hover:border-slate-300 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)] focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10"
                >
                  <span className="truncate pr-4">
                    {adminMonthFilter
                      ? new Date(`${adminMonthFilter}-01T00:00:00`).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'All months'}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-400 transition-transform ${adminMonthPickerOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {adminMonthPickerOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                    <div className="max-h-64 overflow-y-auto py-2">
                      {[
                        { value: '', label: 'All months' },
                        ...adminMonthOptions.map((monthValue) => ({
                          value: monthValue,
                          label: new Date(`${monthValue}-01T00:00:00`).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          }),
                        })),
                      ].map((month) => {
                        const isSelected = month.value === adminMonthFilter;

                        return (
                          <button
                            key={month.value || 'all-months'}
                            type="button"
                            onClick={() => {
                              setAdminMonthFilter(month.value);
                              setAdminMonthPickerOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                              isSelected ? 'bg-rose-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-medium">{month.label}</span>
                            {isSelected ? <span className="text-xs font-semibold text-brand-red">Selected</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </label>
          </div>
        ) : null}
      </div>

      <div className="mt-5 border-t border-slate-200/80 pt-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-slate-200 bg-white/85 px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{leaveStats.total}</p>
          </div>
          <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 px-5 py-4 shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">Approved</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-emerald-700">{leaveStats.approved}</p>
          </div>
          <div className="rounded-[22px] border border-amber-100 bg-amber-50/80 px-5 py-4 shadow-[0_10px_24px_rgba(245,158,11,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-600">Pending</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-amber-700">{leaveStats.pending}</p>
          </div>
          <div className="rounded-[22px] border border-rose-100 bg-rose-50/80 px-5 py-4 shadow-[0_10px_24px_rgba(244,63,94,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-600">Rejected</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-rose-700">{leaveStats.rejected}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LeaveAdminLeaveOperationsSection;
