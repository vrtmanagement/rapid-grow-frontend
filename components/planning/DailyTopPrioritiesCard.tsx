import React from 'react';
import { Star } from 'lucide-react';

interface SpacesTaskSummary {
  taskId: string;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
}

interface DailyTopPrioritiesCardProps {
  topTasks: SpacesTaskSummary[];
  dailyPriorities: string[];
  updatingTopTaskId: string;
  onToggleTaskStatus: (taskId: string, done: boolean) => void;
}

const DailyTopPrioritiesCard: React.FC<DailyTopPrioritiesCardProps> = ({
  topTasks,
  dailyPriorities,
  updatingTopTaskId,
  onToggleTaskStatus,
}) => {
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-rose-50 via-white to-slate-50 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-amber-500 fill-current" />
          <h5 className="text-sm font-semibold text-slate-800">Top 5 Priorities For Today</h5>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
          {topTasks.slice(0, 5).length} active
        </span>
      </div>
      <div className="space-y-2">
        {topTasks.length > 0
          ? topTasks.slice(0, 5).map((t, i) => (
            <div key={t.taskId} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-[0_2px_8px_rgba(15,23,42,0.05)]">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={String(t.status || '').toLowerCase() === 'done'}
                  onChange={(e) => onToggleTaskStatus(t.taskId, e.target.checked)}
                  disabled={updatingTopTaskId === t.taskId}
                  className="mt-0.5 h-4 w-4"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-800">{i + 1}. {t.title}</div>
                  <div className="mt-0.5 text-slate-500">
                    Due: {t.dueDate || '—'} · Priority: {t.priority} · Status: {t.status}
                  </div>
                </div>
              </div>
            </div>
          ))
          : dailyPriorities.map((p, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              {i + 1}. {p || 'Set a top priority'}
            </div>
          ))}
      </div>
    </div>
  );
};

export default DailyTopPrioritiesCard;
