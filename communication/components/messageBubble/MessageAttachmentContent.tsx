import React from 'react';
import { Download, Eye, FileText, Loader2 } from 'lucide-react';
import { ChatMessage } from '../../types';
import { renderLinkedText } from './messageBubbleHelpers';

export type AttachmentMeta = {
  category: string;
  label: string;
  badge: string;
  badgeClass: string;
  iconClass: string;
};

export type MessageAttachmentContentProps = {
  message: ChatMessage;
  isOwn: boolean;
  senderName?: string;
  showSenderName?: boolean;
  isImageAttachment: boolean;
  isVideoAttachment: boolean;
  isAudioAttachment: boolean;
  attachmentName: string;
  attachmentMeta: AttachmentMeta;
  attachmentSize: string | null;
  directFileUrl: string;
  canOpenAttachment: boolean;
  hasDownloadTarget: boolean;
  actionLoading: null | 'download';
  setImagePreviewOpen: (open: boolean) => void;
  triggerDownload: () => void | Promise<void>;
  triggerOpen: () => void;
};

export function MessageAttachmentContent({
  message,
  isOwn,
  senderName,
  showSenderName,
  isImageAttachment,
  isVideoAttachment,
  isAudioAttachment,
  attachmentName,
  attachmentMeta,
  attachmentSize,
  directFileUrl,
  canOpenAttachment,
  hasDownloadTarget,
  actionLoading,
  setImagePreviewOpen,
  triggerDownload,
  triggerOpen,
}: MessageAttachmentContentProps) {
  return (
                <div className="space-y-2">
                  {showSenderName && !isOwn && senderName ? (
                    <div className="text-[11px] font-semibold text-slate-600">{senderName}</div>
                  ) : null}

                  {isImageAttachment ? (
                    <div className="relative w-full max-w-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_26px_rgba(15,23,42,0.10)]">
                      <div className="group/image relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (canOpenAttachment && !message.pending) {
                              setImagePreviewOpen(true);
                            }
                          }}
                          className="block w-full cursor-zoom-in"
                          aria-label={`Preview ${attachmentName}`}
                          disabled={!canOpenAttachment || !!message.pending}
                        >
                          <img
                            src={message.localPreviewUrl || directFileUrl}
                            alt={attachmentName}
                            className="h-44 w-full bg-slate-100 object-cover"
                          />
                        </button>
                        {message.pending ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow">
                              <Loader2 size={12} className="animate-spin text-brand-red" />
                              Uploading…
                            </span>
                          </div>
                        ) : null}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent opacity-0 transition-opacity duration-200 group-hover/image:opacity-100" />
                        <div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 transition-all duration-200 group-hover/image:opacity-100">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void triggerDownload();
                            }}
                            title={`Download ${attachmentName}`}
                            aria-label={`Download ${attachmentName}`}
                            disabled={!hasDownloadTarget || actionLoading === 'download'}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/95 text-slate-700 shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === 'download' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-3 py-2.5 text-slate-900">
                        <div className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold tracking-[0.18em] ${attachmentMeta.badgeClass}`}>
                          {attachmentMeta.badge}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold">{attachmentName}</div>
                          <div className="text-[11px] text-slate-500">
                            {[attachmentMeta.label, attachmentSize].filter(Boolean).join(' | ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {isVideoAttachment ? (
                    <div className="relative w-full max-w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_26px_rgba(15,23,42,0.10)]">
                      <video
                        src={message.localPreviewUrl || directFileUrl}
                        controls={!message.pending}
                        preload="metadata"
                        className="h-52 w-full bg-slate-950 object-cover"
                      />
                      {message.pending ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow">
                            <Loader2 size={12} className="animate-spin text-brand-red" />
                            Uploading…
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-3 px-3 py-3 text-slate-900">
                        <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${attachmentMeta.iconClass}`}>
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold">{attachmentName}</div>
                          <div className="text-[11px] text-slate-500">
                            {[attachmentMeta.label, attachmentSize].filter(Boolean).join(' | ')}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={triggerOpen}
                            disabled={!canOpenAttachment}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                            title={`Open ${attachmentName}`}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={triggerDownload}
                            disabled={!hasDownloadTarget || actionLoading === 'download'}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                            title={`Download ${attachmentName}`}
                          >
                            {actionLoading === 'download' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {isAudioAttachment ? (
                    <div className="w-full min-w-[260px] max-w-[320px] rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                      <div className="mb-3 flex items-center gap-3">
                        <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${attachmentMeta.iconClass}`}>
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-slate-900">{attachmentName}</div>
                          <div className="text-[11px] text-slate-500">
                            {[attachmentMeta.label, attachmentSize].filter(Boolean).join(' | ')}
                          </div>
                        </div>
                      </div>
                      <audio src={directFileUrl} controls className="w-full" preload="metadata" />
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={triggerOpen}
                          disabled={!canOpenAttachment}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Eye size={14} />
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={triggerDownload}
                          disabled={!hasDownloadTarget || actionLoading === 'download'}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading === 'download' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          Download
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {!isImageAttachment && !isVideoAttachment && !isAudioAttachment ? (
                    <div className="relative w-full min-w-[260px] max-w-[340px] rounded-2xl border border-slate-200 bg-white p-3 text-left text-slate-900 shadow-sm">
                      {message.pending ? (
                        <div className="absolute inset-0 z-[1] flex items-center justify-center rounded-2xl bg-white/70">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm">
                            <Loader2 size={12} className="animate-spin text-brand-red" />
                            Uploading…
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-start gap-3">
                        <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${attachmentMeta.iconClass}`}>
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-[13px] font-semibold">{attachmentName}</div>
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.16em] ${attachmentMeta.badgeClass}`}>
                              {attachmentMeta.badge}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {[attachmentMeta.label, attachmentSize].filter(Boolean).join(' | ')}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={triggerDownload}
                              disabled={!hasDownloadTarget || actionLoading === 'download'}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {actionLoading === 'download' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {message.content ? (
                    <div className="whitespace-pre-wrap break-words text-[14px] leading-5">
                      {renderLinkedText(message.content)}
                    </div>
                  ) : null}
                </div>
  );
}
