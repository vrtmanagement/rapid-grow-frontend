import React from 'react';
import { X } from 'lucide-react';

type DriveDialogProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function DriveDialog({
  title,
  description,
  onClose,
  children,
  footer,
}: DriveDialogProps) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[1.25rem] border border-white/70 bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(255,247,247,0.98),rgba(255,255,255,1))] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-red">RapidGrow Drive</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h3>
            {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-red-200 hover:text-brand-red"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer ? <div className="border-t border-slate-200 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
