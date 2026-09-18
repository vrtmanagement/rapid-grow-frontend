import React from 'react';

export function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/80 px-3.5 py-3 ring-1 ring-slate-200/70">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 text-[14px] font-semibold leading-snug text-slate-900 break-words">{value}</div>
    </div>
  );
}

export function ContentPanel({
  title,
  icon,
  children,
  className = '',
  hint,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <section className={`min-w-0 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
          {hint ? <p className="mt-0.5 text-[12px] text-slate-500">{hint}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function TaskDetailSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex gap-2">
          <div className="h-7 w-20 rounded-full bg-slate-100" />
          <div className="h-7 w-28 rounded-full bg-slate-100" />
        </div>
        <div className="mt-5 h-9 w-4/5 max-w-xl rounded-2xl bg-slate-100" />
        <div className="mt-3 h-4 w-48 rounded-full bg-slate-100" />
      </div>
      <div className="bg-slate-50/80 px-5 py-5 sm:px-7">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`sk-meta-${index}`} className="h-[72px] rounded-2xl bg-white ring-1 ring-slate-200/70" />
          ))}
        </div>
      </div>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,0.9fr)]">
        <div className="px-5 py-6 sm:px-7">
          <div className="h-4 w-28 rounded bg-slate-100" />
          <div className="mt-4 h-20 w-full rounded-2xl bg-slate-50" />
        </div>
        <div className="bg-slate-50/50 px-5 py-6 sm:px-7">
          <div className="h-4 w-20 rounded bg-slate-100" />
          <div className="mt-4 space-y-3">
            <div className="h-10 w-full rounded-xl bg-white" />
            <div className="h-10 w-full rounded-xl bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
