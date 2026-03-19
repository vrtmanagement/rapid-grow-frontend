import React, { useEffect, useMemo, useState } from 'react';
import { FileUp, Image as ImageIcon, Loader2, Paperclip, Send } from 'lucide-react';

export function ChatComposer({
  conversationKey,
  onSendText,
  onSendFile,
  notifyTyping,
  disabled,
}: {
  conversationKey: string;
  onSendText: (content: string) => Promise<void>;
  onSendFile: (file: File, content?: string) => Promise<void>;
  notifyTyping: () => void;
  disabled: boolean;
}) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
      return;
    }
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const canSend = useMemo(() => {
    return (content.trim().length > 0 || !!file) && !disabled && !sending;
  }, [content, file, disabled, sending]);

  const handleSend = async () => {
    if (!canSend) return;
    try {
      setSending(true);
      setSendError(null);
      const trimmed = content.trim();
      if (file) {
        setUploadingFile(true);
        await onSendFile(file, trimmed || undefined);
      } else {
        await onSendText(trimmed);
      }
      setContent("");
      setFile(null);
      setFilePreviewUrl(null);
    } catch (e: any) {
      setSendError(e?.message || 'Failed to send');
    } finally {
      setSending(false);
      setUploadingFile(false);
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      {file ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
              {file.type.startsWith("image/") ? <ImageIcon size={18} className="text-brand-red" /> : <FileUp size={18} className="text-slate-700" />}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{file.name}</div>
              <div className="text-xs text-slate-500">{file.type || 'file'} • {(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm text-slate-700"
          >
            Remove
          </button>
        </div>
      ) : null}

      {filePreviewUrl && file?.type.startsWith("image/") ? (
        <div className="mb-3 relative inline-block">
          <img src={filePreviewUrl} alt="Attachment preview" className="max-h-56 w-auto rounded-xl border border-slate-200 bg-white" />
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
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              notifyTyping();
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                void handleSend();
              }
            }}
            disabled={disabled || sending}
            rows={2}
            placeholder="Write a message..."
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-24 outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red text-[14px] leading-relaxed"
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            <label className={`cursor-pointer inline-flex items-center justify-center w-9 h-9 rounded-xl border ${
            disabled || sending ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`} title="Attach image or file">
              <Paperclip size={16} className="text-slate-700" />
              <input
                type="file"
                className="hidden"
                disabled={disabled || sending}
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                onChange={(e) => {
                  const next = e.target.files?.[0] || null;
                  setFile(next);
                  notifyTyping();
                }}
              />
            </label>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
              canSend ? 'bg-brand-red text-white border-brand-red/30 hover:opacity-95' : 'bg-white border-slate-200 text-slate-300'
            }`}
            aria-label="Send message"
            title="Send (Ctrl/Cmd + Enter)"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

