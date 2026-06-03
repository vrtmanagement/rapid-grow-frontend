import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';

type SpacesMonthGoalDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  progressPercent: number;
  doneCount: number;
  totalCount: number;
  onAddTask: () => void;
  children: React.ReactNode;
};

const SpacesMonthGoalDetailDrawer: React.FC<SpacesMonthGoalDetailDrawerProps> = ({
  open,
  onClose,
  title,
  progressPercent,
  doneCount,
  totalCount,
  onAddTask,
  children,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes spacesMonthGoalDetailBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spacesMonthGoalDetailSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .spaces-month-goal-detail-backdrop,
          .spaces-month-goal-detail-panel {
            animation-duration: 1ms !important;
          }
        }
      `}</style>
      <div
        className="spaces-month-goal-detail-backdrop fixed inset-0 z-[202] bg-slate-950/35 backdrop-blur-[2px]"
        style={{ animation: 'spacesMonthGoalDetailBackdropIn 180ms ease-out both' }}
        aria-hidden
        onClick={onClose}
      />
      <div
        className="spaces-month-goal-detail-panel fixed inset-y-0 right-0 z-[203] flex h-full w-full max-w-[820px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
        style={{ animation: 'spacesMonthGoalDetailSlideIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spaces-month-goal-detail-title"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">Month Goals</div>
            <h3 id="spaces-month-goal-detail-title" className="mt-1 text-[28px] font-semibold leading-tight text-slate-900">
              {title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-brand-red">{progressPercent}% complete</span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                {doneCount}/{totalCount} done
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onAddTask}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-red/30 bg-[#fff7f7] px-4 py-2 text-[12px] font-semibold text-brand-red transition hover:border-brand-red hover:bg-red-50"
            >
              <Plus size={14} />
              Add task
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close month view"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </>,
    document.body,
  );
};

export default SpacesMonthGoalDetailDrawer;
