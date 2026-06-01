import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Plus, Search } from 'lucide-react';
import type { TravelRequest } from './expenseTypes';
import {
  formatCurrency,
  formatTravelDateRange,
  statusBadgeClass,
  travelStatusLabel,
} from './expenseTypes';

interface TravelRequestsSectionProps {
  items: TravelRequest[];
  loading?: boolean;
  onNewTrip?: () => void;
}

function parseTravelPurpose(notes?: string, fallback = '—') {
  if (!notes) return fallback;
  try {
    const parsed = JSON.parse(notes) as { purposeType?: string };
    return parsed.purposeType || fallback;
  } catch {
    return notes.trim() || fallback;
  }
}

type TravelSortField = 'tripName' | 'destination' | 'budget';
type SortDirection = 'asc' | 'desc';

const TravelRequestsSection: React.FC<TravelRequestsSectionProps> = ({
  items,
  loading = false,
  onNewTrip,
}) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<TravelSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((travel) => {
      const haystack = [travel.purpose, travel.fromLocation, travel.toLocation, parseTravelPurpose(travel.notes)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [items, search]);

  const handleSort = (field: TravelSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems;
    const sorted = [...filteredItems];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'tripName') {
        cmp = (a.purpose || '').localeCompare(b.purpose || '', undefined, { sensitivity: 'base' });
      } else if (sortField === 'destination') {
        cmp = (a.toLocation || '').localeCompare(b.toLocation || '', undefined, { sensitivity: 'base' });
      } else {
        cmp = (Number(a.estimatedCost) || 0) - (Number(b.estimatedCost) || 0);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredItems, sortField, sortDirection]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trips or destinations..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-300"
          />
        </div>
        {onNewTrip && (
          <button
            type="button"
            onClick={onNewTrip}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            <Plus size={18} />
            New Travel Request
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : !filteredItems.length ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">No travel requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-sm font-semibold text-slate-700">
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('tripName')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Trip Name
                      <ArrowUpDown size={14} className="text-slate-400" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('destination')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Destination
                      <ArrowUpDown size={14} className="text-slate-400" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('budget')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Est. Budget
                      <ArrowUpDown size={14} className="text-slate-400" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((travel) => (
                  <tr key={travel._id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-blue-600">{travel.purpose}</td>
                    <td className="px-4 py-3 text-slate-700">{travel.toLocation}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatTravelDateRange(travel.startDate, travel.endDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{parseTravelPurpose(travel.notes)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(travel.estimatedCost)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(travel.status)}`}>
                        {travelStatusLabel(travel.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelRequestsSection;
