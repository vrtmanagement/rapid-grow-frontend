import React, { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { getFilesFromDataTransfer } from '../../utils/fileTransfer';

export type FileDropZoneProps = {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  overlayTitle?: string;
  overlayHint?: string;
  showOverlay?: boolean;
  as?: 'div' | 'label';
};

export function FileDropZone({
  onFiles,
  multiple = true,
  disabled = false,
  className = '',
  children,
  overlayTitle = 'Drop to attach',
  overlayHint = 'Images, documents, and other supported files',
  showOverlay = true,
  as = 'div',
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);
  const Tag = as;

  const applyFiles = (files: File[]) => {
    if (!files.length || disabled) return;
    onFiles(multiple ? files : files.slice(0, 1));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (disabled) return;
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    applyFiles(getFilesFromDataTransfer(e.dataTransfer));
  };

  return (
    <Tag
      className={`relative ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {showOverlay && isDragOver ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] border-2 border-dashed border-blue-400 bg-blue-50/90">
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <FileUp size={28} className="text-blue-600" />
            <div className="text-sm font-semibold text-blue-900">{overlayTitle}</div>
            <div className="text-xs text-blue-700">{overlayHint}</div>
          </div>
        </div>
      ) : null}
      {children}
    </Tag>
  );
}
