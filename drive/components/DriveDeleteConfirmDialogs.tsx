import ConfirmDialog from '../../components/ui/ConfirmDialog';
import type { DriveEntry, DriveFile, DriveFolder } from '../types';

export default function DriveDeleteConfirmDialogs({
  deleteFolderTarget,
  onCancelDeleteFolder,
  onConfirmDeleteFolder,
  deleteFileTarget,
  onCancelDeleteFile,
  onConfirmDeleteFile,
  deleteFileBatchTargets,
  onCancelDeleteFileBatch,
  onConfirmDeleteFileBatch,
  deleteEntryTarget,
  onCancelDeleteEntry,
  onConfirmDeleteEntry,
  submitting,
}: {
  deleteFolderTarget: DriveFolder | null;
  onCancelDeleteFolder: () => void;
  onConfirmDeleteFolder: () => void;
  deleteFileTarget: DriveFile | null;
  onCancelDeleteFile: () => void;
  onConfirmDeleteFile: () => void;
  deleteFileBatchTargets: DriveFile[];
  onCancelDeleteFileBatch: () => void;
  onConfirmDeleteFileBatch: () => void;
  deleteEntryTarget: DriveEntry | null;
  onCancelDeleteEntry: () => void;
  onConfirmDeleteEntry: () => void;
  submitting: boolean;
}) {
  return (
    <>
      {deleteFolderTarget ? (
        <ConfirmDialog
          title="Delete folder?"
          description="This permanently removes the folder, every nested subfolder, and all files inside it from the shared drive."
          confirmLabel={submitting ? 'Deleting...' : 'Delete'}
          disabled={submitting}
          onCancel={onCancelDeleteFolder}
          onConfirm={onConfirmDeleteFolder}
        />
      ) : null}

      {deleteFileTarget ? (
        <ConfirmDialog
          title="Delete file?"
          description="This permanently removes the file from the shared drive for everyone in the organization."
          confirmLabel={submitting ? 'Deleting...' : 'Delete'}
          disabled={submitting}
          onCancel={onCancelDeleteFile}
          onConfirm={onConfirmDeleteFile}
        />
      ) : null}

      {deleteFileBatchTargets.length ? (
        <ConfirmDialog
          title={deleteFileBatchTargets.length === 1 ? 'Delete file?' : 'Delete selected files?'}
          description={
            deleteFileBatchTargets.length === 1
              ? 'This permanently removes the file from the shared drive for everyone in the organization.'
              : `This permanently removes ${deleteFileBatchTargets.length} files from the shared drive for everyone in the organization.`
          }
          confirmLabel={submitting ? 'Deleting...' : 'Delete'}
          disabled={submitting}
          onCancel={onCancelDeleteFileBatch}
          onConfirm={onConfirmDeleteFileBatch}
        />
      ) : null}

      {deleteEntryTarget ? (
        <ConfirmDialog
          title={deleteEntryTarget.entryType === 'link' ? 'Delete link?' : 'Delete note?'}
          description="This permanently removes the saved item from the current folder."
          confirmLabel={submitting ? 'Deleting...' : 'Delete'}
          disabled={submitting}
          onCancel={onCancelDeleteEntry}
          onConfirm={onConfirmDeleteEntry}
        />
      ) : null}
    </>
  );
}
