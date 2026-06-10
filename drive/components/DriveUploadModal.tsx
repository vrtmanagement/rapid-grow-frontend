import React, { useEffect, useRef, useState } from 'react';
import { FilePlus2, RotateCcw, UploadCloud, X } from 'lucide-react';
import { FileDropZone } from '../../components/ui/FileDropZone';
import { createDriveUploadRequest } from '../services/driveApi';
import type { DriveFile, DriveFolderStorageMode, DriveUploadItem } from '../types';

type DriveUploadModalProps = {
  folderId: string | null;
  folderName: string;
  storageMode?: DriveFolderStorageMode;
  initialFiles?: File[];
  onClose: () => void;
  onUploaded: (file: DriveFile) => void;
  onNotice: (message: string, type: 'success' | 'error') => void;
};

const MAX_CONCURRENT_UPLOADS = 3;

function createUploadQueueItems(files: File[]): DriveUploadItem[] {
  return files.map((file) => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    progress: 0,
    status: 'queued',
  }));
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function isImageFile(file: File) {
  return file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
}

export default function DriveUploadModal({
  folderId,
  folderName,
  storageMode = 'general',
  initialFiles = [],
  onClose,
  onUploaded,
  onNotice,
}: DriveUploadModalProps) {
  const [queue, setQueue] = useState<DriveUploadItem[]>(() => createUploadQueueItems(initialFiles));
  const controllersRef = useRef(new Map<string, { cancel: () => void }>());
  const autoCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (storageMode === 'images') {
      const acceptedFiles = initialFiles.filter(isImageFile);
      if (acceptedFiles.length !== initialFiles.length) {
        onNotice('Only image files can be uploaded into this folder.', 'error');
      }
      setQueue(createUploadQueueItems(acceptedFiles));
      return;
    }
    setQueue(createUploadQueueItems(initialFiles));
  }, [initialFiles, onNotice, storageMode]);

  useEffect(() => {
    const activeUploads = queue.filter((item) => item.status === 'uploading').length;
    if (activeUploads >= MAX_CONCURRENT_UPLOADS) return;

    queue
      .filter((item) => item.status === 'queued')
      .slice(0, MAX_CONCURRENT_UPLOADS - activeUploads)
      .forEach((item) => {
        setQueue((prev) =>
          prev.map((entry) =>
            entry.id === item.id ? { ...entry, status: 'uploading', progress: Math.max(entry.progress, 2) } : entry,
          ),
        );

        const request = createDriveUploadRequest({
          file: item.file,
          folderId,
          onProgress: (progress) => {
            setQueue((prev) =>
              prev.map((entry) => (entry.id === item.id ? { ...entry, progress } : entry)),
            );
          },
        });

        controllersRef.current.set(item.id, request);
        request.promise
          .then((uploadedFile) => {
            if (!uploadedFile) {
              throw new Error('Upload succeeded but no file details were returned');
            }
            let shouldAutoClose = false;
            setQueue((prev) =>
              {
                const nextQueue = prev.map((entry) =>
                  entry.id === item.id
                    ? { ...entry, status: 'success', progress: 100, uploadedFile }
                    : entry,
                );
                shouldAutoClose =
                  nextQueue.length > 0 && nextQueue.every((entry) => entry.status === 'success');
                return nextQueue;
              },
            );
            onUploaded(uploadedFile);
            onNotice(`${uploadedFile.fileName} uploaded successfully.`, 'success');
            if (shouldAutoClose) {
              if (autoCloseTimerRef.current) {
                window.clearTimeout(autoCloseTimerRef.current);
              }
              autoCloseTimerRef.current = window.setTimeout(() => {
                autoCloseTimerRef.current = null;
                onClose();
              }, 250);
            }
          })
          .catch((error) => {
            const message = error instanceof Error ? error.message : 'Upload failed';
            setQueue((prev) =>
              prev.map((entry) =>
                entry.id === item.id ? { ...entry, status: 'error', error: message } : entry,
              ),
            );
            if (message !== 'Upload cancelled') {
              onNotice(message, 'error');
            }
          })
          .finally(() => {
            controllersRef.current.delete(item.id);
          });
      });
  }, [folderId, onNotice, onUploaded, queue]);

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
      }
      controllersRef.current.forEach((controller) => controller.cancel());
      controllersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!queue.length) {
      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      return;
    }

    const hasPendingUploads = queue.some((item) => item.status === 'queued' || item.status === 'uploading');
    const allUploadedSuccessfully = queue.every((item) => item.status === 'success');

    if (!hasPendingUploads && allUploadedSuccessfully) {
      if (!autoCloseTimerRef.current) {
        autoCloseTimerRef.current = window.setTimeout(() => {
          autoCloseTimerRef.current = null;
          onClose();
        }, 700);
      }
      return;
    }

    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, [onClose, queue]);

  function appendFiles(files: File[]) {
    if (!files.length) return;
    const acceptedFiles =
      storageMode === 'images' ? files.filter(isImageFile) : files;
    if (!acceptedFiles.length) {
      if (storageMode === 'images') {
        onNotice('Only image files can be uploaded into this folder.', 'error');
      }
      return;
    }
    if (acceptedFiles.length !== files.length && storageMode === 'images') {
      onNotice('Only image files can be uploaded into this folder.', 'error');
    }
    setQueue((prev) => [...prev, ...createUploadQueueItems(acceptedFiles)]);
  }

  function retryUpload(uploadId: string) {
    setQueue((prev) =>
      prev.map((entry) =>
        entry.id === uploadId
          ? { ...entry, status: 'queued', progress: 0, error: undefined, uploadedFile: undefined }
          : entry,
      ),
    );
  }

  function cancelUpload(uploadId: string) {
    const controller = controllersRef.current.get(uploadId);
    if (controller) {
      controller.cancel();
      controllersRef.current.delete(uploadId);
    }
    setQueue((prev) =>
      prev.map((entry) =>
        entry.id === uploadId ? { ...entry, status: 'cancelled', error: 'Upload cancelled' } : entry,
      ),
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/35 backdrop-blur-[2px]">
      <div className="flex h-full justify-end">
        <div className="flex h-full w-full max-w-[34rem] flex-col border-l border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,245,245,0.98))] px-6 py-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">RapidGrow Drive</p>
              <h3 className="mt-2 text-3xl font-semibold text-slate-900">Upload Files</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Files added here appear in {folderName} and sync with everyone instantly.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-red-200 hover:text-brand-red"
              aria-label="Close upload drawer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            <FileDropZone
              className="rounded-[1.1rem] border-2 border-dashed border-red-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,245,245,0.72))] p-6"
              overlayTitle="Drop files to upload"
              overlayHint={
                storageMode === 'images'
                  ? 'Only image uploads are allowed in this folder'
                  : 'Images, documents, videos, and archives supported'
              }
              onFiles={appendFiles}
            >
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-red text-white">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900">Drop files into this panel</div>
                  <div className="mt-1 text-sm text-slate-500">Or add more from your device</div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-red transition hover:border-red-300 hover:bg-red-50">
                  <FilePlus2 size={16} />
                  Choose files
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept={
                      storageMode === 'images'
                        ? 'image/*,.svg,.webp'
                        : 'image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,.rar,.mp4,.mp3,.svg,.webp'
                    }
                    onChange={(event) => appendFiles(Array.from(event.target.files || []))}
                  />
                </label>
              </div>
            </FileDropZone>

            <div className="space-y-3">
              {queue.length ? (
                queue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{item.file.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{formatFileSize(item.file.size)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.status === 'error' || item.status === 'cancelled' ? (
                          <button
                            type="button"
                            onClick={() => retryUpload(item.id)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-brand-red"
                            aria-label={`Retry ${item.file.name}`}
                            title={`Retry ${item.file.name}`}
                          >
                            <RotateCcw size={15} />
                          </button>
                        ) : null}
                        {item.status === 'queued' || item.status === 'uploading' ? (
                          <button
                            type="button"
                            onClick={() => cancelUpload(item.id)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Cancel ${item.file.name}`}
                            title={`Cancel ${item.file.name}`}
                          >
                            <X size={15} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.status === 'error' || item.status === 'cancelled'
                            ? 'bg-rose-500'
                            : item.status === 'success'
                            ? 'bg-brand-red'
                            : 'bg-[linear-gradient(90deg,#e83535,#cf171c)]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs font-medium text-slate-500">
                      {item.status === 'queued' ? 'Waiting to upload' : null}
                      {item.status === 'uploading' ? `Uploading... ${item.progress}%` : null}
                      {item.status === 'success' ? 'Uploaded successfully' : null}
                      {item.status === 'error' ? item.error || 'Upload failed' : null}
                      {item.status === 'cancelled' ? 'Upload cancelled' : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Add files to start uploading into {folderName}.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
            <div className="text-sm text-slate-500">
              {queue.filter((item) => item.status === 'success').length} of {queue.length} uploaded
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:text-brand-red"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
