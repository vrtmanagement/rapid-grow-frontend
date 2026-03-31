import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-full bg-slate-200 ${className}`.trim()} />
);

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`.trim()} />
);

export const PageHeaderSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-8 rounded-full bg-slate-200" />
      <div className="h-4 w-40 rounded-full bg-slate-100" />
    </div>
    <div className="h-10 w-64 rounded-full bg-slate-200" />
    <div className="h-5 w-96 max-w-full rounded-full bg-slate-100" />
  </div>
);

export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
    {Array.from({ length: count }).map((_, index) => (
      <div key={`card-skeleton-${index}`} className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm animate-pulse space-y-6">
        <div className="h-12 w-12 rounded-2xl bg-slate-100" />
        <div className="space-y-3">
          <div className="h-4 w-24 rounded-full bg-slate-100" />
          <div className="h-8 w-20 rounded-full bg-slate-200" />
          <div className="h-4 w-28 rounded-full bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);

export const AppShellSkeleton: React.FC = () => (
  <div className="h-screen flex overflow-hidden bg-[#f1f5f9]">
    <aside className="w-64 h-full bg-brand-charcoal text-white flex flex-col shrink-0">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded bg-brand-red/80" />
          <div className="h-4 w-28 rounded-full bg-white/10" />
        </div>
      </div>
      <div className="flex-1 px-4 py-6 space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={`shell-nav-${index}`} className="flex items-center gap-4 px-5 py-4 rounded animate-pulse">
            <div className="h-5 w-5 rounded-full bg-white/10" />
            <div className="h-4 w-24 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </aside>
    <main className="flex-1 flex flex-col">
      <div className="h-20 bg-white/90 border-b border-slate-200 px-8 flex items-center justify-end">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="space-y-2">
            <div className="h-4 w-24 rounded-full bg-slate-200" />
            <div className="h-3 w-16 rounded-full bg-slate-100" />
          </div>
          <div className="w-11 h-11 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-16">
        <div className="max-w-6xl mx-auto space-y-10">
          <PageHeaderSkeleton />
          <CardGridSkeleton count={4} />
        </div>
      </div>
    </main>
  </div>
);

export const ProjectCardGridSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {Array.from({ length: count }).map((_, index) => (
      <div key={`project-card-skeleton-${index}`} className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-200" />
          <div className="h-8 w-20 rounded-full bg-slate-100" />
        </div>
        <div className="space-y-3">
          <div className="h-8 w-40 rounded-full bg-slate-200" />
          <div className="h-4 w-full rounded-full bg-slate-100" />
          <div className="h-4 w-4/5 rounded-full bg-slate-100" />
        </div>
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="h-4 w-24 rounded-full bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);

export const AdminCardGridSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, index) => (
      <div key={`admin-card-skeleton-${index}`} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 animate-pulse">
        <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <div className="h-3 w-20 rounded-full bg-slate-100" />
          <div className="h-3 w-24 rounded-full bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);

export const PermissionsMatrixSkeleton: React.FC<{ roleColumns?: number; rows?: number }> = ({
  roleColumns = 3,
  rows = 8,
}) => (
  <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
    <table className="min-w-full">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Permission</th>
          {Array.from({ length: roleColumns }).map((_, index) => (
            <th key={`permission-role-head-${index}`} className="px-4 py-3 text-sm font-semibold text-slate-700 text-center">
              <div className="mx-auto h-4 w-16 rounded-full bg-slate-200 animate-pulse" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={`permission-row-${rowIndex}`} className="border-b last:border-b-0 border-slate-100 animate-pulse">
            <td className="px-4 py-3">
              <div className="h-4 w-40 rounded-full bg-slate-200" />
            </td>
            {Array.from({ length: roleColumns }).map((__, colIndex) => (
              <td key={`permission-row-${rowIndex}-${colIndex}`} className="px-4 py-3 text-center">
                <div className="mx-auto h-4 w-4 rounded bg-slate-100" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const StaffTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={`staff-row-${rowIndex}`} className="border-b border-slate-100 last:border-b-0 animate-pulse">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200" />
            <div className="h-4 w-28 rounded-full bg-slate-200" />
          </div>
        </td>
        <td className="px-4 py-3"><div className="h-4 w-20 rounded-full bg-slate-100" /></td>
        <td className="px-4 py-3"><div className="h-4 w-16 rounded-full bg-slate-100" /></td>
        <td className="px-4 py-3"><div className="h-4 w-24 rounded-full bg-slate-100" /></td>
        <td className="px-4 py-3"><div className="h-4 w-24 rounded-full bg-slate-100" /></td>
        <td className="px-4 py-3"><div className="h-4 w-32 rounded-full bg-slate-100" /></td>
        <td className="px-4 py-3"><div className="h-4 w-24 rounded-full bg-slate-100" /></td>
        <td className="px-4 py-3"><div className="h-6 w-16 rounded-full bg-slate-100" /></td>
        <td className="px-4 py-3">
          <div className="ml-auto flex justify-end gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-100" />
            <div className="h-8 w-8 rounded-full bg-slate-100" />
          </div>
        </td>
      </tr>
    ))}
  </>
);

export const FeedbackListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={`feedback-skeleton-${index}`} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 animate-pulse">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-3">
            <div className="h-3 w-40 rounded-full bg-slate-200" />
            <div className="h-4 w-full rounded-full bg-slate-100" />
            <div className="h-4 w-5/6 rounded-full bg-slate-100" />
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="h-3 w-24 rounded-full bg-slate-100" />
            <div className="flex gap-1">
              <div className="h-8 w-8 rounded-full bg-white border border-slate-200" />
              <div className="h-8 w-8 rounded-full bg-white border border-slate-200" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const ReflectionLogSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={`reflection-skeleton-${index}`} className="border border-slate-200 rounded-2xl p-6 bg-slate-50 animate-pulse">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="space-y-2">
            <div className="h-4 w-40 rounded-full bg-slate-200" />
            <div className="h-3 w-24 rounded-full bg-slate-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-14 rounded-full bg-white border border-slate-200" />
            <div className="h-7 w-16 rounded-full bg-white border border-slate-200" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((__, blockIndex) => (
            <div key={`reflection-block-${index}-${blockIndex}`} className="space-y-2">
              <div className="h-4 w-28 rounded-full bg-slate-200" />
              <div className="h-3 w-full rounded-full bg-slate-100" />
              <div className="h-3 w-5/6 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const AttendanceLeaveOverviewSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, index) => (
      <div key={`leave-overview-${index}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 animate-pulse">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded-full bg-slate-200" />
          <div className="h-3 w-20 rounded-full bg-slate-100" />
        </div>
        <div className="h-5 w-16 rounded-full bg-slate-100" />
      </div>
    ))}
  </div>
);

export const TableRowSkeleton: React.FC<{ columns: number; rows?: number }> = ({ columns, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={`table-row-skeleton-${rowIndex}`} className="border-b border-slate-100 last:border-b-0 animate-pulse">
        {Array.from({ length: columns }).map((__, colIndex) => (
          <td key={`table-row-skeleton-${rowIndex}-${colIndex}`} className="px-4 py-4">
            <div className={`h-4 rounded-full ${colIndex === 0 ? 'w-32 bg-slate-200' : 'w-full bg-slate-100'}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={`list-skeleton-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 animate-pulse space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <div className="h-3 w-24 rounded-full bg-slate-100" />
        </div>
        <div className="h-4 w-full rounded-full bg-slate-100" />
        <div className="h-4 w-4/5 rounded-full bg-slate-100" />
      </div>
    ))}
  </div>
);

export const DetailPageSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-10 animate-pulse">
    <div className="h-4 w-28 rounded-full bg-slate-100" />
    <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm space-y-8">
      <div className="space-y-3">
        <div className="h-8 w-64 rounded-full bg-slate-200" />
        <div className="h-4 w-40 rounded-full bg-slate-100" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`detail-skeleton-${index}`} className="space-y-3">
          <div className="h-5 w-36 rounded-full bg-slate-200" />
          <div className="rounded-xl bg-slate-50 p-4 space-y-2">
            <div className="h-4 w-full rounded-full bg-slate-100" />
            <div className="h-4 w-5/6 rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
