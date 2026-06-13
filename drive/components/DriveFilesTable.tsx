import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckSquare,
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
  Presentation,
  Trash2,
} from 'lucide-react';
import { SkeletonBlock } from '../../components/ui/Skeleton';
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

type FileMeta = {
  label: string;
  shortLabel: string;
  badgeClassName: string;
  iconClassName: string;
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
  return match ? match[1].toUpperCase() : 'FILE';
}

function isPdfFile(file: DriveFile) {
  return file.extension?.toLowerCase() === 'pdf' || /\.pdf$/i.test(file.fileName);
}

function getPreviewUrl(file: DriveFile) {
  return file.secureUrl || file.cloudinaryUrl || file.downloadUrl || '';
}

function getFileTypeMeta(file: DriveFile): FileMeta {
  const category = String(file.fileCategory || '').toLowerCase();
  const extension = file.extension?.toLowerCase() || '';

  if (category === 'image') {
    return {
      label: 'Image',
      shortLabel: 'IMG',
      badgeClassName: 'bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-100',
      iconClassName: 'text-rose-500',
    };
  }
  if (category === 'media' && file.mimeType.startsWith('audio/')) {
    return {
      label: 'Audio',
      shortLabel: 'MP3',
      badgeClassName: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-100',
      iconClassName: 'text-red-500',
    };
  }
  if (category === 'media') {
    return {
      label: 'Video',
      shortLabel: 'VID',
      badgeClassName: 'bg-red-50 text-brand-red ring-1 ring-inset ring-red-100',
      iconClassName: 'text-brand-red',
    };
  }
  if (category === 'archive') {
    return {
      label: 'Archive',
      shortLabel: 'ZIP',
      badgeClassName: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
      iconClassName: 'text-slate-600',
    };
  }
  if (/\.(ppt|pptx)$/i.test(file.fileName) || extension === 'ppt' || extension === 'pptx') {
    return {
      label: 'PowerPoint',
      shortLabel: 'PPT',
      badgeClassName: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100',
      iconClassName: 'text-amber-500',
    };
  }
  if (/\.(xls|xlsx|csv)$/i.test(file.fileName) || extension === 'xls' || extension === 'xlsx' || extension === 'csv') {
    return {
      label: 'Excel',
      shortLabel: 'XLS',
      badgeClassName: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
      iconClassName: 'text-emerald-600',
    };
  }
  if (/\.(doc|docx)$/i.test(file.fileName) || extension === 'doc' || extension === 'docx') {
    return {
      label: 'Word',
      shortLabel: 'DOC',
      badgeClassName: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100',
      iconClassName: 'text-sky-600',
    };
  }
  if (/\.(drawio|svg)$/i.test(file.fileName) || extension === 'drawio' || extension === 'svg') {
    return {
      label: 'Diagram',
      shortLabel: 'SVG',
      badgeClassName: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100',
      iconClassName: 'text-violet-500',
    };
  }
  if (isPdfFile(file)) {
    return {
      label: 'PDF',
      shortLabel: 'PDF',
      badgeClassName: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100',
      iconClassName: 'text-rose-500',
    };
  }

  return {
    label: 'Document',
    shortLabel: getFileExtension(file.fileName),
    badgeClassName: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
    iconClassName: 'text-slate-600',
  };
}

function FileTypeIcon({ file }: { file: DriveFile }) {
  const meta = getFileTypeMeta(file);
  const label = meta.label.toLowerCase();

  if (label === 'image') return <FileImage size={28} className={meta.iconClassName} />;
  if (label === 'audio') return <FileAudio size={28} className={meta.iconClassName} />;
  if (label === 'video') return <FileVideo size={28} className={meta.iconClassName} />;
  if (label === 'archive') return <FileArchive size={28} className={meta.iconClassName} />;
  if (label === 'excel') return <FileSpreadsheet size={28} className={meta.iconClassName} />;
  if (label === 'powerpoint') return <Presentation size={28} className={meta.iconClassName} />;
  return <FileText size={28} className={meta.iconClassName} />;
}

function isImageFile(file: DriveFile) {
  return String(file.fileCategory || '').toLowerCase() === 'image';
}

