import React from 'react';
import { ArrowLeft, CalendarDays, FileText, Pencil, Trash2 } from 'lucide-react';
import type { DriveEntry } from '../types';

function formatLongDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function DriveNoteViewer({
  entry,
  onBack,
  onEdit,
  onDelete,
}: {
  entry: DriveEntry;
  onBack: () => void;
  onEdit: (entry: DriveEntry) => void;
  onDelete: (entry: DriveEntry) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:text-brand-red"
          >
            <ArrowLeft size={15} />
            Back to Notes
          </button>
          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[1.9rem] font-semibold tracking-tight text-slate-900">{entry.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="inline-flex items-center gap-2 uppercase tracking-[0.14em]">Text Note</span>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={14} />
                  {formatLongDate(entry.updatedAt)}
                </span>
              </div>
              {entry.description ? (
                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">{entry.description}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:text-brand-red"
          >
            <Pencil size={15} />
            Edit Note
          </button>
          <button
            type="button"
            onClick={() => onDelete(entry)}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-6">
        <div className="whitespace-pre-wrap text-[1rem] leading-8 text-slate-700">
          {entry.contentText || 'No text added yet.'}
        </div>
      </div>
    </section>
  );
}
