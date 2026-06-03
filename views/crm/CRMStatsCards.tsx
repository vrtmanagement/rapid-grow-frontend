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
  onCardClick,
}) => {
  const cards: Array<[string, number, string, 'total' | 'hot' | 'warm' | 'cold']> = [
    ['Total Leads', stats.total, 'text-slate-700', 'total'],
    ['Hot Leads', stats.hot, 'text-red-600', 'hot'],
    ['Warm Leads', stats.warm, 'text-amber-600', 'warm'],
    ['Cold Leads', stats.cold, 'text-blue-600', 'cold'],
  ];
  const customCards = Array.isArray(stats.customCounts) ? stats.customCounts : [];

  return (
    <div className="grid [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))] gap-2 w-full">
      {cards.map(([label, value, tone, type]) => (
        <button
          key={label}
          type="button"
          onClick={() => onCardClick?.({ type })}
          className="rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-left min-w-0 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="text-[10px] uppercase tracking-wide text-slate-500/90 truncate">{label}</div>
          <div className={`text-lg font-bold mt-1 ${tone}`}>{value}</div>
        </button>
      ))}
      {customCards.map((custom) => (
        <button
          key={custom.name}
          type="button"
          onClick={() => onCardClick?.({ type: 'custom', customTabName: custom.name })}
          className="rounded-lg bg-white border border-indigo-100 px-3 py-2.5 text-left min-w-0 transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/40"
        >
          <div className="text-[10px] uppercase tracking-wide text-slate-500/90 truncate">{custom.name}</div>
          <div className="text-lg font-bold mt-1 text-indigo-600">{custom.count}</div>
        </button>
      ))}
    </div>
  );
};

export default CRMStatsCards;
