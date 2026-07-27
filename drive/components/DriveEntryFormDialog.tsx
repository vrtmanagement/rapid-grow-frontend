import DriveDialog from './DriveDialog';
import type { DriveEntry, DriveEntryType } from '../types';

export default function DriveEntryFormDialog({
  editingEntry,
  activeEntryType,
  currentFolderLabel,
  entryTitle,
  setEntryTitle,
  entryLinkUrl,
  setEntryLinkUrl,
  entryDescription,
  setEntryDescription,
  entryContentText,
  setEntryContentText,
  submitting,
  onClose,
  onSubmit,
}: {
  editingEntry: DriveEntry | null;
  activeEntryType: DriveEntryType;
  currentFolderLabel: string;
  entryTitle: string;
  setEntryTitle: (value: string) => void;
  entryLinkUrl: string;
  setEntryLinkUrl: (value: string) => void;
  entryDescription: string;
  setEntryDescription: (value: string) => void;
  entryContentText: string;
  setEntryContentText: (value: string) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <DriveDialog
      title={
        editingEntry
          ? editingEntry.entryType === 'link'
            ? 'Edit Link'
            : 'Edit Note'
          : activeEntryType === 'link'
          ? 'Save Link'
          : 'Save Note'
      }
      description={
        editingEntry
          ? 'Update the stored item for this folder.'
          : activeEntryType === 'link'
          ? `Save a reusable link inside ${currentFolderLabel}.`
          : `Save a text note inside ${currentFolderLabel}.`
      }
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
            {submitting ? 'Saving...' : editingEntry ? 'Save Changes' : activeEntryType === 'link' ? 'Save Link' : 'Save Note'}
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        <input
          value={entryTitle}
          onChange={(event) => setEntryTitle(event.target.value)}
          placeholder={activeEntryType === 'link' ? 'Link title' : 'Note title'}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
        />
        {activeEntryType === 'link' ? (
          <input
            value={entryLinkUrl}
            onChange={(event) => setEntryLinkUrl(event.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
          />
        ) : (
          <>
            <textarea
              value={entryDescription}
              onChange={(event) => setEntryDescription(event.target.value)}
              placeholder="Short description"
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
            />
            <textarea
              value={entryContentText}
              onChange={(event) => setEntryContentText(event.target.value)}
              placeholder="Write or paste your note here"
              rows={8}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
            />
          </>
        )}
      </div>
    </DriveDialog>
  );
}
