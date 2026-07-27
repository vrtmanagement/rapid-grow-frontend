import DriveDialog from './DriveDialog';
import DriveDestinationPicker from './DriveDestinationPicker';
import type { DriveFile, DriveFolder } from '../types';

export function DriveRenameFileDialog({
  renameFileName,
  setRenameFileName,
  submitting,
  onClose,
  onSubmit,
}: {
  renameFileName: string;
  setRenameFileName: (value: string) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <DriveDialog
      title="Rename File"
      description="Update the file name shown across the company drive."
      onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="rounded-2xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Rename File'}
          </button>
        </div>
      )}
    >
      <input
        value={renameFileName}
        onChange={(event) => setRenameFileName(event.target.value)}
        placeholder="File name"
        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
      />
    </DriveDialog>
  );
}

export function DriveMoveFileDialog({
  moveFileTarget,
  moveFileDestination,
  setMoveFileDestination,
  fileOptionsForMove,
  submitting,
  onClose,
  onSubmit,
}: {
  moveFileTarget: DriveFile;
  moveFileDestination: string;
  setMoveFileDestination: (value: string) => void;
  fileOptionsForMove: DriveFolder[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <DriveDialog
      title="Move File"
      description="Choose a destination folder for this file."
      onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {submitting ? 'Moving...' : 'Move File'}
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Selected file</div>
          <div className="mt-2 break-all text-sm font-semibold text-slate-900">
            {moveFileTarget.fileName}
          </div>
        </div>
        <DriveDestinationPicker
          value={moveFileDestination}
          onChange={setMoveFileDestination}
          options={fileOptionsForMove}
          rootLabel="Shared Drive (root)"
        />
      </div>
    </DriveDialog>
  );
}
