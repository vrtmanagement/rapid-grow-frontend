import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { formatContentCreatedStamp } from '../../views/contentViewShared';

type MomentEntry = {
  id: string;
  date: string;
  topic: string;
  text: string;
  createdAt: string;
};

type MomentsListProps = {
  momentEntries: MomentEntry[];
  onEdit: (entry: MomentEntry) => void;
  onDelete: (id: string) => void;
};

const MomentsList: React.FC<MomentsListProps> = ({ momentEntries, onEdit, onDelete }) => {
  if (momentEntries.length === 0) return null;

  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/90 px-5 py-4 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-lg font-semibold text-slate-900">Your Moments</h4>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          {momentEntries.length} item{momentEntries.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="space-y-3">
        {momentEntries
          .slice()
          .sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`))
          .map((entry) => {
            const addedStamp = formatContentCreatedStamp(entry.createdAt);
            return (
              <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">{entry.date}</p>
                    <p className="text-base font-medium text-slate-900">{entry.text}</p>
                    {entry.topic ? (
                      <p className="text-sm text-slate-500">Topic: {entry.topic}</p>
                    ) : null}
                    {addedStamp ? (
                      <p className="text-[11px] text-slate-500">Added {addedStamp}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(entry)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(entry.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default MomentsList;
