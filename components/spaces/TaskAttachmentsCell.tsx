import React from 'react';
import { ChevronDown, Download } from 'lucide-react';
import type { SpacesTask } from '../../types/spaces';
import { getTaskAttachments } from '../../views/spacesViewHelpers';

type TaskAttachmentsCellProps = {
  task: Pick<SpacesTask, 'documents' | 'documentUrl' | 'documentName' | 'documentMimeType'>;
  forceDownloadDocument: (url: string, fileName?: string) => Promise<void>;
  onError: (message: string) => void;
  dropdownId: string;
  activeDropdownId: string | null;
  onToggleDropdown: (id: string | null) => void;
};

const TaskAttachmentsCell: React.FC<TaskAttachmentsCellProps> = ({
  task,
  forceDownloadDocument,
  onError,
  dropdownId,
  activeDropdownId,
  onToggleDropdown,
}) => {
  const attachments = getTaskAttachments(task);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (activeDropdownId !== dropdownId) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onToggleDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeDropdownId, dropdownId, onToggleDropdown]);

  if (!attachments.length) {
    return <span className="text-[12px] text-slate-400">-</span>;
  }

  const handleDownload = async (url: string, name: string) => {
    try {
      await forceDownloadDocument(url, name);
    } catch (error: any) {
      onError(error?.message || 'Failed to download document');
    }
  };

  if (attachments.length === 1) {
    const [file] = attachments;
    return (
      <button
        type="button"
        onClick={() => void handleDownload(file.url, file.name)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] font-semibold text-brand-red hover:bg-red-50"
      >
        <Download size={13} />
        Download
      </button>
    );
  }

  const isOpen = activeDropdownId === dropdownId;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => onToggleDropdown(isOpen ? null : dropdownId)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
      >
        Files ({attachments.length})
        <ChevronDown size={13} className={`transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen ? (
        <div className="absolute right-0 z-[90] mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-lg">
          {attachments.map((file, index) => (
            <button
              key={`${file.url}-${index}`}
              type="button"
              onClick={() => {
                onToggleDropdown(null);
                void handleDownload(file.url, file.name);
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-[12px] text-slate-700 transition hover:bg-slate-50"
              title={file.name}
            >
              <Download size={14} className="shrink-0 text-brand-red" />
              <span className="truncate font-medium">{file.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default TaskAttachmentsCell;
