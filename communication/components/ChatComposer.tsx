import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileUp, Image as ImageIcon, Loader2, Paperclip, Send, X } from 'lucide-react';
import { ChatMessage } from '../types';

function getFileExtension(fileName: string) {
  const normalizedName = String(fileName || '').trim();
  if (!normalizedName.includes('.')) return '';
  return normalizedName.split('.').pop()?.toUpperCase().slice(0, 5) || '';
}

function isImageFile(file?: File | null) {
  return !!file && String(file.type || '').startsWith('image/');
}

function isVideoFile(file?: File | null) {
  return !!file && String(file.type || '').startsWith('video/');
}

function formatFileSize(size?: number) {
  if (!size || Number.isNaN(size)) return '0 KB';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 2)} MB`;
}

function getFileLabel(file?: File | null) {
  const mime = String(file?.type || '').trim();
  if (mime.startsWith('image/')) return 'Image';
  if (mime.startsWith('video/')) return 'Video';
  if (mime.startsWith('audio/')) return 'Audio';
  const extension = getFileExtension(file?.name || '');
  return extension || 'File';
}

function getImageFilesFromClipboard(data: DataTransfer | null) {
  if (!data?.items?.length) return [];
  const pastedImages: File[] = [];
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
    const blob = item.getAsFile();
    if (!blob) continue;
    if (blob.name && blob.name.trim()) {
      pastedImages.push(blob);
      continue;
    }
    const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1] || 'png';
    pastedImages.push(
      new File([blob], `pasted-image-${Date.now()}${pastedImages.length ? `-${pastedImages.length}` : ''}.${ext}`, {
        type: blob.type,
      }),
    );
  }
  return pastedImages;
}

export function ChatComposer({
  conversationKey,
  onSendText,
  onSendFile,
  notifyTyping,
  disabled,
  replyToMessage,
  onCancelReply,
  resolveUserName,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
}: {
  conversationKey: string;
  onSendText: (content: string, replyToMessageId?: string | null) => Promise<void>;
  onSendFile: (file: File, content?: string, replyToMessageId?: string | null) => Promise<void>;
  notifyTyping: () => void;
  disabled: boolean;
  replyToMessage: ChatMessage | null;
  onCancelReply: () => void;
  resolveUserName: (userId: string) => string;
  editingMessage?: ChatMessage | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (message: ChatMessage, content: string) => Promise<void>;
}) {
  const MAX_TEXTAREA_HEIGHT = 200;
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewKind, setFilePreviewKind] = useState<'image' | 'video' | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const baseTextareaHeightRef = useRef(0);

  const resizeComposerTextarea = (target: HTMLTextAreaElement) => {
    if (!baseTextareaHeightRef.current) {
      baseTextareaHeightRef.current = target.offsetHeight;
    }
    target.style.height = 'auto';
    const nextHeight = Math.min(
      Math.max(target.scrollHeight, baseTextareaHeightRef.current),
      MAX_TEXTAREA_HEIGHT,
    );
    target.style.height = `${nextHeight}px`;
    target.style.overflowY = target.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
  };

  useEffect(() => {
    if (!editingMessage) return;
    setContent(editingMessage.content || '');
    setFiles([]);
    setFilePreviewUrl(null);
    setFilePreviewKind(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [editingMessage]);

  useEffect(() => {
    if (!textareaRef.current) return;
    resizeComposerTextarea(textareaRef.current);
  }, [content]);

  useEffect(() => {
    const previewFile = files.find((file) => isImageFile(file) || isVideoFile(file)) || null;
    if (!previewFile) {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
      setFilePreviewKind(null);
      return;
    }
    const url = URL.createObjectURL(previewFile);
    setFilePreviewUrl(url);
    setFilePreviewKind(isVideoFile(previewFile) ? 'video' : 'image');
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const canSend = useMemo(() => {
    return (content.trim().length > 0 || files.length > 0) && !disabled && !sending;
  }, [content, files, disabled, sending]);
  const trimmedEditingContent = content.trim();
  const originalEditingContent = String(editingMessage?.content || '').trim();
  const canSaveEdit = !!editingMessage && trimmedEditingContent.length > 0 && trimmedEditingContent !== originalEditingContent && !disabled && !sending;
  const canSubmitComposer = editingMessage ? canSaveEdit : canSend;
  const showClearButton = content.length > 0;

  const handleClearContent = () => {
    setContent('');
    setSendError(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled || sending || editingMessage) return;
    const pastedImages = getImageFilesFromClipboard(e.clipboardData);
    if (pastedImages.length === 0) return;
    e.preventDefault();
    setFiles((prev) => [...prev, ...pastedImages]);
    notifyTyping();
  };

  const handleSend = async () => {
    if (!canSubmitComposer) return;
    try {
      setSending(true);
      setSendError(null);
      const trimmed = content.trim();
      if (editingMessage && onSaveEdit) {
        await onSaveEdit(editingMessage, trimmed);
        setContent('');
        onCancelEdit?.();
        return;
      }
      const replyToMessageId = replyToMessage?.id || null;
      if (files.length > 0) {
        setUploadingFile(true);
        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          await onSendFile(file, i === 0 ? trimmed || undefined : undefined, replyToMessageId);
        }
      } else {
        await onSendText(trimmed, replyToMessageId);
      }
      setContent('');
      setFiles([]);
      setFilePreviewUrl(null);
      setFilePreviewKind(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onCancelReply();
    } catch (e: any) {
      setSendError(e?.message || 'Failed to send');
    } finally {
      setSending(false);
      setUploadingFile(false);
    }
  };

  return (
    <div className="communication-composer border-t border-slate-200 bg-white/95 p-4 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
      {files.length > 0 ? (
        <div className="mb-3 space-y-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7e5fb] bg-[#eef4ff]">
                  {isImageFile(file) ? <ImageIcon size={18} className="text-slate-700" /> : <FileUp size={18} className="text-slate-700" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{file.name}</div>
                  <div className="text-xs text-slate-500">{`${getFileLabel(file)} | ${formatFileSize(file.size)}`}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFiles((prev) => prev.filter((_, i) => i !== index));
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                aria-label={`Remove ${file.name}`}
                title="Remove file"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {filePreviewUrl ? (
        <div className="relative mb-3 inline-block">
          {filePreviewKind === 'video' ? (
            <video
              src={filePreviewUrl}
              controls
              preload="metadata"
              className="max-h-56 w-auto rounded-2xl border border-slate-200 bg-white shadow-sm"
            />
          ) : (
            <img src={filePreviewUrl} alt="Attachment preview" className="max-h-56 w-auto rounded-2xl border border-slate-200 bg-white shadow-sm" />
          )}
          {sending ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/20">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/95 shadow">
                <Loader2 size={18} className="animate-spin text-slate-700" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {sendError ? (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {sendError}
        </div>
      ) : null}
      {uploadingFile ? (
        <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Uploading file...
        </div>
      ) : null}

      <div className="flex items-end gap-3">
        <div className="relative flex-1">
          {editingMessage ? (
            <div className="mb-2 rounded-2xl border border-blue-100 bg-[#eef4ff] px-3 py-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-slate-700">
                    Editing message
                  </div>
                  <div className="mt-0.5 max-h-12 overflow-hidden whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
                    {editingMessage.attachment?.fileName || editingMessage.content || 'Message'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="self-end rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-white/70 sm:self-start"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          {editingMessage?.attachment ? (
            <div className="mb-2 inline-flex max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              {editingMessage.attachment.mimeType?.startsWith('image/') ? (
                <ImageIcon size={16} />
              ) : (
                <FileUp size={16} />
              )}
              <span className="truncate">{editingMessage.attachment.fileName || 'Attachment'}</span>
            </div>
          ) : null}
          {replyToMessage ? (
            <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-700">
                    Replying to {resolveUserName(replyToMessage.senderId)}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-600">
                    {replyToMessage.deleted
                      ? 'Message deleted'
                      : replyToMessage.type === 'text'
                        ? replyToMessage.content || 'Text message'
                        : replyToMessage.attachment?.fileName || 'Attachment'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCancelReply}
                  className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                notifyTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              onPaste={handlePaste}
              disabled={disabled || sending}
              rows={2}
              placeholder="Write a message..."
              className={`w-full resize-none rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${
                editingMessage ? 'pr-12' : 'pr-24'
              }`}
            />
            {showClearButton ? (
              <div className="group absolute right-3 top-3">
                <button
                  type="button"
                  onClick={handleClearContent}
                  disabled={disabled || sending}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Clear message"
                >
                  <X size={14} />
                </button>
                <div className="pointer-events-none absolute right-0 top-[-2.4rem] rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                  Clear message
                </div>
              </div>
            ) : null}
            {!editingMessage ? (
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <label
                  className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border ${
                    disabled || sending || editingMessage ? 'border-slate-200 bg-slate-50 opacity-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                  title="Attach image, video, audio, or file"
                >
                  <Paperclip size={16} className="text-slate-700" />
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    disabled={disabled || sending || !!editingMessage}
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf,.html,.htm,.css,.js,.json,.xml,.zip,.rar,.7z,.svg,.odt,.odp,.ods"
                    onChange={(e) => {
                      const selected = Array.from(e.target.files || []);
                      setFiles((prev) => [...prev, ...selected]);
                      notifyTyping();
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!canSubmitComposer}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                    canSubmitComposer ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-300'
                  }`}
                  aria-label="Send message"
                  title="Send (Enter)"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            ) : null}
          </div>
          {editingMessage ? (
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={sending}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!canSubmitComposer}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  canSubmitComposer
                    ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                    : 'border-slate-200 bg-white text-slate-300'
                }`}
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Save changes
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
