import React from 'react';
import { PageHeaderSkeleton, Skeleton, SkeletonBlock } from '../ui/Skeleton';

const VisionLoadingSkeleton = () => (
  <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`metric-${index}`} className="rounded-2xl border border-slate-200 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
    <PageHeaderSkeleton />
    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`card-${index}`} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="mt-5 h-8 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <SkeletonBlock className="mt-6 h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

export default VisionLoadingSkeleton;
