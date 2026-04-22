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

const CRMStatsCards: React.FC<CRMStatsCardsProps> = ({ stats, onCardClick }) => {
  const cards: Array<[string, number, string, 'total' | 'hot' | 'warm' | 'cold']> = [
    ['Total Leads', stats.total, 'text-slate-700', 'total'],
    ['Hot Leads', stats.hot, 'text-red-600', 'hot'],
    ['Warm Leads', stats.warm, 'text-amber-600', 'warm'],
    ['Cold Leads', stats.cold, 'text-blue-600', 'cold'],
  ];
  const customCards = Array.isArray(stats.customCounts) ? stats.customCounts : [];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
      {cards.map(([label, value, tone, type]) => (
        <button
          key={label}
          type="button"
          onClick={() => onCardClick?.({ type })}
          className="rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 px-3 py-2.5 shadow-sm text-left hover:border-slate-300 hover:shadow-md cursor-pointer min-w-0"
        >
          <div className="text-[10px] uppercase tracking-wide text-slate-500 truncate">{label}</div>
          <div className={`text-xl font-bold mt-1 ${tone}`}>{value}</div>
        </button>
      ))}
      {customCards.map((custom) => (
        <button
          key={custom.name}
          type="button"
          onClick={() => onCardClick?.({ type: 'custom', customTabName: custom.name })}
          className="rounded-xl bg-gradient-to-br from-white to-indigo-50 border border-indigo-200 px-3 py-2.5 shadow-sm text-left hover:border-indigo-300 hover:shadow-md cursor-pointer min-w-0"
        >
          <div className="text-[10px] uppercase tracking-wide text-slate-500 truncate">{custom.name}</div>
          <div className="text-xl font-bold mt-1 text-indigo-600">{custom.count}</div>
        </button>
      ))}
    </div>
  );
};

export default CRMStatsCards;
