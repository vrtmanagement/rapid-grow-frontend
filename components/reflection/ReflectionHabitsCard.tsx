import React from 'react';
import { Sparkles } from 'lucide-react';

interface ReflectionHabitsCardProps {
  error: string | null;
}

const HABITS = [
  'Write what you accomplished today so you end the day with a sense of completion.',
  'Note when you felt most energized so you can design more of those moments.',
  'Capture your top action items for tomorrow before you log off.',
  'Send a quick thank you message or email to someone (including yourself) who deserves it.',
];

const HabitItem: React.FC<{ index: number; text: string }> = ({ index, text }) => (
  <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-red/90 text-[11px] font-bold text-white">
      {index}
    </span>
    <span className="text-[14px] leading-6 text-slate-200">{text}</span>
  </li>
);

const ReflectionHabitsCard: React.FC<ReflectionHabitsCardProps> = ({ error }) => (
  <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
    <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-red/25 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-8 left-0 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
    <div className="relative space-y-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-red/15 text-brand-red">
          <Sparkles size={18} />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-red/90">Guidance</p>
          <h3 className="text-lg font-semibold text-white">Daily Reflection Habits</h3>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-slate-400">
        A short ritual that keeps your day clear, accountable, and ready for tomorrow.
      </p>
      <ul className="space-y-3">
        {HABITS.map((text, index) => (
          <HabitItem key={text} index={index + 1} text={text} />
        ))}
      </ul>
      {error ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p> : null}
    </div>
  </div>
);

export default ReflectionHabitsCard;
