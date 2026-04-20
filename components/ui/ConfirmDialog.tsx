import React from 'react';

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmClassName?: string;
  cancelClassName?: string;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmClassName,
  cancelClassName,
  disabled = false,
  onCancel,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_40px_110px_rgba(15,23,42,0.18)]">
        <div className="bg-gradient-to-r from-rose-50 to-white px-6 py-5">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="px-6 py-5">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={onCancel}
              className={cancelClassName || 'rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700'}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onConfirm}
              className={confirmClassName || 'rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_18px_30px_rgba(225,29,72,0.22)]'}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
