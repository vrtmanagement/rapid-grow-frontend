import React from 'react';
import { Clock3 } from 'lucide-react';
import { ProjectActivityItem } from '../../types';
import { formatProjectDateTime } from './projectCharterUtils';

interface ActivityTimelineProps {
  activity: ProjectActivityItem[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activity }) => {
  if (!activity.length) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white/80 p-8 text-center text-slate-500">
        No activity yet. Updates will appear here once the project starts moving.
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-brand-red">
          <Clock3 size={20} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Activity Timeline</h3>
          <p className="text-sm text-slate-500">Recent changes, progress updates, and delivery signals.</p>
        </div>
      </div>

      <div className="space-y-5">
        {activity.map((entry, index) => (
          <div key={entry.id} className="relative pl-8">
            {index !== activity.length - 1 ? (
              <div className="absolute left-[11px] top-7 h-[calc(100%+1rem)] w-px bg-slate-200" />
            ) : null}
            <div className="absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-brand-red/20 bg-brand-red/10">
              <div className="h-2.5 w-2.5 rounded-full bg-brand-red" />
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                  {entry.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{entry.description}</p> : null}
                </div>
                <span className="whitespace-nowrap text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  {formatProjectDateTime(entry.createdAt)}
                </span>
              </div>
              {entry.actorName ? (
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  Updated by {entry.actorName}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;
