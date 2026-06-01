import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ExpenseSideDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const ExpenseSideDrawer: React.FC<ExpenseSideDrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}) => {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px] transition-opacity"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex h-[100dvh] min-h-0 w-full max-w-[520px] flex-col border-l border-slate-200 bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.14)] animate-in slide-in-from-right duration-300 dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};

export default ExpenseSideDrawer;
