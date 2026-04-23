import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';

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
  onDeleteCustomTab?: (tabName: string) => void;
  deletingCustomTabName?: string;
}

const CRMStatsCards: React.FC<CRMStatsCardsProps> = ({
  stats,
  onCardClick,
  onDeleteCustomTab,
  deletingCustomTabName,
}) => {
  const [openMenuTab, setOpenMenuTab] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cards: Array<[string, number, string, 'total' | 'hot' | 'warm' | 'cold']> = [
    ['Total Leads', stats.total, 'text-slate-700', 'total'],
    ['Hot Leads', stats.hot, 'text-red-600', 'hot'],
    ['Warm Leads', stats.warm, 'text-amber-600', 'warm'],
    ['Cold Leads', stats.cold, 'text-blue-600', 'cold'],
  ];
  const customCards = Array.isArray(stats.customCounts) ? stats.customCounts : [];

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpenMenuTab('');
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  return (
    <div ref={rootRef} className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
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
      {customCards.map((custom) => {
        const isDeleting = deletingCustomTabName === custom.name;
        const isMenuOpen = openMenuTab === custom.name;
        return (
          <div
            key={custom.name}
            className="relative rounded-xl bg-gradient-to-br from-white to-indigo-50 border border-indigo-200 px-3 py-2.5 shadow-sm min-w-0 hover:border-indigo-300 hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => onCardClick?.({ type: 'custom', customTabName: custom.name })}
              className="w-full text-left"
            >
              <div className="text-[10px] uppercase tracking-wide text-slate-500 truncate pr-6">{custom.name}</div>
              <div className="text-xl font-bold mt-1 text-indigo-600">{custom.count}</div>
            </button>
            {onDeleteCustomTab ? (
              <div className="absolute top-2 right-2">
                <button
                  type="button"
                  className="h-6 w-6 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuTab((prev) => (prev === custom.name ? '' : custom.name));
                  }}
                  title="More actions"
                >
                  <MoreVertical size={14} />
                </button>
                {isMenuOpen ? (
                  <div className="absolute right-0 mt-1 w-36 rounded-lg border border-slate-200 bg-white shadow-xl p-1 z-20">
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-red-50 text-red-600 inline-flex items-center gap-2 disabled:opacity-60"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomTab(custom.name);
                        setOpenMenuTab('');
                      }}
                      disabled={isDeleting}
                    >
                      <Trash2 size={14} />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default CRMStatsCards;
