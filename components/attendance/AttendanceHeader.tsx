import React from 'react';
import { PageHeaderSkeleton, SkeletonBlock } from '../ui/Skeleton';

interface Props {
  activeView: 'attendance' | 'leave' | 'late';
  subtitle: string;
  loading?: boolean;
  actions?: React.ReactNode;
}

const AttendanceHeader: React.FC<Props> = ({
  activeView,
  loading = false,
  actions = null,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <PageHeaderSkeleton />
        <div className="flex flex-col items-end gap-3 animate-pulse">
          <SkeletonBlock className="h-12 w-[280px] rounded-2xl bg-white border border-slate-200 shadow-sm" />
        </div>
      </div>
    );
  }

  if (activeView === 'attendance') {
    return null;
  }

  if (activeView === 'late') {
    return (
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl text-slate-900 leading-none">
            Late Login Desk
          </h2>
          <p className="mt-3 text-[15px] text-slate-500 md:text-lg">
            Review late-login activity, approve one-day access, and keep every override visible in one audit-ready workspace.
          </p>
        </div>
        {actions ? <div className="shrink-0 md:pt-1">{actions}</div> : null}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl md:text-4xl text-slate-900 leading-none">
        Manage Leave
      </h2>
      <p className="mt-3 text-[15px] text-slate-500 md:text-lg">
        Plan leave, track approvals, and manage your records in one premium workspace.
      </p>
    </div>
  );
};

export default AttendanceHeader;
