import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import type { DriveBreadcrumbItem } from '../types';

type DriveBreadcrumbsProps = {
  items: DriveBreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
};

export default function DriveBreadcrumbs({ items, onNavigate }: DriveBreadcrumbsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-red-200 hover:text-brand-red"
      >
        <Home size={14} />
        Drive
      </button>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.id}>
            <ChevronRight size={14} className="text-slate-300" />
            <button
              type="button"
              onClick={() => onNavigate(isLast ? item.id : item.id)}
              className={`rounded-lg px-3 py-1.5 transition ${
                isLast
                  ? 'bg-red-50 font-semibold text-brand-red'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.name}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