function FileGlyph({ file }: { file: DriveFile }) {
  const meta = getFileTypeMeta(file);
  const label = meta.label.toLowerCase();

  if (label === 'pdf') {
    return (
      <div className="relative h-[128px] w-[96px]">
        <div className="absolute inset-0 rounded-[0.35rem] border border-slate-300 bg-white shadow-[0_10px_18px_-14px_rgba(15,23,42,0.28)]" />
        <div className="absolute right-0 top-0 h-6 w-6 border-b border-l border-slate-200 bg-slate-50" style={{ clipPath: 'polygon(0 0, 100% 100%, 100% 0)' }} />
        <div className="absolute inset-x-[0.9rem] top-4 space-y-1">
          <div className="h-px bg-slate-200" />
          <div className="h-px bg-slate-200" />
          <div className="h-px bg-slate-200" />
          <div className="h-px bg-slate-200" />
        </div>
        <div className="absolute inset-x-0 bottom-6 bg-[#ef000f] py-2 text-center text-[1.95rem] font-bold tracking-[0.12em] text-white">
          PDF
        </div>
      </div>
    );
  }

  if (label === 'word' || label === 'excel' || label === 'powerpoint') {
    const accentClassName =
      label === 'word'
        ? 'from-sky-500 to-blue-700'
        : label === 'excel'
        ? 'from-emerald-500 to-emerald-700'
        : 'from-orange-500 to-amber-700';
    const chipText = label === 'word' ? 'W' : label === 'excel' ? 'X' : 'P';

    return (
      <div className="relative h-[128px] w-[96px]">
        <div className="absolute inset-0 rounded-[0.35rem] border border-slate-300 bg-white shadow-[0_10px_18px_-14px_rgba(15,23,42,0.28)]" />
        <div
          className="absolute right-0 top-0 h-6 w-6 border-b border-l border-slate-200 bg-slate-50"
          style={{ clipPath: 'polygon(0 0, 100% 100%, 100% 0)' }}
        />
        <div className="absolute inset-x-[0.9rem] top-4 space-y-1">
          <div className="h-px bg-slate-200" />
          <div className="h-px bg-slate-200" />
          <div className="h-px bg-slate-200" />
          <div className="h-px bg-slate-200" />
        </div>
        <div
          className={`absolute left-1/2 top-1/2 flex h-[58px] w-[58px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1rem] bg-gradient-to-br text-[2.2rem] font-black text-white shadow-[0_16px_24px_-18px_rgba(15,23,42,0.32)] ${accentClassName}`}
        >
          {chipText}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[128px] w-[96px]">
      <div className="absolute inset-0 rounded-[0.35rem] border-2 border-slate-400 bg-white shadow-[0_10px_18px_-14px_rgba(15,23,42,0.28)]" />
      <div className="absolute right-0 top-0 h-6 w-6 border-b-2 border-l-2 border-slate-300 bg-slate-50" style={{ clipPath: 'polygon(0 0, 100% 100%, 100% 0)' }} />
      <div className="absolute inset-x-0 bottom-4 flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          <FileTypeIcon file={file} />
        </div>
      </div>
    </div>
  );
}

function FilePreview({ file }: { file: DriveFile }) {
  const previewUrl = getPreviewUrl(file);

  if (isImageFile(file) && previewUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <img
          src={previewUrl}
          alt={file.fileName}
          loading="lazy"
          decoding="async"
          className="max-h-full max-w-full rounded-[0.55rem] border border-slate-200 bg-white object-contain shadow-[0_12px_24px_-16px_rgba(15,23,42,0.28)] transition duration-300 group-hover:scale-[1.02]"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <FileGlyph file={file} />
    </div>
  );
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
    <div className="pointer-events-auto flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-7 w-7 items-center justify-center text-slate-400 transition duration-200 hover:text-slate-700 ${
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        aria-label={`Actions for ${file.fileName}`}
      >
        <EllipsisVertical size={16} />
      </button>

      {open && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[140] min-w-[188px] overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-[0_28px_60px_-30px_rgba(15,23,42,0.45)]"
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

function FileCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-2">
      <SkeletonBlock className="h-[9rem] w-[11rem] rounded-2xl" />
      <div className="w-[11rem] space-y-2">
        <SkeletonBlock className="mx-auto h-4 w-4/5 rounded-full" />
        <SkeletonBlock className="mx-auto h-3 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

function FileHoverTooltip({ file, meta, visible }: { file: DriveFile; meta: FileMeta; visible: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-[4.5rem] z-[120] w-max min-w-[14rem] max-w-[16rem] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-[0_24px_55px_-24px_rgba(15,23,42,0.4)] transition duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1.5 text-xs leading-5">
        <span className="font-semibold text-slate-400">Type:</span>
        <span className="text-slate-700">{meta.label}</span>
        <span className="font-semibold text-slate-400">Size:</span>
        <span className="text-slate-700">{formatFileSize(file.fileSize)}</span>
        <span className="font-semibold text-slate-400">Updated:</span>
        <span className="text-slate-700">{formatCalendarDate(file.updatedAt)}</span>
      </div>
    </div>
  );
}

function FileCard({
  file,
  selected,
  selectionMode,
  onDownload,
  onRename,
  onMove,
  onDelete,
  onSelect,
  onForward,
  onToggleFileSelection,
}: {
  file: DriveFile;
  selected: boolean;
  selectionMode: boolean;
  onDownload: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
  onMove: (file: DriveFile) => void;
  onDelete: (file: DriveFile) => void;
  onSelect: (file: DriveFile) => void;
  onForward: (file: DriveFile) => void;
  onToggleFileSelection: (fileId: string) => void;
}) {
  const meta = getFileTypeMeta(file);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimerRef = useRef<number | null>(null);

  function handleMouseEnter() {
    if (tooltipTimerRef.current !== null) {
      window.clearTimeout(tooltipTimerRef.current);
    }
    tooltipTimerRef.current = window.setTimeout(() => {
      setTooltipVisible(true);
      tooltipTimerRef.current = null;
    }, 2000);
  }

  function handleMouseLeave() {
    if (tooltipTimerRef.current !== null) {
      window.clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    setTooltipVisible(false);
  }

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current !== null) {
        window.clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  return (
    <article
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex flex-col items-center gap-3 rounded-2xl px-2 py-2 transition duration-200 ease-out ${
        selected
          ? 'bg-red-50/55 ring-1 ring-brand-red/20'
          : 'hover:bg-slate-50/65'
      }`}
    >
      <FileHoverTooltip file={file} meta={meta} visible={tooltipVisible} />

      <div className={`relative flex w-full items-center justify-center overflow-hidden rounded-2xl ${isImageFile(file) ? 'h-[9rem]' : 'h-[9rem]'}`}>
        <button
          type="button"
          onClick={() => onDownload(file)}
          className="absolute inset-0"
          aria-label={`Download ${file.fileName}`}
        >
          <span className="sr-only">Download {file.fileName}</span>
        </button>
        <FilePreview file={file} />

        <label
          className={`pointer-events-auto absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border bg-white text-slate-600 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.4)] transition duration-200 ${
            selected
              ? 'border-brand-red/35 bg-red-50 text-brand-red opacity-100'
              : 'border-slate-200 opacity-0 group-hover:opacity-100'
          } ${selectionMode ? 'opacity-100' : ''}`}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleFileSelection(file.id)}
            className="h-4 w-4 rounded border-slate-300 accent-red-500"
            aria-label={`Select ${file.fileName}`}
          />
        </label>

        <div className="absolute right-4 top-4">
          <FileActionMenu
            file={file}
            onDownload={onDownload}
            onRename={onRename}
            onMove={onMove}
            onDelete={onDelete}
            onSelect={onSelect}
            onForward={onForward}
          />
        </div>
      </div>

      <div className="w-full max-w-[12rem] space-y-1">
        <button
          type="button"
          onClick={() => onDownload(file)}
          className="line-clamp-3 w-full break-words text-center text-[0.98rem] font-medium leading-6 text-slate-900 transition hover:text-brand-red"
          title={file.fileName}
        >
          {file.fileName}
        </button>
        <div className="space-y-1 text-center">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{getFileExtension(file.fileName)}</div>
          <div className="text-xs text-slate-500">{formatCalendarDate(file.updatedAt)}</div>
        </div>
      </div>
    </article>
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
    <div className="space-y-4">
      {selectionMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.15rem] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_20px_45px_-34px_rgba(15,23,42,0.18)]">
          <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={allVisibleSelected && files.length > 0}
              onChange={onToggleSelectAll}
              className="h-4 w-4 rounded border-slate-300"
              aria-label="Select all visible files"
            />
            Select all visible files
          </label>
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            {selectedFileIds.length} selected
          </div>
        </div>
      ) : null}

      <div>
        {loading && files.length === 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <FileCardSkeleton key={`drive-file-skeleton-${index}`} />
            ))}
          </div>
        ) : files.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                selected={selectedIdSet.has(file.id)}
                selectionMode={selectionMode}
                onDownload={onDownload}
                onRename={onRename}
                onMove={onMove}
                onDelete={onDelete}
                onSelect={onSelect}
                onForward={onForward}
                onToggleFileSelection={onToggleFileSelection}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-slate-200 bg-white/80 px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-slate-100">
              <FileText size={28} className="text-slate-400" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">No files found</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Upload files to this workspace and they will appear here as rich previews with details and quick actions.
            </p>
          </div>
        )}
      </div>

      {hasMore ? (
        <div ref={sentinelRef} className="pt-2 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:text-brand-red"
          >
            Load more files
          </button>
        </div>
      ) : null}
    </div>
  );
}
