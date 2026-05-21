import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileUp, Image as ImageIcon, Loader2, Paperclip, Send, X } from 'lucide-react';
import { ChatMessage } from '../types';

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
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editingMessage) return;
    setContent(editingMessage.content || '');
    setFiles([]);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [editingMessage]);

  useEffect(() => {
    const imageFile = files.find((f) => f.type.startsWith("image/")) || null;
    if (!imageFile) {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const canSend = useMemo(() => {
    return (content.trim().length > 0 || files.length > 0) && !disabled && !sending;
  }, [content, files, disabled, sending]);

  const handleSend = async () => {
    if (!canSend) return;
    try {
      setSending(true);
      setSendError(null);
      const trimmed = content.trim();
      if (editingMessage && onSaveEdit) {
        await onSaveEdit(editingMessage, trimmed);
        setContent("");
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
      setContent("");
      setFiles([]);
      setFilePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[#eef4ff] border border-[#d7e5fb] flex items-center justify-center">
                  {file.type.startsWith("image/") ? <ImageIcon size={18} className="text-slate-700" /> : <FileUp size={18} className="text-slate-700" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{file.name}</div>
                  <div className="text-xs text-slate-500">{file.type || 'file'} • {(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFiles((prev) => prev.filter((_, i) => i !== index));
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
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
        <div className="mb-3 relative inline-block">
          <img src={filePreviewUrl} alt="Attachment preview" className="max-h-56 w-auto rounded-2xl border border-slate-200 bg-white shadow-sm" />
          {sending ? (
            <div className="absolute inset-0 rounded-xl bg-black/20 flex items-center justify-center">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 border border-slate-200 shadow">
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
        <div className="flex-1 relative">
          {editingMessage ? (
            <div className="mb-2 rounded-2xl border border-blue-100 bg-[#eef4ff] px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-700">
                    Editing message
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-600">
                    {editingMessage.attachment?.fileName || editingMessage.content || 'Message'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-white/70"
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
          <textarea
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
            disabled={disabled || sending}
            rows={2}
            placeholder="Write a message..."
            className="w-full resize-none rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3 pr-24 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-[14px] leading-relaxed"
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            <label className={`cursor-pointer inline-flex items-center justify-center w-9 h-9 rounded-xl border ${
            disabled || sending || editingMessage ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`} title="Attach image or file">
              <Paperclip size={16} className="text-slate-700" />
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                disabled={disabled || sending || !!editingMessage}
                multiple
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
            disabled={!canSend}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
              canSend ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-300'
            }`}
            aria-label="Send message"
            title="Send (Enter)"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
