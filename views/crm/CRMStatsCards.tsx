import React from 'react';

interface CRMStatsCardsProps {
  stats: {
    total: number;
    hot: number;
    warm: number;
    cold: number;
    converted: number;
    thisMonth: number;
    customCounts?: Array<{ name: string; count: number }>;
  };
  onCardClick?: (card: { type: 'total' | 'hot' | 'warm' | 'cold' | 'custom'; customTabName?: string }) => void;
}

const CRMStatsCards: React.FC<CRMStatsCardsProps> = ({
  stats,
}) => {
  const cards: Array<[string, number, string, 'total' | 'hot' | 'warm' | 'cold']> = [
    ['Total Leads', stats.total, 'text-slate-700', 'total'],
    ['Hot Leads', stats.hot, 'text-red-600', 'hot'],
    ['Warm Leads', stats.warm, 'text-amber-600', 'warm'],
    ['Cold Leads', stats.cold, 'text-blue-600', 'cold'],
  ];
  const customCards = Array.isArray(stats.customCounts) ? stats.customCounts : [];

  return (
    <div className="grid [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))] gap-3 w-full">
      {cards.map(([label, value, tone]) => (
        <div
          key={label}
          className="rounded-xl bg-gradient-to-br from-white via-slate-50 to-slate-100/60 border border-slate-200 px-3 py-2.5 shadow-sm text-left min-w-0 transition-all duration-200"
        >
          <div className="text-[10px] uppercase tracking-wide text-slate-500/90 truncate">{label}</div>
          <div className={`text-lg font-bold mt-1 ${tone}`}>{value}</div>
        </div>
      ))}
      {customCards.map((custom) => (
        <div
          key={custom.name}
          className="rounded-xl bg-gradient-to-br from-white via-indigo-50/70 to-slate-50 border border-indigo-200 px-3 py-2.5 shadow-sm text-left min-w-0 transition-all duration-200"
        >
          <div className="text-[10px] uppercase tracking-wide text-slate-500/90 truncate">{custom.name}</div>
          <div className="text-lg font-bold mt-1 text-indigo-600">{custom.count}</div>
        </div>
      ))}
    </div>
  );
};

export default CRMStatsCards;
