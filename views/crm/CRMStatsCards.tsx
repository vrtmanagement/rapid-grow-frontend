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
}

const CRMStatsCards: React.FC<CRMStatsCardsProps> = ({ stats }) => {
  const cards = [
    ['Total Leads', stats.total, 'text-slate-700'],
    ['Hot Leads', stats.hot, 'text-red-600'],
    ['Warm Leads', stats.warm, 'text-amber-600'],
    ['Cold Leads', stats.cold, 'text-blue-600'],
    ['Converted', stats.converted, 'text-emerald-600'],
    ['This Month', stats.thisMonth, 'text-violet-600'],
  ];
  const customCards = Array.isArray(stats.customCounts) ? stats.customCounts : [];
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      {cards.map(([label, value, tone]) => (
        <div key={label} className="rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
          <div className={`text-2xl font-bold mt-1 ${tone}`}>{value}</div>
        </div>
      ))}
      {customCards.map((custom) => (
        <div key={custom.name} className="rounded-2xl bg-gradient-to-br from-white to-indigo-50 border border-indigo-200 p-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 truncate">{custom.name}</div>
          <div className="text-2xl font-bold mt-1 text-indigo-600">{custom.count}</div>
        </div>
      ))}
    </div>
  );
};

export default CRMStatsCards;
