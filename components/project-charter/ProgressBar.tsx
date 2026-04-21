import React from 'react';

interface ProgressBarProps {
  value: number;
  tone?: 'brand' | 'success';
  className?: string;
  label?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, tone = 'brand', className = '', label }) => {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const fillClass =
    tone === 'success'
      ? 'from-emerald-400 via-emerald-500 to-emerald-600'
      : 'from-brand-red via-orange-500 to-amber-400';

  return (
    <div className={className}>
      {label ? (
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">{label}</span>
          <span className="font-semibold text-slate-800">{safeValue}%</span>
        </div>
      ) : null}
      <div className="h-3 overflow-hidden rounded-full bg-slate-200/80">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${fillClass} transition-all duration-500 ease-out`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
