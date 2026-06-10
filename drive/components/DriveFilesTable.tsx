import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  EllipsisVertical,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Forward,
  MoveRight,
  Pencil,
  CheckSquare,
  Trash2,
} from 'lucide-react';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import type { DriveFile } from '../types';

type DriveFilesTableProps = {
  files: DriveFile[];
  loading: boolean;
  hasMore: boolean;
  selectionMode: boolean;
  selectedFileIds: string[];
  allVisibleSelected: boolean;
  onLoadMore: () => void;
  onDownload: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
  onMove: (file: DriveFile) => void;
  onDelete: (file: DriveFile) => void;
  onSelect: (file: DriveFile) => void;
  onForward: (file: DriveFile) => void;
  onToggleFileSelection: (fileId: string) => void;
  onToggleSelectAll: () => void;
};

type FileMenuProps = {
  file: DriveFile;
  onDownload: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
  onMove: (file: DriveFile) => void;
  onDelete: (file: DriveFile) => void;
  onSelect: (file: DriveFile) => void;
  onForward: (file: DriveFile) => void;
};

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatCalendarDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getFileExtension(name: string) {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? `.${match[1].toUpperCase()}` : 'FILE';
}

function getFileTypeMeta(file: DriveFile) {
  const category = String(file.fileCategory || '').toLowerCase();
  const extension = file.extension?.toLowerCase() || '';

  if (category === 'image') {
    return {
      label: 'Image',
      iconBgClassName: 'bg-rose-50',
      iconClassName: 'text-rose-500',
      badgeClassName: 'bg-rose-50 text-rose-600',
    };
  }
  if (category === 'media' && file.mimeType.startsWith('audio/')) {
    return {
      label: 'Audio',
      iconBgClassName: 'bg-red-50',
      iconClassName: 'text-red-500',
      badgeClassName: 'bg-red-50 text-red-600',
    };
  }
  if (category === 'media') {
    return {
      label: 'Video',
      iconBgClassName: 'bg-red-50',
      iconClassName: 'text-brand-red',
      badgeClassName: 'bg-red-50 text-brand-red',
    };
  }
  if (category === 'archive') {
    return {
      label: 'Archive',
      iconBgClassName: 'bg-slate-100',
      iconClassName: 'text-slate-600',
      badgeClassName: 'bg-slate-100 text-slate-600',
    };
  }
  if (/\.(ppt|pptx)$/i.test(file.fileName) || extension === 'ppt' || extension === 'pptx') {
    return {
      label: 'Presentation',
      iconBgClassName: 'bg-amber-50',
      iconClassName: 'text-amber-500',
      badgeClassName: 'bg-amber-50 text-amber-600',
    };
  }
  if (/\.(xls|xlsx|csv)$/i.test(file.fileName)) {
    return {
      label: 'Spreadsheet',
      iconBgClassName: 'bg-emerald-50',
      iconClassName: 'text-emerald-600',
      badgeClassName: 'bg-emerald-50 text-emerald-600',
    };
  }
  if (/\.(drawio|svg)$/i.test(file.fileName)) {
    return {
      label: 'Diagram',
      iconBgClassName: 'bg-violet-50',
      iconClassName: 'text-violet-500',
      badgeClassName: 'bg-violet-50 text-violet-600',
    };
  }
  if (/\.(pdf)$/i.test(file.fileName)) {
    return {
      label: 'PDF',
      iconBgClassName: 'bg-rose-50',
      iconClassName: 'text-rose-500',
      badgeClassName: 'bg-rose-50 text-rose-600',
    };
  }

  return {
    label: 'Document',
    iconBgClassName: 'bg-sky-50',
    iconClassName: 'text-sky-600',
    badgeClassName: 'bg-sky-50 text-sky-600',
  };
}

function FileTypeIcon({ file }: { file: DriveFile }) {
  const meta = getFileTypeMeta(file);
  const category = meta.label.toLowerCase();
  if (category === 'image') return <FileImage size={18} className={meta.iconClassName} />;
  if (category === 'audio') return <FileAudio size={18} className={meta.iconClassName} />;
  if (category === 'video') return <FileVideo size={18} className={meta.iconClassName} />;
  if (category === 'archive') return <FileArchive size={18} className={meta.iconClassName} />;
  if (category === 'spreadsheet') return <FileSpreadsheet size={18} className={meta.iconClassName} />;
  return <FileText size={18} className={meta.iconClassName} />;
}

