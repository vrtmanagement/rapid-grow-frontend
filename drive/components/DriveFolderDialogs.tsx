import { FolderPlus, ImageIcon, X } from 'lucide-react';
import DriveDialog from './DriveDialog';
import type { DriveFolder, DriveFolderStorageMode, DriveFolderVisibility } from '../types';

type FolderFormFieldsProps = {
  folderFormName: string;
  setFolderFormName: (value: string) => void;
  folderFormDescription: string;
  setFolderFormDescription: (value: string) => void;
  folderStorageMode: DriveFolderStorageMode;
  setFolderStorageMode: (value: DriveFolderStorageMode) => void;
  folderVisibility: DriveFolderVisibility;
  setFolderVisibility: (value: DriveFolderVisibility) => void;
  visibilityLocked: boolean;
  visibilityLockedHint: string;
  descriptionRows?: number;
};

function FolderFormFields({
  folderFormName,
  setFolderFormName,
  folderFormDescription,
  setFolderFormDescription,
  folderStorageMode,
  setFolderStorageMode,
  folderVisibility,
  setFolderVisibility,
  visibilityLocked,
  visibilityLockedHint,
  descriptionRows = 5,
}: FolderFormFieldsProps) {
  return (
    <>
      <input
        value={folderFormName}
        onChange={(event) => setFolderFormName(event.target.value)}
        placeholder="Folder name"
        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
      />
      <textarea
        value={folderFormDescription}
        onChange={(event) => setFolderFormDescription(event.target.value)}
        placeholder="Description"
        rows={descriptionRows}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
      />
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Folder use</label>
        <select
          value={folderStorageMode}
          onChange={(event) => setFolderStorageMode(event.target.value as DriveFolderStorageMode)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
        >
          <option value="general">General files</option>
          <option value="images">Images workspace</option>
          <option value="links">Links workspace</option>
          <option value="text">Text notes workspace</option>
          <option value="mixed">Mixed workspace</option>
        </select>
        <p className="text-xs leading-5 text-slate-400">
          {folderStorageMode === 'general' && 'Best for standard file uploads and shared documents.'}
          {folderStorageMode === 'images' && 'Keeps this folder focused on image uploads, references, and creative assets only.'}
          {folderStorageMode === 'links' && 'Adds an in-folder link saver so teams can keep curated URLs together.'}
          {folderStorageMode === 'text' && 'Adds an in-folder note area for storing plain text, drafts, and written references.'}
          {folderStorageMode === 'mixed' && 'Supports files, saved links, and text notes in the same workspace.'}
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Visibility</label>
        <select
          value={folderVisibility}
          onChange={(event) => setFolderVisibility(event.target.value as DriveFolderVisibility)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
        >
          <option value="public" disabled={visibilityLocked}>
            Public folder
          </option>
          <option value="private">Private folder</option>
        </select>
        <p className="text-xs leading-5 text-slate-400">
          {visibilityLocked
            ? visibilityLockedHint
            : folderVisibility === 'public'
              ? 'Visible to every employee who has access to Drive.'
              : 'Visible only to you, including everything stored inside this folder.'}
        </p>
      </div>
    </>
  );
}

type FolderDialogSharedProps = {
  folderFormName: string;
  setFolderFormName: (value: string) => void;
  folderFormDescription: string;
  setFolderFormDescription: (value: string) => void;
  folderStorageMode: DriveFolderStorageMode;
  setFolderStorageMode: (value: DriveFolderStorageMode) => void;
  folderVisibility: DriveFolderVisibility;
  setFolderVisibility: (value: DriveFolderVisibility) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export function DriveCreateFolderDrawer({
  currentFolderLabel,
  createParentIsPrivate,
  folderFormName,
  setFolderFormName,
  folderFormDescription,
  setFolderFormDescription,
  folderStorageMode,
  setFolderStorageMode,
  folderVisibility,
  setFolderVisibility,
  submitting,
  onClose,
  onSubmit,
}: FolderDialogSharedProps & { currentFolderLabel: string; createParentIsPrivate: boolean }) {
  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/35 backdrop-blur-[2px]">
      <div className="flex h-full justify-end">
        <div className="flex h-full w-full max-w-[32rem] flex-col border-l border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,245,245,0.98))] px-6 py-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">RapidGrow Drive</p>
              <h3 className="mt-2 text-3xl font-semibold text-slate-900">Create Folder</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Add a new folder inside {currentFolderLabel}.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-red-200 hover:text-brand-red"
              aria-label="Close create folder drawer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            <FolderFormFields
              folderFormName={folderFormName}
              setFolderFormName={setFolderFormName}
              folderFormDescription={folderFormDescription}
              setFolderFormDescription={setFolderFormDescription}
              folderStorageMode={folderStorageMode}
              setFolderStorageMode={setFolderStorageMode}
              folderVisibility={folderVisibility}
              setFolderVisibility={setFolderVisibility}
              visibilityLocked={createParentIsPrivate}
              visibilityLockedHint="This folder must stay private because it is being created inside a private folder."
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
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
              className="inline-flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
            >
              {folderStorageMode === 'images' ? <ImageIcon size={15} /> : <FolderPlus size={15} />}
              {submitting ? 'Saving...' : 'Create Folder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DriveRenameFolderDialog({
  renameParentIsPrivate,
  folderFormName,
  setFolderFormName,
  folderFormDescription,
  setFolderFormDescription,
  folderStorageMode,
  setFolderStorageMode,
  folderVisibility,
  setFolderVisibility,
  submitting,
  onClose,
  onSubmit,
}: FolderDialogSharedProps & { renameParentIsPrivate: boolean }) {
  return (
    <DriveDialog
      title="Rename Folder"
      description="Update the folder name or description."
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
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        <FolderFormFields
          folderFormName={folderFormName}
          setFolderFormName={setFolderFormName}
          folderFormDescription={folderFormDescription}
          setFolderFormDescription={setFolderFormDescription}
          folderStorageMode={folderStorageMode}
          setFolderStorageMode={setFolderStorageMode}
          folderVisibility={folderVisibility}
          setFolderVisibility={setFolderVisibility}
          visibilityLocked={renameParentIsPrivate}
          visibilityLockedHint="This folder must stay private because its parent folder is private."
          descriptionRows={4}
        />
      </div>
    </DriveDialog>
  );
}

export function DriveMoveFolderDialog({
  moveFolderTarget,
  moveFolderDestination,
  setMoveFolderDestination,
  folderOptionsForMove,
  submitting,
  onClose,
  onSubmit,
}: {
  moveFolderTarget: DriveFolder;
  moveFolderDestination: string;
  setMoveFolderDestination: (value: string) => void;
  folderOptionsForMove: DriveFolder[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <DriveDialog
      title={`Move ${moveFolderTarget.name}`}
      description="Choose a new destination folder for this folder and everything inside it."
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
            {submitting ? 'Moving...' : 'Move Folder'}
          </button>
        </div>
      )}
    >
      <select
        value={moveFolderDestination}
        onChange={(event) => setMoveFolderDestination(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
      >
        <option value="">Shared Drive (root)</option>
        {folderOptionsForMove.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.breadcrumb.map((item) => item.name).join(' / ')}
          </option>
        ))}
      </select>
    </DriveDialog>
  );
}
