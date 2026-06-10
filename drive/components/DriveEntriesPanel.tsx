import React from 'react';
import { ExternalLink, Eye, FileText, Link2, Pencil, Trash2 } from 'lucide-react';
import type { DriveEntry } from '../types';

type DriveEntriesPanelProps = {
  entries: DriveEntry[];
  loading: boolean;
  title: string;
  description: string;
  onCreateLink?: () => void;
  onCreateText?: () => void;
  onView?: (entry: DriveEntry) => void;
  onEdit: (entry: DriveEntry) => void;
  onDelete: (entry: DriveEntry) => void;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function EntryIconButton({
  label,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md p-1.5 transition ${
        danger
          ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
          : 'text-slate-400 hover:bg-red-50 hover:text-brand-red'
      }`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export default function DriveEntriesPanel({
  entries,
  loading,
  title,
  description,
  onCreateLink,
  onCreateText,
  onView,
  onEdit,
  onDelete,
}: DriveEntriesPanelProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {onCreateLink ? (
            <button
              type="button"
              onClick={onCreateLink}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:text-brand-red"
            >
              <Link2 size={15} />
              New Link
            </button>
          ) : null}
          {onCreateText ? (
            <button
              type="button"
              onClick={onCreateText}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-red-600"
            >
              <FileText size={15} />
              New Note
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-sm text-slate-500">
          Loading saved items...
        </div>
      ) : entries.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {entries.map((entry) => {
            const isLink = entry.entryType === 'link';
            return (
              <article
                key={entry.id}
                className="group flex min-h-[152px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-red-200"
              >
                <div className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isLink ? 'bg-red-50 text-brand-red' : 'bg-sky-50 text-sky-600'}`}>
                      {isLink ? <Link2 size={17} /> : <FileText size={17} />}
                    </div>
                    {isLink ? (
                      <div className="min-w-0">
                        <div className="truncate text-[1rem] font-semibold text-slate-900">{entry.title}</div>
                        <div className="mt-1 truncate text-[11px] uppercase tracking-[0.14em] text-slate-400">
                          Saved Link <span aria-hidden="true">&middot;</span> {formatDate(entry.updatedAt)}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onView?.(entry)}
                        className="min-w-0 cursor-pointer text-left"
                      >
                        <div className="truncate text-[1rem] font-semibold text-slate-900">{entry.title}</div>
                        <div className="mt-1 truncate text-[11px] uppercase tracking-[0.14em] text-slate-400">
                          Text Note <span aria-hidden="true">&middot;</span> {formatDate(entry.updatedAt)}
                        </div>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    {!isLink && onView ? (
                      <EntryIconButton label={`View ${entry.title}`} onClick={() => onView(entry)}>
                        <Eye size={15} />
                      </EntryIconButton>
                    ) : null}
                    <EntryIconButton label={`Edit ${entry.title}`} onClick={() => onEdit(entry)}>
                      <Pencil size={15} />
                    </EntryIconButton>
                    <EntryIconButton label={`Delete ${entry.title}`} danger onClick={() => onDelete(entry)}>
                      <Trash2 size={15} />
                    </EntryIconButton>
                  </div>
                </div>
                {isLink ? (
                  <div className="flex flex-1 flex-col border-t border-slate-100 px-4 py-3.5 text-left">
                    <div className="space-y-2">
                      <a
                        href={entry.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-brand-red hover:underline"
                      >
                        Open link
                        <ExternalLink size={14} />
                      </a>
                      <div className="line-clamp-1 break-all text-sm text-slate-500">{entry.linkUrl}</div>
                    </div>
                    {entry.description ? (
                      <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{entry.description}</div>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onView?.(entry)}
                    className="flex flex-1 cursor-pointer flex-col border-t border-slate-100 px-4 py-3.5 text-left"
                  >
                    <div className="space-y-1.5">
                      <div className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {entry.contentText || 'No text added yet.'}
                      </div>
                    </div>
                    {entry.description ? (
                      <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{entry.description}</div>
                    ) : null}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 px-5 py-10 text-center text-sm text-slate-500">
          No saved items in this folder yet.
        </div>
      )}
    </section>
  );
}
