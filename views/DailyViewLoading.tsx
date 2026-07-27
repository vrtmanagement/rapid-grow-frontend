import React from 'react';
import { PlanningState } from '../types';
import { Skeleton, SkeletonBlock } from '../components/ui/Skeleton';
import VisionFlowNav from '../components/planning/VisionFlowNav';

export const DailyViewLoading: React.FC<{ subtitle?: string }> = ({ subtitle }) => (
  <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
    <VisionFlowNav subtitle={subtitle} />
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="rounded-xl border border-slate-100 p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <Skeleton className="h-6 w-56 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="rounded-xl border border-slate-100 p-4 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <SkeletonBlock className="h-8 w-full rounded-lg" />
            <SkeletonBlock className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  </div>
);
