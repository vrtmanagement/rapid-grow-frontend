import React from 'react';
import {
  ArrowDownUp,
  Folder,
  FolderPlus,
  HardDriveUpload,
  LayoutGrid,
  List,
  Search,
} from 'lucide-react';
import { FileDropZone } from '../../components/ui/FileDropZone';
import Toast from '../../components/ui/Toast';
import { DriveProvider } from '../context/DriveContext';
import DriveBreadcrumbs from '../components/DriveBreadcrumbs';
import DriveFileForwardModal from '../components/DriveFileForwardModal';
import DriveFileSelectionBar from '../components/DriveFileSelectionBar';
import DriveEntriesPanel from '../components/DriveEntriesPanel';
import DriveFilesTable from '../components/DriveFilesTable';
import DriveFolderGrid from '../components/DriveFolderGrid';
import DriveNoteViewer from '../components/DriveNoteViewer';
import DriveUploadModal from '../components/DriveUploadModal';
import {
  DriveCreateFolderDrawer,
  DriveMoveFolderDialog,
  DriveRenameFolderDialog,
} from '../components/DriveFolderDialogs';
import DriveEntryFormDialog from '../components/DriveEntryFormDialog';
import { DriveMoveFileDialog, DriveRenameFileDialog } from '../components/DriveFileActionDialogs';
import DriveDeleteConfirmDialogs from '../components/DriveDeleteConfirmDialogs';
import { apiForwardDriveFiles } from '../services/driveApi';
import { useDriveWorkspaceController } from '../hooks/useDriveWorkspaceController';
import type { DriveSortOption } from '../types';

