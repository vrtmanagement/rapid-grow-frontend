import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import {
  MONTH_NAMES,
  PHASE_LABELS,
  StrategyCalendarEvent,
  StrategyEventStatus,
} from '../../services/strategyExecutionApi';

interface StrategyCalendarGridProps {
  events: StrategyCalendarEvent[];
  selectedMonth: number;
  onSelectMonth: (month: number) => void;
  canManage: boolean;
  onStatusChange?: (month: number, status: StrategyEventStatus) => void;
}

const STATUS_STYLES: Record<StrategyEventStatus, string> = {
  pending: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
  in_progress: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30',
  completed: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30',
};

const StatusIcon: React.FC<{ status: StrategyEventStatus }> = ({ status }) => {
  if (status === 'completed') return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (status === 'in_progress') return <Clock size={16} className="text-amber-600" />;
  return <Circle size={16} className="text-slate-400" />;
};

const StrategyCalendarGrid: React.FC<StrategyCalendarGridProps> = ({
  events,
  selectedMonth,
  onSelectMonth,
  canManage,
  onStatusChange,
}) => {
  const phases = [1, 2, 3] as const;

  return (
    <div className="space-y-8">
      {phases.map((phase) => {
        const phaseEvents = events.filter((e) => e.phase === phase);
        return (
          <section key={phase}>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-brand-red sm:tracking-widest">
              Phase {phase} — {PHASE_LABELS[phase]}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {phaseEvents.map((event) => {
                const isSelected = event.month === selectedMonth;
                return (
                  <button
                    key={event.month}
                    type="button"
                    onClick={() => onSelectMonth(event.month)}
                    className={`flex h-full min-w-0 flex-col rounded-2xl border p-4 text-left transition-all hover:shadow-md ${STATUS_STYLES[event.status]} ${
                      isSelected ? 'ring-2 ring-brand-red ring-offset-2 dark:ring-offset-slate-950' : ''
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="text-xs font-bold uppercase text-slate-500">
                        {MONTH_NAMES[event.month - 1]}
                      </span>
                      <StatusIcon status={event.status} />
                    </div>
                    <p
                      className="flex-1 text-sm font-semibold leading-snug text-slate-800 break-words dark:text-slate-100"
                      title={event.title}
                    >
                      {event.title}
                    </p>
                    {canManage && onStatusChange && (
                      <select
                        className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        value={event.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onStatusChange(event.month, e.target.value as StrategyEventStatus)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default StrategyCalendarGrid;
