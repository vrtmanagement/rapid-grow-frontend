import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { DriveBreadcrumbItem } from '../types';

type DriveBreadcrumbsProps = {
  items: DriveBreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
};

export default function DriveBreadcrumbs({ items, onNavigate }: DriveBreadcrumbsProps) {
  const parentId = items.length >= 2 ? items[items.length - 2].id : null;

  return (
    <nav className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onNavigate(parentId)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:text-brand-red"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate(null)}
          className="font-medium text-slate-500 transition hover:text-brand-red"
        >
          Drive
        </button>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={item.id}>
              <ChevronRight size={14} className="text-slate-300" />
              {isLast ? (
                <span className="font-semibold text-slate-900">{item.name}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className="font-medium text-slate-500 transition hover:text-brand-red"
                >
                  {item.name}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
