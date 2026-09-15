import React from 'react';
import { Loader2, WandSparkles } from 'lucide-react';
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
      className="min-w-0 rounded-lg"
      overlayTitle="Drop file for AI Assign"
      overlayHint="PDF, Word, Excel, CSV, or plain text"
      onFiles={(files) => {
        const file = files[0] || null;
        void handleAiAssignPdfUpload(file);
      }}
    >
      <div className="flex flex-col items-center gap-1">
        <label
          title={aiAssigning
            ? `Processing ${aiAssignFileName || 'file'} and creating tasks live...`
            : 'Upload a document or sheet to create and assign TaskHub items.'}
          className={`inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition focus-within:ring-2 focus-within:ring-violet-300 ${
            aiAssigning ? 'bg-slate-100 text-slate-400' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
          }`}
        >
          {aiAssigning ? <Loader2 size={16} className="animate-spin" /> : <WandSparkles size={16} />}
          {aiAssigning ? 'Assigning...' : 'AI Assign'}
          {aiAssigning && aiAssignTotalCount > 0 ? (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-inherit">
              {Math.min(aiAssignCreatedCount, aiAssignTotalCount)}/{aiAssignTotalCount}
            </span>
          ) : null}
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
            disabled={aiAssigning}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              event.target.value = '';
              void handleAiAssignPdfUpload(file);
            }}
          />
        </label>
        {hasProgress ? (
          <p role="status" className="text-center text-[11px] text-slate-500">{progressLabel}</p>
        ) : null}
      </div>
    </FileDropZone>
  );
};

export default SpacesAiAssignPanel;
