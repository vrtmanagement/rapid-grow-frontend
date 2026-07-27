import React from 'react';
import { motion } from 'framer-motion';

export function MetaCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-4 shadow-[0_12px_40px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)] ${
        accent
          ? 'border-brand-red/15 bg-gradient-to-br from-red-50/80 to-white'
          : 'border-slate-200/80 bg-white/90 backdrop-blur-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            accent ? 'bg-brand-red/10 text-brand-red' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <div className="mt-1.5 text-[15px] font-semibold leading-snug text-slate-900 break-words">{value}</div>
        </div>
      </div>
    </div>
  );
}

export function ContentPanel({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 py-4 sm:px-7">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">{icon}</div>
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
      </div>
      <div className="px-6 py-6 sm:px-7">{children}</div>
    </section>
  );
}

export function TaskDetailSkeleton({ reducedMotion }: { reducedMotion: boolean }) {
  const pulse = reducedMotion ? {} : { opacity: [0.45, 0.9, 0.45] };
  const pulseTransition = reducedMotion ? undefined : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <div className="space-y-6">
      <motion.div
        animate={pulse}
        transition={pulseTransition}
        className="overflow-hidden rounded-[28px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-8 py-10"
      >
        <div className="h-4 w-32 rounded-full bg-white/10" />
        <div className="mt-6 h-10 w-4/5 max-w-xl rounded-2xl bg-white/10" />
        <div className="mt-4 h-4 w-56 rounded-full bg-white/10" />
      </motion.div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <motion.div
            key={`sk-${index}`}
            animate={pulse}
            transition={pulseTransition}
            className="rounded-[22px] border border-slate-200 bg-white p-4"
          >
            <div className="h-10 w-10 rounded-2xl bg-slate-100" />
            <div className="mt-4 h-3 w-16 rounded bg-slate-100" />
            <div className="mt-2 h-5 w-28 rounded bg-slate-200" />
          </motion.div>
        ))}
      </div>
      <motion.div animate={pulse} transition={pulseTransition} className="rounded-[28px] border border-slate-200 bg-white p-7">
        <div className="h-4 w-28 rounded bg-slate-100" />
        <div className="mt-5 h-24 w-full rounded-2xl bg-slate-50" />
      </motion.div>
    </div>
  );
}
