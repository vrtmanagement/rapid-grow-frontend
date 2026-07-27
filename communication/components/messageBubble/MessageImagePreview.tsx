import React from 'react';
import { X } from 'lucide-react';

export function MessageImagePreview({
  attachmentName,
  directFileUrl,
  onClose,
}: {
  attachmentName: string;
  directFileUrl: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/97 p-4 backdrop-blur-2xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${attachmentName}`}
    >
      <div
        className="relative w-full max-w-6xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white transition hover:bg-black/65"
          aria-label="Close image preview"
        >
          <X size={18} />
        </button>
        <img
          src={directFileUrl}
          alt={attachmentName}
          className="mx-auto block max-h-[90vh] max-w-full object-contain"
        />
      </div>
    </div>
  );
}
