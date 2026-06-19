import React from 'react';
import { Check, Copy, EllipsisVertical, ExternalLink, Eye, FileText, Globe, Link2, Pencil, Trash2 } from 'lucide-react';
import type { DriveEntry } from '../types';

type DriveEntriesPanelProps = {
  entries: DriveEntry[];
  loading: boolean;
  title: string;
  description: string;
  variant?: 'default' | 'links-list';
  onCreateLink?: () => void;
  onCreateText?: () => void;
  onView?: (entry: DriveEntry) => void;
  onCopyLink?: (entry: DriveEntry) => Promise<boolean> | boolean;
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
  variant = 'default',
  onCreateLink,
  onCreateText,
  onView,
  onCopyLink,
  onEdit,
  onDelete,
}: DriveEntriesPanelProps) {
  const isLinksList = variant === 'links-list';
  const [copiedEntryId, setCopiedEntryId] = React.useState<string | null>(null);
  const [openMenuEntryId, setOpenMenuEntryId] = React.useState<string | null>(null);
  const copyFeedbackTimeoutRef = React.useRef<number | null>(null);
  const linkMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => () => {
    if (copyFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }
  }, []);

  React.useEffect(() => {
    if (!openMenuEntryId) return;

    function handlePointerDown(event: MouseEvent) {
      if (linkMenuRef.current && !linkMenuRef.current.contains(event.target as Node)) {
        setOpenMenuEntryId(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenuEntryId(null);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuEntryId]);

  async function handleCopyLink(entry: DriveEntry) {
    if (!onCopyLink) return;
    const copied = await onCopyLink(entry);
    if (!copied) return;
    setCopiedEntryId(entry.id);
    if (copyFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }
    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopiedEntryId((current) => (current === entry.id ? null : current));
      copyFeedbackTimeoutRef.current = null;
    }, 1600);
  }

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
        isLinksList ? (
          <>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              {entries.map((entry, index) => (
                <article
                  key={entry.id}
                  className={`group flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50/40 md:flex-row md:items-center md:gap-6 ${
                    index !== entries.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-brand-red">
                      <Link2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[1.05rem] font-semibold text-slate-900">{entry.title}</div>
                      <div className="mt-1 truncate text-sm text-slate-500">
                        Saved Link <span aria-hidden="true" className="px-1.5 text-slate-300">&bull;</span> {formatDate(entry.updatedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-0 md:flex-[1.2] items-center gap-3 text-slate-500">
                    <Globe size={17} className="shrink-0" />
                    <div className="min-w-0 truncate text-sm text-slate-600">{entry.linkUrl}</div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    {onCopyLink ? (
                      <button
                        type="button"
                        onClick={() => void handleCopyLink(entry)}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-brand-red"
                        aria-label={copiedEntryId === entry.id ? `Copied ${entry.title}` : `Copy ${entry.title} link`}
                        title={copiedEntryId === entry.id ? 'Copied' : 'Copy link'}
                      >
                        {copiedEntryId === entry.id ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    ) : null}
                    <a
                      href={entry.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-white px-5 py-2.5 text-sm font-semibold text-brand-red transition hover:border-red-200 hover:bg-red-50/50"
                    >
                      Open
                      <ExternalLink size={14} />
                    </a>

                    <div
                      ref={openMenuEntryId === entry.id ? linkMenuRef : undefined}
                      className="relative flex items-center"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenMenuEntryId((current) => (current === entry.id ? null : entry.id))}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`More actions for ${entry.title}`}
                        aria-haspopup="menu"
                        aria-expanded={openMenuEntryId === entry.id}
                      >
                        <EllipsisVertical size={17} />
                      </button>
                      {openMenuEntryId === entry.id ? (
                        <div
                          className="absolute right-0 top-full z-20 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.14)]"
                          role="menu"
                        >
                          <a
                            href={entry.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setOpenMenuEntryId(null)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-brand-red"
                            role="menuitem"
                          >
                            <ExternalLink size={14} />
                            Open link
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuEntryId(null);
                              onEdit(entry);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-brand-red"
                            role="menuitem"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuEntryId(null);
                              onDelete(entry);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-rose-50 hover:text-rose-600"
                            role="menuitem"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="text-center text-sm text-slate-500">
              Showing {entries.length} of {entries.length} links
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {entries.map((entry) => {
              const isLink = entry.entryType === 'link';
              return (
                <article
                  key={entry.id}
                  className={`group flex flex-col overflow-hidden rounded-xl border bg-white transition ${
                    isLink
                      ? 'min-h-[236px] border-slate-200 shadow-[0_12px_30px_rgba(15,23,42,0.06)] hover:border-red-200'
                      : 'min-h-[152px] border-slate-200 hover:border-red-200'
                  }`}
                >
                  <div className={`flex items-start justify-between gap-3 ${isLink ? 'px-4 pb-3 pt-5' : 'px-4 py-3.5'}`}>
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isLink ? 'bg-red-50 text-brand-red' : 'bg-sky-50 text-sky-600'}`}>
                        {isLink ? <Link2 size={18} /> : <FileText size={17} />}
                      </div>
                      {isLink ? (
                        <div className="min-w-0 pt-0.5">
                          <div className="truncate text-[1rem] font-semibold text-slate-900">{entry.title}</div>
                          <div className="mt-1 truncate text-sm text-slate-500">
                            Saved Link <span aria-hidden="true" className="px-1.5 text-slate-300">&bull;</span> {formatDate(entry.updatedAt)}
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
                    {isLink ? (
                      <div
                        ref={openMenuEntryId === entry.id ? linkMenuRef : undefined}
                        className="relative flex items-center opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenMenuEntryId((current) => (current === entry.id ? null : entry.id))}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`More actions for ${entry.title}`}
                          aria-haspopup="menu"
                          aria-expanded={openMenuEntryId === entry.id}
                        >
                          <EllipsisVertical size={16} />
                        </button>
                        {openMenuEntryId === entry.id ? (
                          <div
                            className="absolute right-0 top-full z-20 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.14)]"
                            role="menu"
                          >
                            <a
                              href={entry.linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => setOpenMenuEntryId(null)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-brand-red"
                              role="menuitem"
                            >
                              <ExternalLink size={14} />
                              Open link
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuEntryId(null);
                                onEdit(entry);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-brand-red"
                              role="menuitem"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuEntryId(null);
                                onDelete(entry);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-rose-50 hover:text-rose-600"
                              role="menuitem"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
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
                    )}
                  </div>
                  {isLink ? (
                    <div className="flex flex-1 flex-col px-4 pb-4 text-left">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1 truncate text-sm text-slate-700">{entry.linkUrl}</div>
                          {onCopyLink ? (
                            <button
                              type="button"
                              onClick={() => void handleCopyLink(entry)}
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-brand-red"
                              aria-label={copiedEntryId === entry.id ? `Copied ${entry.title}` : `Copy ${entry.title} link`}
                              title={copiedEntryId === entry.id ? 'Copied' : 'Copy link'}
                            >
                              {copiedEntryId === entry.id ? <Check size={15} /> : <Copy size={15} />}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {entry.description ? (
                        <div className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{entry.description}</div>
                      ) : (
                        <div className="mt-3 flex-1" />
                      )}
                      <div className="mt-4">
                        <a
                          href={entry.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-2.5 text-sm font-semibold text-brand-red transition hover:border-red-200 hover:bg-red-50/50"
                        >
                          Open Link
                          <ExternalLink size={14} />
                        </a>
                      </div>
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
        )
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 px-5 py-10 text-center text-sm text-slate-500">
          No saved items in this folder yet.
        </div>
      )}
    </section>
  );
}