function FileActionMenu({
  file,
  onDownload,
  onRename,
  onMove,
  onDelete,
  onSelect,
  onForward,
}: FileMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;

    const calculateMenuPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuHeight = 228;
      const menuWidth = 188;
      const spacing = 10;
      const spaceBelow = window.innerHeight - rect.bottom - spacing;
      const spaceAbove = rect.top - spacing;
      const openBelow = spaceBelow >= menuHeight || spaceBelow >= spaceAbove;
      const top = openBelow
        ? Math.min(window.innerHeight - menuHeight - 12, rect.bottom + spacing)
        : Math.max(12, rect.top - menuHeight - spacing);
      const left = Math.min(window.innerWidth - menuWidth - 12, Math.max(12, rect.right - menuWidth));
      setMenuPosition({ top, left });
    };

    const handleOutsideClick = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (!menuRef.current?.contains(targetNode) && !triggerRef.current?.contains(targetNode)) {
        setOpen(false);
      }
    };

    calculateMenuPosition();
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', calculateMenuPosition);
    window.addEventListener('scroll', calculateMenuPosition, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', calculateMenuPosition);
      window.removeEventListener('scroll', calculateMenuPosition, true);
    };
  }, [open]);

  const menuItemClassName =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50';

  return (
    <div className="flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        aria-label={`Actions for ${file.fileName}`}
      >
        <EllipsisVertical size={16} />
      </button>

      {open && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[140] min-w-[188px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDownload(file);
            }}
            className={menuItemClassName}
          >
            <Download size={15} />
            Download
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSelect(file);
            }}
            className={menuItemClassName}
          >
            <CheckSquare size={15} />
            Select
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onForward(file);
            }}
            className={menuItemClassName}
          >
            <Forward size={15} />
            Forward
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRename(file);
            }}
            className={menuItemClassName}
          >
            <Pencil size={15} />
            Rename
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onMove(file);
            }}
            className={menuItemClassName}
          >
            <MoveRight size={15} />
            Move
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete(file);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
          >
            <Trash2 size={15} />
            Delete
          </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default function DriveFilesTable({
  files,
  loading,
  hasMore,
  selectionMode,
  selectedFileIds,
  allVisibleSelected,
  onLoadMore,
  onDownload,
  onRename,
  onMove,
  onDelete,
  onSelect,
  onForward,
  onToggleFileSelection,
  onToggleSelectAll,
}: DriveFilesTableProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const selectedIdSet = useMemo(() => new Set(selectedFileIds), [selectedFileIds]);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onLoadMore();
      }
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, files.length]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white">
      <div>
        <table className="w-full table-fixed">
          <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="w-14 px-4 py-4">
                {selectionMode ? (
                  <input
                    type="checkbox"
                    checked={allVisibleSelected && files.length > 0}
                    onChange={onToggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300"
                    aria-label="Select all visible files"
                  />
                ) : null}
              </th>
              <th className="w-[38%] px-4 py-4">File</th>
              <th className="w-[14%] px-4 py-4">Date</th>
              <th className="w-[12%] px-4 py-4">Type</th>
              <th className="w-[10%] px-4 py-4">Size</th>
              <th className="w-[16%] px-4 py-4">Updated</th>
              <th className="w-[10%] px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && files.length === 0 ? (
              <TableRowSkeleton columns={7} rows={6} />
            ) : files.length ? (
              files.map((file) => {
                const meta = getFileTypeMeta(file);
                const selected = selectedIdSet.has(file.id);

                return (
                  <tr key={file.id} className="border-t border-slate-100 align-top transition hover:bg-slate-50/60">
                    <td className="px-4 py-4">
                      {selectionMode ? (
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggleFileSelection(file.id)}
                          className="h-4 w-4 rounded border-slate-300"
                          aria-label={`Select ${file.fileName}`}
                        />
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${meta.iconBgClassName}`}>
                          <FileTypeIcon file={file} />
                        </div>
                        <div className="min-w-0 max-w-full">
                          <button
                            type="button"
                            onClick={() => onDownload(file)}
                            className="max-w-full truncate text-left text-[0.98rem] font-semibold text-slate-900 transition hover:text-brand-red"
                          >
                            {file.fileName}
                          </button>
                          <div className="mt-1 truncate text-xs uppercase tracking-[0.14em] text-slate-400">
                            {getFileExtension(file.fileName)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <div className="font-medium text-slate-700">{formatCalendarDate(file.createdAt)}</div>
                      <div className="mt-1 text-xs text-slate-400">{formatDate(file.createdAt)}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <span className={`inline-flex rounded-md px-3 py-1 text-sm font-medium ${meta.badgeClassName}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{formatFileSize(file.fileSize)}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <div className="truncate font-medium text-slate-700">{file.uploadedBy?.name || 'RapidGrow'}</div>
                      <div className="mt-1 text-xs text-slate-400">{formatDate(file.updatedAt)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <FileActionMenu
                        file={file}
                        onDownload={onDownload}
                        onRename={onRename}
                        onMove={onMove}
                        onDelete={onDelete}
                        onSelect={onSelect}
                        onForward={onForward}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">
                  No files found in this location.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {hasMore ? (
        <div ref={sentinelRef} className="border-t border-slate-100 px-5 py-4 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:text-brand-red"
          >
            Load more files
          </button>
        </div>
      ) : null}
    </div>
  );
}