function DriveWorkspace() {
  const dw = useDriveWorkspaceController();
  const {
    currentFolderId,
    folders,
    searchInput,
    setSearchInput,
    sort,
    setSort,
    loading,
    foldersLoading,
    filesLoading,
    entriesLoading,
    error,
    folderHasMore,
    fileHasMore,
    openFolder,
    loadMoreFolders,
    loadMoreFiles,
    refresh,
    toast,
    setToast,
    uploadSeedFiles,
    setUploadSeedFiles,
    folderDialogMode,
    setFolderDialogMode,
    folderFormName,
    setFolderFormName,
    folderFormDescription,
    setFolderFormDescription,
    folderStorageMode,
    setFolderStorageMode,
    folderVisibility,
    setFolderVisibility,
    setRenameFolderTarget,
    moveFolderTarget,
    setMoveFolderTarget,
    moveFolderDestination,
    setMoveFolderDestination,
    deleteFolderTarget,
    setDeleteFolderTarget,
    renameFileTarget,
    setRenameFileTarget,
    renameFileName,
    setRenameFileName,
    moveFileTarget,
    setMoveFileTarget,
    moveFileDestination,
    setMoveFileDestination,
    deleteFileTarget,
    setDeleteFileTarget,
    deleteFileBatchTargets,
    setDeleteFileBatchTargets,
    entryDialogMode,
    editingEntry,
    setActiveNoteEntryId,
    entryTitle,
    setEntryTitle,
    entryDescription,
    setEntryDescription,
    entryLinkUrl,
    setEntryLinkUrl,
    entryContentText,
    setEntryContentText,
    deleteEntryTarget,
    setDeleteEntryTarget,
    submitting,
    folderLayout,
    setFolderLayout,
    fileSelectionMode,
    setFileSelectionMode,
    selectedFileIds,
    setSelectedFileIds,
    forwardModalOpen,
    setForwardModalOpen,
    setForwardFileIds,
    forwardRecipients,
    forwardRecipientsLoading,
    forwardRecipientsError,
    breadcrumbItems,
    currentFolderLabel,
    folderOptionsForMove,
    fileOptionsForMove,
    currentStorageMode,
    createParentIsPrivate,
    renameParentIsPrivate,
    supportsLinks,
    supportsText,
    supportsFiles,
    visibleEntries,
    visibleFiles,
    shouldShowEntries,
    shouldShowFilesSection,
    activeNoteEntry,
    visibleFileIds,
    selectedVisibleFiles,
    forwardFiles,
    allVisibleFilesSelected,
    enableFileSelection,
    clearFileSelection,
    openForwardForFiles,
    openCreateFolderDialog,
    resetFolderDialog,
    resetEntryDialog,
    openCreateEntryDialog,
    openEditEntryDialog,
    openNoteEntry,
    getActiveEntryType,
    handleCreateOrRenameFolder,
    handleMoveFolder,
    handleDeleteFolder,
    handleRenameFile,
    handleMoveFile,
    handleDeleteFile,
    handleDeleteSelectedFiles,
    handleCreateOrUpdateEntry,
    handleDeleteEntry,
    handleCopyEntryLink,
    downloadFile,
  } = dw;

  return (
    <FileDropZone
      className="min-h-[calc(100vh-10rem)]"
      overlayTitle="Drop files to upload into Drive"
      overlayHint={`Files become visible to everyone in ${currentFolderLabel}`}
      onFiles={(incomingFiles) => {
        if (!supportsFiles) {
          setToast({ message: 'This folder only stores links or notes.', type: 'error' });
          return;
        }
        setUploadSeedFiles(incomingFiles);
      }}
    >
      <div className="-mt-2 space-y-6 sm:-mt-4 lg:-mx-8 lg:-mt-8">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {breadcrumbItems.length ? (
          <DriveBreadcrumbs items={breadcrumbItems} onNavigate={openFolder} />
        ) : null}

        <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-white">
                <Folder size={22} className="text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red">
                    Company Shared Drive
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Live Sync
                  </div>
                </div>
                <p className="mt-1.5 max-w-[34rem] text-sm leading-6 text-slate-500">
                  Upload, organize, preview, and share company files in one centralized workspace.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2.5 lg:items-end">
              <div className="flex flex-wrap items-center gap-2.5 lg:flex-nowrap">
                <button
                  type="button"
                  onClick={openCreateFolderDialog}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-red-600"
                >
                  <FolderPlus size={15} />
                  New Folder
                </button>
                {supportsFiles ? (
                  <button
                    type="button"
                    onClick={() => setUploadSeedFiles([])}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:border-red-200 hover:text-brand-red"
                  >
                    <HardDriveUpload size={15} />
                    Upload File
                  </button>
                ) : null}
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-600 transition hover:border-red-200">
                  <ArrowDownUp size={15} className="text-brand-red" />
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as DriveSortOption)}
                    className="bg-transparent font-semibold text-slate-700 outline-none"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name_asc">Name A-Z</option>
                    <option value="name_desc">Name Z-A</option>
                    <option value="size_desc">File Size</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Folders</h2>
              <p className="text-sm text-slate-500">Create nested structures for teams, projects, and shared assets.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-[252px] items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 focus-within:border-red-200 focus-within:ring-2 focus-within:ring-red-100 lg:w-[320px]">
                <Search size={16} className="text-brand-red" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={`Search in ${currentFolderLabel}`}
                  className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setFolderLayout('grid')}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                    folderLayout === 'grid'
                      ? 'bg-red-50 font-semibold text-brand-red'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <LayoutGrid size={15} />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setFolderLayout('list')}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                    folderLayout === 'list'
                      ? 'bg-red-50 font-semibold text-brand-red'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <List size={15} />
                  List
                </button>
              </div>
            </div>
          </div>
          <DriveFolderGrid
            folders={folders}
            loading={loading || foldersLoading}
            hasMore={folderHasMore}
            layout={folderLayout}
            onLoadMore={() => void loadMoreFolders()}
            onOpen={(folder) => openFolder(folder.id)}
            onRename={(folder) => {
              setRenameFolderTarget(folder);
              setFolderDialogMode('rename');
              setFolderFormName(folder.name);
              setFolderFormDescription(folder.description);
              setFolderStorageMode(folder.storageMode || 'general');
              setFolderVisibility(folder.visibility || 'public');
            }}
            onMove={(folder) => {
              setMoveFolderTarget(folder);
              setMoveFolderDestination(folder.parentFolder || '');
            }}
            onDelete={(folder) => setDeleteFolderTarget(folder)}
            onCreateFolder={openCreateFolderDialog}
          />
        </section>

        <section className="space-y-4">
          {shouldShowEntries ? (
            activeNoteEntry ? (
              <DriveNoteViewer
                entry={activeNoteEntry}
                onBack={() => setActiveNoteEntryId(null)}
                onEdit={openEditEntryDialog}
                onDelete={(entry) => setDeleteEntryTarget(entry)}
              />
            ) : (
              <DriveEntriesPanel
                entries={visibleEntries}
                loading={entriesLoading}
                title={
                  currentStorageMode === 'links'
                    ? 'Saved Links'
                    : currentStorageMode === 'text'
                    ? 'Text Notes'
                    : 'Workspace Items'
                }
                description={
                  currentStorageMode === 'links'
                    ? 'Store references, URLs, and important company links directly inside this folder.'
                    : currentStorageMode === 'text'
                    ? 'Capture structured notes, drafts, and plain text directly inside this folder.'
                    : 'Store links and written notes alongside uploaded documents in this workspace.'
                }
                variant={currentStorageMode === 'links' ? 'links-list' : 'default'}
                onCreateLink={supportsLinks ? () => openCreateEntryDialog('link') : undefined}
                onCreateText={supportsText ? () => openCreateEntryDialog('text') : undefined}
                onView={openNoteEntry}
                onCopyLink={handleCopyEntryLink}
                onEdit={openEditEntryDialog}
                onDelete={(entry) => setDeleteEntryTarget(entry)}
              />
            )
          ) : null}

          {shouldShowFilesSection ? (
            <>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Files</h2>
                <p className="text-sm text-slate-500">
                  {currentStorageMode === 'images'
                    ? 'Only image uploads appear in this folder so teams can keep visuals organized.'
                    : 'Preview supported formats, download documents, and keep the whole organization in sync.'}
                </p>
              </div>
              <DriveFileSelectionBar
                visible={fileSelectionMode}
                selectedCount={selectedVisibleFiles.length}
                onClear={clearFileSelection}
                onForward={() => openForwardForFiles(selectedVisibleFiles.map((file) => file.id))}
                onDelete={() => setDeleteFileBatchTargets(selectedVisibleFiles)}
              />
              <DriveFilesTable
                files={visibleFiles}
                loading={loading || filesLoading}
                hasMore={fileHasMore}
                selectionMode={fileSelectionMode}
                selectedFileIds={selectedFileIds}
                allVisibleSelected={allVisibleFilesSelected}
                onLoadMore={() => void loadMoreFiles()}
                onDownload={(file) => {
                  void downloadFile(file).catch((nextError) => {
                    setToast({
                      message: nextError instanceof Error ? nextError.message : 'Failed to download file',
                      type: 'error',
                    });
                  });
                }}
                onRename={(file) => {
                  setRenameFileTarget(file);
                  setRenameFileName(file.fileName);
                }}
                onMove={(file) => {
                  setMoveFileTarget(file);
                  setMoveFileDestination(file.folderId || '');
                }}
                onDelete={(file) => setDeleteFileTarget(file)}
                onSelect={enableFileSelection}
                onForward={(file) => openForwardForFiles([file.id])}
                onToggleFileSelection={(fileId) => {
                  setFileSelectionMode(true);
                  setSelectedFileIds((prev) =>
                    prev.includes(fileId)
                      ? prev.filter((currentId) => currentId !== fileId)
                      : [...prev, fileId],
                  );
                }}
                onToggleSelectAll={() => {
                  setFileSelectionMode(true);
                  setSelectedFileIds((prev) =>
                    allVisibleFilesSelected
                      ? prev.filter((fileId) => !visibleFileIds.includes(fileId))
                      : Array.from(new Set([...prev, ...visibleFileIds])),
                  );
                }}
              />
            </>
          ) : null}
        </section>
      </div>

      {folderDialogMode === 'create' ? (
        <DriveCreateFolderDrawer
          currentFolderLabel={currentFolderLabel}
          createParentIsPrivate={createParentIsPrivate}
          folderFormName={folderFormName}
          setFolderFormName={setFolderFormName}
          folderFormDescription={folderFormDescription}
          setFolderFormDescription={setFolderFormDescription}
          folderStorageMode={folderStorageMode}
          setFolderStorageMode={setFolderStorageMode}
          folderVisibility={folderVisibility}
          setFolderVisibility={setFolderVisibility}
          submitting={submitting}
          onClose={resetFolderDialog}
          onSubmit={() => void handleCreateOrRenameFolder()}
        />
      ) : null}

      {folderDialogMode === 'rename' ? (
        <DriveRenameFolderDialog
          renameParentIsPrivate={renameParentIsPrivate}
          folderFormName={folderFormName}
          setFolderFormName={setFolderFormName}
          folderFormDescription={folderFormDescription}
          setFolderFormDescription={setFolderFormDescription}
          folderStorageMode={folderStorageMode}
          setFolderStorageMode={setFolderStorageMode}
          folderVisibility={folderVisibility}
          setFolderVisibility={setFolderVisibility}
          submitting={submitting}
          onClose={resetFolderDialog}
          onSubmit={() => void handleCreateOrRenameFolder()}
        />
      ) : null}

      {entryDialogMode ? (
        <DriveEntryFormDialog
          editingEntry={editingEntry}
          activeEntryType={getActiveEntryType()}
          currentFolderLabel={currentFolderLabel}
          entryTitle={entryTitle}
          setEntryTitle={setEntryTitle}
          entryLinkUrl={entryLinkUrl}
          setEntryLinkUrl={setEntryLinkUrl}
          entryDescription={entryDescription}
          setEntryDescription={setEntryDescription}
          entryContentText={entryContentText}
          setEntryContentText={setEntryContentText}
          submitting={submitting}
          onClose={resetEntryDialog}
          onSubmit={() => void handleCreateOrUpdateEntry()}
        />
      ) : null}

      {moveFolderTarget ? (
        <DriveMoveFolderDialog
          moveFolderTarget={moveFolderTarget}
          moveFolderDestination={moveFolderDestination}
          setMoveFolderDestination={setMoveFolderDestination}
          folderOptionsForMove={folderOptionsForMove}
          submitting={submitting}
          onClose={() => {
            setMoveFolderTarget(null);
            setMoveFolderDestination('');
          }}
          onSubmit={() => void handleMoveFolder()}
        />
      ) : null}

      {renameFileTarget ? (
        <DriveRenameFileDialog
          renameFileName={renameFileName}
          setRenameFileName={setRenameFileName}
          submitting={submitting}
          onClose={() => {
            setRenameFileTarget(null);
            setRenameFileName('');
          }}
          onSubmit={() => void handleRenameFile()}
        />
      ) : null}

      {moveFileTarget ? (
        <DriveMoveFileDialog
          moveFileTarget={moveFileTarget}
          moveFileDestination={moveFileDestination}
          setMoveFileDestination={setMoveFileDestination}
          fileOptionsForMove={fileOptionsForMove}
          submitting={submitting}
          onClose={() => {
            setMoveFileTarget(null);
            setMoveFileDestination('');
          }}
          onSubmit={() => void handleMoveFile()}
        />
      ) : null}

      {uploadSeedFiles !== null ? (
        <DriveUploadModal
          folderId={currentFolderId}
          folderName={currentFolderLabel}
          storageMode={currentStorageMode}
          initialFiles={uploadSeedFiles}
          onClose={() => setUploadSeedFiles(null)}
          onUploaded={() => {
            void refresh(true);
          }}
          onNotice={(message, type) => setToast({ message, type })}
        />
      ) : null}

      {forwardModalOpen ? (
        <DriveFileForwardModal
          open={forwardModalOpen}
          files={forwardFiles}
          recipients={forwardRecipients}
          loading={forwardRecipientsLoading}
          error={forwardRecipientsError}
          onClose={() => {
            setForwardModalOpen(false);
            setForwardFileIds([]);
          }}
          onSubmit={async (recipientIds, note) => {
            await apiForwardDriveFiles({
              fileIds: forwardFiles.map((file) => file.id),
              recipientIds,
              note: note.trim() || undefined,
            });
            setForwardModalOpen(false);
            setForwardFileIds([]);
            clearFileSelection();
            setToast({ message: 'Documents forwarded successfully.', type: 'success' });
          }}
        />
      ) : null}

      <DriveDeleteConfirmDialogs
        deleteFolderTarget={deleteFolderTarget}
        onCancelDeleteFolder={() => setDeleteFolderTarget(null)}
        onConfirmDeleteFolder={() => void handleDeleteFolder()}
        deleteFileTarget={deleteFileTarget}
        onCancelDeleteFile={() => setDeleteFileTarget(null)}
        onConfirmDeleteFile={() => void handleDeleteFile()}
        deleteFileBatchTargets={deleteFileBatchTargets}
        onCancelDeleteFileBatch={() => setDeleteFileBatchTargets([])}
        onConfirmDeleteFileBatch={() => void handleDeleteSelectedFiles()}
        deleteEntryTarget={deleteEntryTarget}
        onCancelDeleteEntry={() => setDeleteEntryTarget(null)}
        onConfirmDeleteEntry={() => void handleDeleteEntry()}
        submitting={submitting}
      />

      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </FileDropZone>
  );
}

export default function DriveView() {
  return (
    <DriveProvider>
      <DriveWorkspace />
    </DriveProvider>
  );
}
