import React, { useEffect, useRef } from 'react';
import {
  Briefcase,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Globe,
  Link2,
  MoveRight,
  Pencil,
  Presentation,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { CardGridSkeleton } from '../../components/ui/Skeleton';
import type { DriveFolder } from '../types';
import { getDisplayAvatarUrl } from '../../utils/avatar';

type DriveFolderGridProps = {
  folders: DriveFolder[];
  loading: boolean;
  hasMore: boolean;
  layout: 'grid' | 'list';
  onLoadMore: () => void;
  onOpen: (folder: DriveFolder) => void;
  onRename: (folder: DriveFolder) => void;
  onMove: (folder: DriveFolder) => void;
  onDelete: (folder: DriveFolder) => void;
  onCreateFolder: () => void;
};

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getInitials(name?: string | null) {
  const clean = String(name || '').trim();
  if (!clean) return 'RG';
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function getFolderVisual(folder: DriveFolder) {
  const storageMode = String(folder.storageMode || 'general');
  const normalized = String(folder.name || '').trim().toLowerCase();

  if (storageMode === 'images') {
    return {
      icon: FileImage,
      tileClassName: 'border-rose-100 bg-white text-rose-500',
    };
  }
  if (storageMode === 'links' || /(link|url|web|site|bookmark)/.test(normalized)) {
    return {
      icon: Link2,
      tileClassName: 'border-red-100 bg-white text-brand-red',
    };
  }
  if (/(pdf|doc|docs|document|contract|proposal|report|handbook|policy)/.test(normalized)) {
    return {
      icon: FileText,
      tileClassName: 'border-rose-100 bg-white text-rose-500',
    };
  }
  if (storageMode === 'text' || /(doc|note|text|copy|script|content|brief)/.test(normalized)) {
    return {
      icon: FileText,
      tileClassName: 'border-sky-100 bg-white text-sky-600',
    };
  }
  if (/(image|photo|design|creative|brand|logo)/.test(normalized)) {
    return {
      icon: FileImage,
      tileClassName: 'border-rose-100 bg-white text-rose-500',
    };
  }
  if (/(sheet|excel|finance|budget|data|reporting)/.test(normalized)) {
    return {
      icon: FileSpreadsheet,
      tileClassName: 'border-emerald-100 bg-white text-emerald-600',
    };
  }
  if (/(presentation|deck|pitch|slides|ppt)/.test(normalized)) {
    return {
      icon: Presentation,
      tileClassName: 'border-amber-100 bg-white text-amber-500',
    };
  }
  if (/(marketing|social|public|external|company)/.test(normalized)) {
    return {
      icon: Globe,
      tileClassName: 'border-violet-100 bg-white text-violet-600',
    };
  }
  if (/(legal|compliance|policy|security|admin)/.test(normalized)) {
    return {
      icon: ShieldCheck,
      tileClassName: 'border-slate-200 bg-white text-slate-600',
    };
  }
  if (/(team|project|client|sales|product|engineering|hr|ops)/.test(normalized)) {
    return {
      icon: Briefcase,
      tileClassName: 'border-red-100 bg-white text-brand-red',
    };
  }
  if (storageMode === 'mixed') {
    return {
      icon: Briefcase,
      tileClassName: 'border-amber-100 bg-white text-amber-500',
    };
  }

  return {
    icon: Folder,
    tileClassName: 'border-red-100 bg-white text-amber-400',
  };
}

function getFolderStatItems(folder: DriveFolder) {
  const stats: string[] = [];

  if (folder.childFolderCount > 0) {
    stats.push(`${folder.childFolderCount} folders`);
  }

  if (folder.storageMode === 'links') {
    if (folder.linkCount > 0) {
      stats.push(`${folder.linkCount} links`);
    }
  } else if (folder.storageMode === 'images') {
    if (folder.fileCount > 0) {
      stats.push(`${folder.fileCount} images`);
    }
  } else if (folder.storageMode === 'text') {
    if (folder.textCount > 0) {
      stats.push(`${folder.textCount} notes`);
    }
  } else if (folder.storageMode === 'mixed') {
    if (folder.linkCount > 0) {
      stats.push(`${folder.linkCount} links`);
    }
    if (folder.textCount > 0) {
      stats.push(`${folder.textCount} notes`);
    }
    if (folder.fileCount > 0) {
      stats.push(`${folder.fileCount} files`);
    }
  } else if (folder.fileCount > 0) {
    stats.push(`${folder.fileCount} files`);
  }

  return stats;
}

function IconActionButton({
  label,
  onClick,
  children,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="group/tooltip relative">
      <button
        type="button"
        onClick={onClick}
        className={`rounded-lg p-2 transition ${
          danger
            ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
            : 'text-slate-400 hover:bg-red-50 hover:text-brand-red'
        }`}
        aria-label={label}
      >
        {children}
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-900 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
      >
        {label}
      </div>
    </div>
  );
}

export default function DriveFolderGrid({
  folders,
  loading,
  hasMore,
  layout,
  onLoadMore,
  onOpen,
  onRename,
  onMove,
  onDelete,
  onCreateFolder,
}: DriveFolderGridProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onLoadMore();
      }
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, folders.length]);

  if (loading && folders.length === 0) {
    return <CardGridSkeleton count={4} />;
  }

  function renderActions(folder: DriveFolder) {
    return (
      <div className="ml-3 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <IconActionButton label="Rename folder" onClick={() => onRename(folder)}>
          <Pencil size={15} />
        </IconActionButton>
        <IconActionButton label="Move folder" onClick={() => onMove(folder)}>
          <MoveRight size={15} />
        </IconActionButton>
        <IconActionButton label="Delete folder" onClick={() => onDelete(folder)} danger>
          <Trash2 size={15} />
        </IconActionButton>
      </div>
    );
  }

  function renderCreateCard() {
    if (layout === 'list') {
      return (
        <button
          type="button"
          onClick={onCreateFolder}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/80 px-6 py-4 text-sm font-medium text-slate-500 transition hover:border-red-200 hover:text-brand-red"
        >
          <Folder size={18} className="text-amber-400" />
          New Folder
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={onCreateFolder}
        className="flex h-full min-h-[164px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/70 px-6 py-5 text-center transition hover:border-red-200 hover:text-brand-red"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-300">
          <Folder size={24} />
        </div>
        <div className="text-base font-semibold text-slate-400">New Folder</div>
      </button>
    );
  }

  if (!folders.length) {
    return renderCreateCard();
  }

  function renderFolderCard(folder: DriveFolder) {
    const ownerName = folder.createdBy?.name || 'RapidGrow';
    const ownerAvatar = folder.createdBy?.avatar ? getDisplayAvatarUrl(folder.createdBy.avatar, ownerName) : '';
    const visual = getFolderVisual(folder);
    const FolderIcon = visual.icon;
    const statItems = getFolderStatItems(folder);
    return (
      <article
        key={folder.id}
        className="group flex h-full min-h-[164px] flex-col overflow-visible rounded-xl border border-slate-200 bg-white transition hover:border-red-200"
      >
        <div className="flex flex-1 items-start justify-between gap-3 px-5 pt-4 pb-3">
          <button
            type="button"
            onClick={() => onOpen(folder)}
            className="flex min-w-0 flex-1 items-start gap-4 text-left"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${visual.tileClassName}`}>
              <FolderIcon size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-[1.05rem] font-semibold leading-7 text-slate-900">
                {folder.name}
              </div>
              <div className="mt-1 truncate text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Updated {formatRelativeDate(folder.updatedAt)}
              </div>
              {folder.description ? (
                <div className="mt-2 line-clamp-1 text-sm leading-6 text-slate-500">{folder.description}</div>
              ) : null}
            </div>
          </button>
          {renderActions(folder)}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            {statItems.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {ownerAvatar ? (
              <img
                src={ownerAvatar}
                alt={ownerName}
                className="h-7 w-7 shrink-0 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-semibold text-brand-red">
                {getInitials(ownerName)}
              </div>
            )}
            <div className="truncate text-sm text-slate-400">{ownerName}</div>
          </div>
        </div>
      </article>
    );
  }

  function renderFolderListItem(folder: DriveFolder) {
    const ownerName = folder.createdBy?.name || 'RapidGrow';
    const ownerAvatar = folder.createdBy?.avatar ? getDisplayAvatarUrl(folder.createdBy.avatar, ownerName) : '';
    const visual = getFolderVisual(folder);
    const FolderIcon = visual.icon;
    const statItems = getFolderStatItems(folder);
    return (
      <article
        key={folder.id}
        className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 transition hover:border-red-200"
      >
        <button
          type="button"
          onClick={() => onOpen(folder)}
          className="flex min-w-0 flex-1 items-center gap-4 text-left"
        >
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${visual.tileClassName}`}>
            <FolderIcon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-slate-900">{folder.name}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
              Updated {formatRelativeDate(folder.updatedAt)}
            </div>
          </div>
          <div className="hidden text-sm text-slate-500 lg:flex lg:items-center lg:gap-4">
            {statItems.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div className="hidden min-w-0 items-center gap-2 lg:flex">
            {ownerAvatar ? (
              <img
                src={ownerAvatar}
                alt={ownerName}
                className="h-7 w-7 shrink-0 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-semibold text-brand-red">
                {getInitials(ownerName)}
              </div>
            )}
            <div className="truncate text-sm text-slate-400">{ownerName}</div>
          </div>
        </button>
        {renderActions(folder)}
      </article>
    );
  }

  return (
    <div className="space-y-4">
      <div className={layout === 'grid' ? 'grid grid-cols-1 gap-4 xl:grid-cols-3' : 'space-y-3'}>
        {folders.map((folder) => (layout === 'grid' ? renderFolderCard(folder) : renderFolderListItem(folder)))}
        {renderCreateCard()}
      </div>
      {hasMore ? (
        <div ref={sentinelRef} className="flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:text-brand-red"
          >
            Load more folders
          </button>
        </div>
      ) : null}
    </div>
  );
}
