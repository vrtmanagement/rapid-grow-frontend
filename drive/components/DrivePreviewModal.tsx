import React from 'react';
import { Download } from 'lucide-react';
import DriveDialog from './DriveDialog';
import type { DriveFile } from '../types';

type DrivePreviewModalProps = {
  file: DriveFile;
  onClose: () => void;
  onDownload: (file: DriveFile) => void;
};

export default function DrivePreviewModal({
  file,
  onClose,
  onDownload,
}: DrivePreviewModalProps) {
  const isImage = file.mimeType.startsWith('image/');
  const isVideo = file.mimeType.startsWith('video/');
  const isAudio = file.mimeType.startsWith('audio/');
  const isPdf = file.mimeType === 'application/pdf' || /\.pdf$/i.test(file.fileName);

  return (
    <DriveDialog
      title={file.fileName}
      description={file.folderBreadcrumb.length ? file.folderBreadcrumb.map((item) => item.name).join(' / ') : 'Root'}
      onClose={onClose}
      footer={(
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onDownload(file)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-red to-red-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Download size={16} />
            Download
          </button>
        </div>
      )}
    >
      <div className="min-h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {isImage ? (
          <img src={file.secureUrl} alt={file.fileName} className="h-full max-h-[70vh] w-full object-contain" />
        ) : null}
        {isVideo ? (
          <video src={file.secureUrl} controls className="h-full max-h-[70vh] w-full bg-black object-contain" />
        ) : null}
        {isAudio ? (
          <div className="flex h-[420px] items-center justify-center">
            <audio src={file.secureUrl} controls className="w-full max-w-lg" />
          </div>
        ) : null}
        {isPdf ? (
          <iframe title={file.fileName} src={file.secureUrl} className="h-[70vh] w-full bg-white" />
        ) : null}
        {!isImage && !isVideo && !isAudio && !isPdf ? (
          <div className="flex h-[420px] items-center justify-center px-8 text-center text-slate-500">
            Preview is available for images, PDFs, and media files only.
          </div>
        ) : null}
      </div>
    </DriveDialog>
  );
}
