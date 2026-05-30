import React from 'react';
import { AlertTriangle, History, TrendingDown } from 'lucide-react';
import { LeaveLopSummary } from './attendanceUtils';
import { SkeletonBlock } from '../ui/Skeleton';
import LeaveLopBadges from './LeaveLopBadges';
import { getLeaveDisplayStatusLabel, getLeaveDisplayStatusTone } from './lopUtils';

interface Props {
  summary: LeaveLopSummary | null;
  loading?: boolean;
}

const LeaveEmployeeLopSection: React.FC<Props> = ({ summary, loading = false }) => {
  if (loading) {
    return (
      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <SkeletonBlock className="h-8 w-48" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SkeletonBlock className="h-24 rounded-2xl" />
          <SkeletonBlock className="h-24 rounded-2xl" />
          <SkeletonBlock className="h-24 rounded-2xl" />
        </div>
      </section>
    );
  }

  if (!summary) return null;

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
        <TrendingDown size={14} />
        LOP overview
      </div>
      <h3 className="mt-3 text-xl font-semibold text-slate-900">Loss of pay summary</h3>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-600">LOP events</p>
          <p className="mt-2 text-3xl font-semibold text-amber-800">{summary.totals.lopCount}</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-600">Total deducted</p>
          <p className="mt-2 text-3xl font-semibold text-rose-800">{summary.totals.totalDeducted}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">LOP days</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.totals.totalLopDays}</p>
        </div>
      </div>

      {summary.policyWarnings.length ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/80 px-4 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <ul className="space-y-1 text-sm leading-6 text-amber-900">
              {summary.policyWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <History size={16} />
          Deduction timeline
        </div>
        <div className="mt-4 space-y-3">
          {summary.timeline.length ? (
            summary.timeline.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition hover:border-slate-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {entry.leaveType} · {entry.deductedDays} day(s) deducted
                  </p>
                  <span className="text-xs font-semibold text-slate-500">
                    {new Date(entry.appliedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  LOP: {entry.lopDays} · Multiplier: {entry.multiplier}x
                  {entry.ruleTriggers?.length ? ` · ${entry.ruleTriggers.join(', ')}` : ''}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              No LOP deductions recorded for this year yet.
            </p>
          )}
        </div>
      </div>

      {summary.recentLeaves.length ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold text-slate-800">Recent leave LOP status</p>
          {summary.recentLeaves.slice(0, 5).map((leave) => (
            <div
              key={leave._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${getLeaveDisplayStatusTone(leave)}`}
                >
                  {getLeaveDisplayStatusLabel(leave)}
                </span>
                <p className="mt-2 text-sm text-slate-600">
                  {new Date(leave.startDate).toLocaleDateString()} –{' '}
                  {new Date(leave.endDate).toLocaleDateString()}
                </p>
              </div>
              <LeaveLopBadges badges={leave.lopBadges} compact />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default LeaveEmployeeLopSection;
