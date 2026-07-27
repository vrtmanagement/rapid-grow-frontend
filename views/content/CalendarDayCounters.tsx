import React from 'react';
import { ContentType } from '../../services/contentApi';
import { TYPE_ICON_META } from './contentViewConstants';

function CalendarTypeCounter({
  type,
  count,
  compact = false,
  dense = false,
}: {
  type: ContentType;
  count: number;
  compact?: boolean;
  dense?: boolean;
}) {
  const meta = TYPE_ICON_META[type];
  const Icon = meta.icon;

  if (compact) {
    return (
      <div className={`relative flex items-center justify-center ${dense ? 'h-7' : 'h-8'}`}>
        <div className={`inline-flex items-center justify-center ${dense ? 'h-7 w-7 rounded-md' : 'h-8 w-8 rounded-lg'} ${meta.className} shadow-inner`}>
          <Icon size={dense ? 12 : 14} />
        </div>
        <span className={`absolute inline-flex items-center justify-center rounded-full border border-brand-red/20 bg-white font-semibold text-brand-red shadow-[0_8px_18px_rgba(236,72,71,0.12)] ${dense ? '-right-1 -top-1 min-w-[18px] px-1 py-0.5 text-[9px]' : '-right-1.5 -top-1.5 min-w-[20px] px-1.5 py-0.5 text-[10px]'}`}>
          {count}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-[0.95rem] border border-white/80 bg-gradient-to-r from-white via-slate-50 to-white px-2.5 py-1.5 shadow-[0_8px_18px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/70">
      <div className="flex items-center gap-2">
        <div className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-md ${meta.className} shadow-inner`}>
          <Icon size={12} />
        </div>
        <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500">{meta.label}</span>
      </div>
      <div className="min-w-[18px] text-right text-sm font-semibold text-brand-red/75">{count}</div>
    </div>
  );
}

export function CalendarDayCounters({ counts }: { counts: Record<ContentType, number> }) {
  const entries = (Object.keys(TYPE_ICON_META) as ContentType[])
    .map((type) => ({ type, count: counts[type] || 0 }))
    .filter((entry) => entry.count > 0);

  if (entries.length <= 2) {
    return (
      <div className="flex flex-col gap-1.5">
        {entries.map((entry) => (
          <CalendarTypeCounter key={entry.type} type={entry.type} count={entry.count} />
        ))}
      </div>
    );
  }

  if (entries.length <= 4) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {entries.map((entry) => (
          <CalendarTypeCounter key={entry.type} type={entry.type} count={entry.count} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {entries.map((entry) => (
        <CalendarTypeCounter key={entry.type} type={entry.type} count={entry.count} compact dense />
      ))}
    </div>
  );
}
