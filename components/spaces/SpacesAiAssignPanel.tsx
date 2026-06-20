import React from 'react';
import { Loader2, UploadCloud, WandSparkles } from 'lucide-react';
import { FileDropZone } from '../ui/FileDropZone';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';

type SpacesAiAssignPanelProps = Pick<
  SpacesViewController,
  'mode' | 'aiAssigning' | 'aiAssignFileName' | 'aiAssignCreatedCount' | 'aiAssignTotalCount' | 'handleAiAssignPdfUpload'
>;

const SpacesAiAssignPanel: React.FC<SpacesAiAssignPanelProps> = ({
  mode,
  aiAssigning,
  aiAssignFileName,
  aiAssignCreatedCount,
  aiAssignTotalCount,
  handleAiAssignPdfUpload,
}) => {
  if (mode !== 'manager') return null;

  const hasProgress = aiAssigning || aiAssignCreatedCount > 0 || aiAssignTotalCount > 0;
  const progressLabel =
    aiAssignTotalCount > 0
      ? `${Math.min(aiAssignCreatedCount, aiAssignTotalCount)} / ${aiAssignTotalCount} tasks created`
      : `${aiAssignCreatedCount} tasks created`;

  return (
    <FileDropZone
      multiple={false}
      disabled={aiAssigning}
      className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
      overlayTitle="Drop file for AI Assign"
      overlayHint="PDF, Word, Excel, CSV, or plain text"
      onFiles={(files) => {
        const file = files[0] || null;
        void handleAiAssignPdfUpload(file);
      }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <WandSparkles size={18} />
          </div>
          <div className="min-w-0">
            <h4 className="text-[15px] font-semibold text-slate-900">AI Assign</h4>
            <p className="mt-0.5 truncate text-[12px] text-slate-500">
              {aiAssigning
                ? `Processing ${aiAssignFileName || 'file'} and creating tasks live...`
                : 'Upload a document or sheet to create and assign TaskHub items.'}
            </p>
            {hasProgress ? (
              <p className="mt-1 text-[12px] font-medium text-slate-700">{progressLabel}</p>
            ) : null}
          </div>
        </div>
        <label
          className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
            aiAssigning ? 'bg-slate-100 text-slate-400' : 'bg-brand-red text-white hover:bg-brand-red/90'
          }`}
        >
          {aiAssigning ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          {aiAssigning ? 'Assigning...' : 'Upload File'}
          {aiAssigning && aiAssignTotalCount > 0 ? (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-inherit">
              {Math.min(aiAssignCreatedCount, aiAssignTotalCount)}/{aiAssignTotalCount}
            </span>
          ) : null}
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
            disabled={aiAssigning}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              event.target.value = '';
              void handleAiAssignPdfUpload(file);
            }}
          />
        </label>
      </div>
    </FileDropZone>
  );
};

export default SpacesAiAssignPanel;
