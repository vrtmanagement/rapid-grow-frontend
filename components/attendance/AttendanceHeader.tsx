import React from 'react';
import { PageHeaderSkeleton, SkeletonBlock } from '../ui/Skeleton';

interface Props {
  activeView: 'attendance' | 'leave' | 'late' | 'reports';
  subtitle: string;
  loading?: boolean;
  actions?: React.ReactNode;
  portalMode?: 'employee' | 'manager';
}

const AttendanceHeader: React.FC<Props> = ({
  activeView,
  loading = false,
  actions = null,
  portalMode = 'manager',
}) => {
  if (loading) {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <PageHeaderSkeleton />
        <div className="flex flex-col items-end gap-3 animate-pulse">
          <SkeletonBlock className="h-12 w-[280px] rounded-xl bg-white border border-slate-200 shadow-sm" />
        </div>
      </div>
    );
  }

  if (activeView === 'attendance' || activeView === 'reports') {
    return null;
  }

  // Employee late page has its own "Request help" title inside the section.
  if (activeView === 'late' && portalMode === 'employee') {
    return null;
  }

  if (activeView === 'late') {
    return (
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-2xl text-slate-900 leading-tight font-semibold tracking-tight">
            Late Login Desk
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review late-login activity, approve one-day access, and keep every override visible in one audit-ready workspace.
          </p>
        </div>
        {actions ? <div className="shrink-0 md:pt-1">{actions}</div> : null}
      </div>
    );
  }

  return null;
};

export default AttendanceHeader;
