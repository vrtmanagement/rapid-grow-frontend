import React from 'react';

export const reflectionTextareaClassName =
  'w-full resize-none overflow-y-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10';

export type ReflectionFieldProps = {
  step: number;
  label: string;
  helper?: string;
  footer?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
};

export const ReflectionField: React.FC<ReflectionFieldProps> = ({
  step,
  label,
  helper,
  footer,
  value,
  onChange,
  icon,
  placeholder = 'Share your thoughts...',
}) => (
  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors focus-within:border-brand-red/30 focus-within:bg-white focus-within:shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-5">
    <div className="mb-3 flex items-start gap-3">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-brand-red shadow-sm ring-1 ring-slate-200/80">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <label className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-red ring-1 ring-slate-200/80">
            {icon}
          </span>
          {label}
        </label>
        {helper ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{helper}</p> : null}
      </div>
    </div>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      className={reflectionTextareaClassName}
      placeholder={placeholder}
    />
    {footer ? <div className="mt-3">{footer}</div> : null}
  </div>
);

