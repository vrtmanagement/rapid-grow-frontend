import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, FileUp, Image as ImageIcon, ListChecks, Loader2, Plus, Send, X } from 'lucide-react';
import { ChatMessage } from '../types';
import { CreatePollModal } from './CreatePollModal';
import { usePollStore } from '../stores/usePollStore';

const MAX_MESSAGE_WORDS = 800;

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

function truncateFileName(fileName: string, maxLength = 25) {
  const name = String(fileName || '').trim();
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength)}...`;
}

function AttachmentPreviewThumb({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImageFile(file) && !isVideoFile(file)) return undefined;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (isImageFile(file) && previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={file.name}
        className="h-full w-full object-cover"
      />
    );
  }

  if (isVideoFile(file) && previewUrl) {
    return (
      <video
        src={previewUrl}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#eef4ff] text-slate-600">
      {isImageFile(file) ? <ImageIcon size={16} /> : <FileUp size={16} />}
    </div>
  );
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

function canAcceptComposerFiles(disabled: boolean, sending: boolean, editingMessage?: ChatMessage | null) {
  return !disabled && !sending && !editingMessage;
}

function countWords(value: string) {
  const matches = String(value || '').trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

function hasVisibleText(value: string) {
  return /\S/.test(String(value || ''));
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
  incomingFiles,
  onIncomingFilesConsumed,
  onCreatePoll,
}: {
  conversationKey: string;
  onSendText: (content: string, replyToMessageId?: string | null) => Promise<void>;
  onSendFile: (
    file: File,
    content?: string,
    replyToMessageId?: string | null,
    bundleId?: string | null,
  ) => Promise<void>;
  onCreatePoll: (payload: {
    question: string;
    options: string[];
    allowsMultipleAnswers: boolean;
    anonymous: boolean;
    expiresAt?: string | null;
  }) => Promise<void>;
  notifyTyping: () => void;
  disabled: boolean;
  replyToMessage: ChatMessage | null;
  onCancelReply: () => void;
  resolveUserName: (userId: string) => string;
  editingMessage?: ChatMessage | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (message: ChatMessage, content: string) => Promise<void>;
  incomingFiles?: File[];
  onIncomingFilesConsumed?: () => void;
}) {
  const MAX_TEXTAREA_HEIGHT = 200;
  const MIN_TEXTAREA_HEIGHT = 40;
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewKind, setFilePreviewKind] = useState<'image' | 'video' | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const { createPollOpen, setCreatePollOpen } = usePollStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const baseTextareaHeightRef = useRef(0);
  const attachmentMenuRef = useRef<HTMLDivElement | null>(null);

  const resizeComposerTextarea = (target: HTMLTextAreaElement) => {
    baseTextareaHeightRef.current = MIN_TEXTAREA_HEIGHT;
    target.style.height = '0px';
    const nextHeight = Math.min(
      Math.max(target.scrollHeight, MIN_TEXTAREA_HEIGHT),
      MAX_TEXTAREA_HEIGHT,
    );
    target.style.height = `${nextHeight}px`;
    target.style.overflowY = nextHeight >= MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
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
    if (!attachmentMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!attachmentMenuRef.current?.contains(event.target as Node)) {
        setAttachmentMenuOpen(false);
      }
    };
    // Defer so the opening click on "+" doesn't immediately close the menu.
    const timer = window.setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [attachmentMenuOpen]);

  const addComposerFiles = (nextFiles: File[]) => {
    if (!nextFiles.length) return;
    if (!canAcceptComposerFiles(disabled, sending, editingMessage)) return;
    setFiles((prev) => [...prev, ...nextFiles]);
    notifyTyping();
  };

  useEffect(() => {
    if (!incomingFiles?.length) return;
    addComposerFiles(incomingFiles);
    onIncomingFilesConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingFiles]);

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

  const contentWordCount = useMemo(() => countWords(content), [content]);
  const contentExceedsWordLimit = contentWordCount > MAX_MESSAGE_WORDS;
  const wordLimitMessage = contentExceedsWordLimit ? `Message cannot exceed ${MAX_MESSAGE_WORDS} words.` : null;
  const canSend = useMemo(() => {
    return (hasVisibleText(content) || files.length > 0) && !contentExceedsWordLimit && !disabled && !sending;
  }, [content, files, contentExceedsWordLimit, disabled, sending]);
  const originalEditingContent = String(editingMessage?.content || '');
  const canSaveEdit =
    !!editingMessage &&
    hasVisibleText(content) &&
    content !== originalEditingContent &&
    !contentExceedsWordLimit &&
    !disabled &&
    !sending;
  const canSubmitComposer = editingMessage ? canSaveEdit : canSend;
  const showClearButton = content.length > 0;

  const handleClearContent = () => {
    setContent('');
    setSendError(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const triggerFileInput = (input: HTMLInputElement | null) => {
    if (!input || input.disabled) return;
    // Reset so picking the same file again still fires onChange.
    input.value = '';
    input.click();
  };

  const openFilePicker = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    // Keep the user-gesture stack intact: open picker first, then close menu.
    triggerFileInput(fileInputRef.current);
    setAttachmentMenuOpen(false);
  };

  const openImagePicker = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    triggerFileInput(imageFileInputRef.current);
    setAttachmentMenuOpen(false);
  };

  const openPollModal = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setAttachmentMenuOpen(false);
    setCreatePollOpen(true);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!canAcceptComposerFiles(disabled, sending, editingMessage)) return;
    const pastedImages = getImageFilesFromClipboard(e.clipboardData);
    if (pastedImages.length === 0) return;
    e.preventDefault();
    addComposerFiles(pastedImages);
  };

  const resetComposerDraft = () => {
    setContent('');
    setFiles([]);
    setFilePreviewUrl(null);
    setFilePreviewKind(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageFileInputRef.current) imageFileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!canSubmitComposer) return;
    if (contentExceedsWordLimit) {
      setSendError(`Message cannot exceed ${MAX_MESSAGE_WORDS} words.`);
      return;
    }

    const rawContent = content;
    const contentToSend = hasVisibleText(rawContent) ? rawContent : '';
    const filesToSend = [...files];
    const replyToMessageId = replyToMessage?.id || null;

    try {
      setSending(true);
      setSendError(null);

      if (editingMessage && onSaveEdit) {
        await onSaveEdit(editingMessage, contentToSend);
        setContent('');
        onCancelEdit?.();
        return;
      }

      // Clear the input immediately so the message "moves" into chat while it loads.
      resetComposerDraft();
      onCancelReply();

      if (filesToSend.length > 0) {
        const bundleId =
          filesToSend.length > 1
            ? typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? `bundle_${(crypto as Crypto).randomUUID()}`
              : `bundle_${Date.now()}_${Math.random().toString(16).slice(2)}`
            : null;
        for (let i = 0; i < filesToSend.length; i += 1) {
          const file = filesToSend[i];
          // Caption rides with the last attachment so it sits under the media group in chat.
          const caption =
            i === filesToSend.length - 1 && contentToSend ? contentToSend : undefined;
          await onSendFile(file, caption, replyToMessageId, bundleId);
        }
      } else {
        await onSendText(contentToSend, replyToMessageId);
      }
    } catch (e: any) {
      // Restore draft if send failed so the user can retry.
      setContent(rawContent);
      setFiles(filesToSend);
      setSendError(e?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="communication-composer shrink-0 border-t border-slate-200 bg-[#f7f8fb] px-4 py-3.5">
      {files.length > 0 ? (
        <div className="mb-3 max-h-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Attachments · {files.length}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {files.map((file, index) => {
              const showMediaPreview = isImageFile(file) || isVideoFile(file);
              return (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="relative rounded-xl border border-slate-200 bg-slate-50/80 p-2"
                >
                  {showMediaPreview ? (
                    <div className="mb-1.5 h-16 w-full overflow-hidden rounded-lg border border-slate-100 bg-white">
                      <AttachmentPreviewThumb file={file} />
                    </div>
                  ) : (
                    <div className="mb-1.5 flex h-16 w-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                      <FileUp size={16} className="text-slate-600" />
                    </div>
                  )}
                  <div
                    className="truncate text-[10px] font-medium leading-4 text-slate-900"
                    title={file.name}
                  >
                    {truncateFileName(file.name)}
                  </div>
                  <div className="mt-0.5 truncate text-[9px] leading-3 text-slate-500">
                    {`${getFileLabel(file)} | ${formatFileSize(file.size)}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFiles((prev) => prev.filter((_, i) => i !== index));
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      if (imageFileInputRef.current) imageFileInputRef.current.value = '';
                    }}
                    className="absolute right-1 top-1 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                    aria-label={`Remove ${file.name}`}
                    title="Remove file"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {sendError ? (
        <div className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {sendError}
        </div>
      ) : null}

      <div className="relative flex-1">
        {editingMessage ? (
          <div className="mb-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-slate-700">Editing message</div>
                <div className="mt-0.5 max-h-12 overflow-hidden whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
                  {editingMessage.attachment?.fileName || editingMessage.content || 'Message'}
                </div>
              </div>
              <button
                type="button"
                onClick={onCancelEdit}
                className="self-end rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 sm:self-start"
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
          <div className="mb-2 rounded-2xl border border-brand-red/20 bg-white px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 border-l-2 border-brand-red pl-2.5">
                <div className="text-[11px] font-semibold text-brand-red">
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

        <div
          className={`flex items-center gap-2 rounded-2xl border bg-white px-2 py-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition-[border-color,box-shadow] ${
            contentExceedsWordLimit
              ? 'border-red-300 ring-2 ring-red-100'
              : 'border-slate-200 focus-within:border-brand-red/40 focus-within:ring-2 focus-within:ring-brand-red/10'
          }`}
        >
          {!editingMessage ? (
            <div ref={attachmentMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setAttachmentMenuOpen((current) => !current);
                }}
                disabled={disabled || sending}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                  disabled || sending
                    ? 'cursor-not-allowed border-slate-100 text-slate-300'
                    : attachmentMenuOpen
                      ? 'border-brand-red bg-brand-red text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                }`}
                aria-label="Open attachment menu"
                aria-expanded={attachmentMenuOpen}
                title="Attach"
              >
                <Plus size={18} strokeWidth={2.4} />
              </button>

              {attachmentMenuOpen ? (
                <div
                  role="menu"
                  className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openFilePicker}
                    className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <FileText size={16} />
                    </span>
                    Attach file
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openImagePicker}
                    className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                      <ImageIcon size={16} />
                    </span>
                    Photos & images
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openPollModal}
                    className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <ListChecks size={16} />
                    </span>
                    Poll
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="relative flex min-h-10 min-w-0 flex-1 items-center">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                if (sendError) {
                  setSendError(null);
                }
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
              rows={1}
              placeholder="Type a message…"
              className={`box-border w-full min-h-10 resize-none bg-transparent py-2 text-[14.5px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 ${
                showClearButton ? 'pr-10' : 'pr-1'
              }`}
              aria-invalid={contentExceedsWordLimit}
            />
            {showClearButton ? (
              <div className="group absolute right-0.5 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={handleClearContent}
                  disabled={disabled || sending}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Clear message"
                  title="Clear"
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
                <div className="pointer-events-none absolute right-0 top-[-2.15rem] rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                  Clear
                </div>
              </div>
            ) : null}
          </div>

          {!editingMessage ? (
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSubmitComposer}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                canSubmitComposer
                  ? 'bg-brand-red text-white shadow-[0_8px_18px_rgba(230,28,33,0.28)] hover:bg-[#c9161b]'
                  : 'cursor-not-allowed bg-slate-100 text-slate-300'
              }`}
              aria-label="Send message"
              title="Send (Enter)"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="translate-x-[1px]" />}
            </button>
          ) : null}
        </div>

        {contentExceedsWordLimit ? (
          <div className="mt-2 flex items-center justify-between gap-3 px-1">
            <div className="text-xs text-red-600">{wordLimitMessage}</div>
            <div className="text-xs font-medium text-red-600">
              {contentWordCount}/{MAX_MESSAGE_WORDS} words
            </div>
          </div>
        ) : null}
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
                  ? 'border-brand-red bg-brand-red text-white hover:bg-[#c9161b]'
                  : 'border-slate-200 bg-white text-slate-300'
              }`}
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Save changes
            </button>
          </div>
        ) : null}
      </div>

      <CreatePollModal
        open={createPollOpen}
        onClose={() => setCreatePollOpen(false)}
        onSubmit={async (payload) => {
          await onCreatePoll(payload);
        }}
      />

      <input
        id="chat-composer-file-input"
        type="file"
        ref={fileInputRef}
        className="hidden"
        disabled={disabled || sending || !!editingMessage}
        multiple
        accept="video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf,.html,.htm,.css,.js,.json,.xml,.zip,.rar,.7z,.svg,.odt,.odp,.ods"
        onChange={(e) => {
          addComposerFiles(Array.from(e.target.files || []));
          e.target.value = '';
        }}
      />
      <input
        id="chat-composer-image-input"
        type="file"
        ref={imageFileInputRef}
        className="hidden"
        disabled={disabled || sending || !!editingMessage}
        multiple
        accept="image/*"
        onChange={(e) => {
          addComposerFiles(Array.from(e.target.files || []));
          e.target.value = '';
        }}
      />
    </div>
  );
}
