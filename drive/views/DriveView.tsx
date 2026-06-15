import React, { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Folder,
  FolderPlus,
  HardDriveUpload,
  ImageIcon,
  LayoutGrid,
  List,
  Search,
  X,
} from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Toast from '../../components/ui/Toast';
import { apiListConversations, apiListUsers } from '../../communication/api';
import type { ForwardRecipientOption } from '../../communication/components/forward/types';
import { getStoredAuth, mapListConversationsApiRowToSummary, mapListUsersApiRowToChatUser } from '../../communication/context/communicationContextHelpers';
import { FileDropZone } from '../../components/ui/FileDropZone';
import { DriveProvider, useDrive } from '../context/DriveContext';
import DriveBreadcrumbs from '../components/DriveBreadcrumbs';
import DriveDialog from '../components/DriveDialog';
import DriveFileForwardModal from '../components/DriveFileForwardModal';
import DriveFileSelectionBar from '../components/DriveFileSelectionBar';
import DriveEntriesPanel from '../components/DriveEntriesPanel';
import DriveFilesTable from '../components/DriveFilesTable';
import DriveFolderGrid from '../components/DriveFolderGrid';
import DriveNoteViewer from '../components/DriveNoteViewer';
import DriveUploadModal from '../components/DriveUploadModal';
import { apiForwardDriveFiles } from '../services/driveApi';
import type {
  DriveEntry,
  DriveEntryType,
  DriveFile,
  DriveFolder,
  DriveFolderStorageMode,
  DriveFolderVisibility,
  DriveSortOption,
} from '../types';

type ToastState = {
  message: string;
  type: 'success' | 'error';
} | null;

function buildFolderTreeOptions(
  treeFolders: DriveFolder[],
  targetFolder?: DriveFolder | DriveFile | null,
  isFolderMove = false,
) {
  return treeFolders.filter((folder) => {
    if (!targetFolder || !isFolderMove) return true;
    if (folder.id === targetFolder.id) return false;
    return !folder.breadcrumb.some((crumb) => crumb.id === targetFolder.id);
  });
}

function DriveDestinationPicker({
  value,
  onChange,
  options,
  rootLabel,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  options: DriveFolder[];
  rootLabel: string;
}) {
  const destinations = [
    {
      id: '',
      label: rootLabel,
      path: 'Move this item back to the main shared drive.',
    },
    ...options.map((folder) => ({
      id: folder.id,
      label: folder.name,
      path: folder.breadcrumb.map((item) => item.name).join(' / '),
    })),
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="max-h-[20rem] overflow-y-auto">
        {destinations.map((destination) => {
          const active = value === destination.id;
          return (
            <button
              key={destination.id || 'root'}
              type="button"
              onClick={() => onChange(destination.id)}
              className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 ${
                active ? 'bg-red-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${active ? 'text-brand-red' : 'text-slate-900'}`}>
                  {destination.label}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{destination.path}</div>
              </div>
              <span
                className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border ${
                  active ? 'border-brand-red bg-brand-red' : 'border-slate-300 bg-white'
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DriveWorkspace() {
  const {
    currentFolder,
    currentFolderId,
    folders,
    files,
    entries,
    treeFolders,
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
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    renameFile,
    moveFile,
    deleteFile,
    downloadFile,
    createEntry,
    updateEntry,
    deleteEntry,
  } = useDrive();

  const [toast, setToast] = useState<ToastState>(null);
  const [uploadSeedFiles, setUploadSeedFiles] = useState<File[] | null>(null);
  const [folderDialogMode, setFolderDialogMode] = useState<'create' | 'rename' | null>(null);
  const [folderFormName, setFolderFormName] = useState('');
  const [folderFormDescription, setFolderFormDescription] = useState('');
  const [folderStorageMode, setFolderStorageMode] = useState<DriveFolderStorageMode>('general');
  const [folderVisibility, setFolderVisibility] = useState<DriveFolderVisibility>('public');
  const [renameFolderTarget, setRenameFolderTarget] = useState<DriveFolder | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<DriveFolder | null>(null);
  const [moveFolderDestination, setMoveFolderDestination] = useState<string>('');
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<DriveFolder | null>(null);
  const [renameFileTarget, setRenameFileTarget] = useState<DriveFile | null>(null);
  const [renameFileName, setRenameFileName] = useState('');
  const [moveFileTarget, setMoveFileTarget] = useState<DriveFile | null>(null);
  const [moveFileDestination, setMoveFileDestination] = useState<string>('');
  const [deleteFileTarget, setDeleteFileTarget] = useState<DriveFile | null>(null);
  const [deleteFileBatchTargets, setDeleteFileBatchTargets] = useState<DriveFile[]>([]);
  const [entryDialogMode, setEntryDialogMode] = useState<'create-link' | 'create-text' | 'edit' | null>(null);
  const [editingEntry, setEditingEntry] = useState<DriveEntry | null>(null);
  const [activeNoteEntryId, setActiveNoteEntryId] = useState<string | null>(null);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [entryLinkUrl, setEntryLinkUrl] = useState('');
  const [entryContentText, setEntryContentText] = useState('');
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<DriveEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [folderLayout, setFolderLayout] = useState<'grid' | 'list'>('grid');
  const [fileSelectionMode, setFileSelectionMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [forwardFileIds, setForwardFileIds] = useState<string[]>([]);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardRecipients, setForwardRecipients] = useState<ForwardRecipientOption[]>([]);
  const [forwardRecipientsLoading, setForwardRecipientsLoading] = useState(false);
  const [forwardRecipientsError, setForwardRecipientsError] = useState<string | null>(null);

  const breadcrumbItems = currentFolder?.breadcrumb || [];
  const currentFolderLabel = currentFolder?.name || 'Shared Drive';
  const folderOptionsForMove = useMemo(
    () => buildFolderTreeOptions(treeFolders, moveFolderTarget, true),
    [moveFolderTarget, treeFolders],
  );
  const fileOptionsForMove = useMemo(
    () => buildFolderTreeOptions(treeFolders, moveFileTarget, false),
    [moveFileTarget, treeFolders],
  );
  const currentStorageMode = currentFolder?.storageMode || 'general';
  const createParentIsPrivate = currentFolder?.visibility === 'private';
  const renameParentFolder = useMemo(
    () =>
      renameFolderTarget?.parentFolder
        ? treeFolders.find((folder) => folder.id === renameFolderTarget.parentFolder) || null
        : null,
    [renameFolderTarget, treeFolders],
  );
  const renameParentIsPrivate = renameParentFolder?.visibility === 'private';
  const supportsLinks = currentStorageMode === 'links' || currentStorageMode === 'mixed';
  const supportsText = currentStorageMode === 'text' || currentStorageMode === 'mixed';
  const supportsFiles = currentStorageMode === 'general' || currentStorageMode === 'mixed' || currentStorageMode === 'images';
  const visibleEntries = useMemo(() => {
    if (currentStorageMode === 'links') return entries.filter((entry) => entry.entryType === 'link');
    if (currentStorageMode === 'text') return entries.filter((entry) => entry.entryType === 'text');
    if (currentStorageMode === 'mixed') return entries;
    return [];
  }, [currentStorageMode, entries]);
  const visibleFiles = useMemo(() => {
    if (currentStorageMode === 'images') {
      return files.filter((file) => file.fileCategory === 'image');
    }
    if (!supportsFiles) return [];
    return files;
  }, [currentStorageMode, files, supportsFiles]);
  const shouldShowEntries = Boolean(
    currentFolderId &&
      (currentStorageMode === 'links' || currentStorageMode === 'text' || currentStorageMode === 'mixed'),
  );
  const shouldShowFilesSection = supportsFiles;
  const activeNoteEntry = useMemo(
    () => visibleEntries.find((entry) => entry.id === activeNoteEntryId && entry.entryType === 'text') || null,
    [activeNoteEntryId, visibleEntries],
  );
  const visibleFileIds = useMemo(() => visibleFiles.map((file) => file.id), [visibleFiles]);
  const selectedVisibleFiles = useMemo(
    () => visibleFiles.filter((file) => selectedFileIds.includes(file.id)),
    [selectedFileIds, visibleFiles],
  );
  const forwardFiles = useMemo(
    () => visibleFiles.filter((file) => forwardFileIds.includes(file.id)),
    [forwardFileIds, visibleFiles],
  );
  const allVisibleFilesSelected = Boolean(
    visibleFiles.length && visibleFiles.every((file) => selectedFileIds.includes(file.id)),
  );

  React.useEffect(() => {
    setSelectedFileIds((prev) => prev.filter((fileId) => visibleFileIds.includes(fileId)));
    setForwardFileIds((prev) => prev.filter((fileId) => visibleFileIds.includes(fileId)));
  }, [visibleFileIds]);

  React.useEffect(() => {
    if (!selectedFileIds.length) {
      setFileSelectionMode(false);
    }
  }, [selectedFileIds]);

  React.useEffect(() => {
    if (activeNoteEntryId && !visibleEntries.some((entry) => entry.id === activeNoteEntryId && entry.entryType === 'text')) {
      setActiveNoteEntryId(null);
    }
  }, [activeNoteEntryId, visibleEntries]);

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadForwardRecipients() {
    setForwardRecipientsLoading(true);
    setForwardRecipientsError(null);
    try {
      const [usersResponse, conversationsResponse] = await Promise.all([
        apiListUsers(),
        apiListConversations(),
      ]);
      const users = (usersResponse.users || []).map(mapListUsersApiRowToChatUser);
      const conversations = (conversationsResponse.conversations || []).map(mapListConversationsApiRowToSummary);
      const auth = getStoredAuth();
      const currentUserId = String(auth?.employee?._id || auth?.employee?.empId || '').trim();

      const recentConversationOptions: ForwardRecipientOption[] = conversations.map((conversation) => {
        if (conversation.type === 'dm' && conversation.otherUser) {
          return {
            id: `recent-${conversation.conversationKey}`,
            recipientId: `conversation:${conversation.conversationKey}`,
            title: conversation.otherUser.name,
            subtitle: conversation.lastMessagePreview || 'Direct message',
            avatar: conversation.otherUser.avatar || conversation.avatar,
            kind: 'conversation',
            section: 'recent',
            department: conversation.otherUser.department,
          };
        }

        return {
          id: `recent-${conversation.conversationKey}`,
          recipientId: `conversation:${conversation.conversationKey}`,
          title: conversation.title,
          subtitle: conversation.lastMessagePreview || 'Team channel',
          avatar: conversation.avatar,
          kind: 'conversation',
          section: 'recent',
        };
      });

      const channelOptions: ForwardRecipientOption[] = conversations
        .filter((conversation) => conversation.type === 'channel')
        .map((conversation) => ({
          id: `channel-${conversation.conversationKey}`,
          recipientId: `conversation:${conversation.conversationKey}`,
          title: conversation.title,
          subtitle: `${conversation.memberIds?.length || 0} members`,
          avatar: conversation.avatar,
          kind: 'conversation' as const,
          section: 'channels' as const,
        }));

      const employeeOptions: ForwardRecipientOption[] = users
        .filter((user) => user.id !== currentUserId && user.empId !== currentUserId)
        .map((user) => ({
          id: `user-${user.id}`,
          recipientId: `user:${user.id}`,
          title: user.name,
          subtitle: [user.designation, user.department].filter(Boolean).join(' - ') || user.role,
          avatar: user.avatar,
          kind: 'user' as const,
          section: 'employees' as const,
          department: user.department,
        }));

      const uniqueByRecipientId = new Map<string, ForwardRecipientOption>();
      [...recentConversationOptions, ...channelOptions, ...employeeOptions].forEach((option) => {
        if (!uniqueByRecipientId.has(option.recipientId)) {
          uniqueByRecipientId.set(option.recipientId, option);
        }
      });

      setForwardRecipients(Array.from(uniqueByRecipientId.values()));
    } catch (nextError) {
      setForwardRecipientsError(nextError instanceof Error ? nextError.message : 'Failed to load chats');
    } finally {
      setForwardRecipientsLoading(false);
    }
  }

  function enableFileSelection(file: DriveFile) {
    setFileSelectionMode(true);
    setSelectedFileIds((prev) => (prev.includes(file.id) ? prev : [...prev, file.id]));
  }

  function clearFileSelection() {
    setFileSelectionMode(false);
    setSelectedFileIds([]);
  }

  function openForwardForFiles(fileIds: string[]) {
    const nextIds = Array.from(new Set(fileIds.filter(Boolean)));
    if (!nextIds.length) return;
    setForwardFileIds(nextIds);
    setForwardModalOpen(true);
    if (!forwardRecipients.length && !forwardRecipientsLoading) {
      void loadForwardRecipients();
    }
  }

  function openCreateFolderDialog() {
    setFolderDialogMode('create');
    setFolderFormName('');
    setFolderFormDescription('');
    setFolderStorageMode('general');
    setFolderVisibility(createParentIsPrivate ? 'private' : 'public');
  }

  function resetFolderDialog() {
    setFolderDialogMode(null);
    setRenameFolderTarget(null);
    setFolderFormName('');
    setFolderFormDescription('');
    setFolderStorageMode('general');
    setFolderVisibility('public');
  }

  function resetEntryDialog() {
    setEntryDialogMode(null);
    setEditingEntry(null);
    setEntryTitle('');
    setEntryDescription('');
    setEntryLinkUrl('');
    setEntryContentText('');
  }

  function openCreateEntryDialog(type: DriveEntryType) {
    setEditingEntry(null);
    setEntryTitle('');
    setEntryDescription('');
    setEntryLinkUrl('');
    setEntryContentText('');
    setEntryDialogMode(type === 'link' ? 'create-link' : 'create-text');
  }

  function openEditEntryDialog(entry: DriveEntry) {
    setEditingEntry(entry);
    setEntryTitle(entry.title);
    setEntryDescription(entry.description || '');
    setEntryLinkUrl(entry.linkUrl || '');
    setEntryContentText(entry.contentText || '');
    setEntryDialogMode('edit');
  }

  function openNoteEntry(entry: DriveEntry) {
    if (entry.entryType !== 'text') return;
    setActiveNoteEntryId(entry.id);
  }

  function getActiveEntryType(): DriveEntryType {
    if (entryDialogMode === 'create-link') return 'link';
    if (entryDialogMode === 'create-text') return 'text';
    return editingEntry?.entryType || 'text';
  }

  async function handleCreateOrRenameFolder() {
    if (!folderFormName.trim()) {
      setToast({ message: 'Folder name is required.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      if (folderDialogMode === 'create') {
        await createFolder({
          name: folderFormName.trim(),
          description: folderFormDescription.trim(),
          storageMode: folderStorageMode,
          visibility: folderVisibility,
          parentFolder: currentFolderId,
        });
        setToast({ message: 'Folder created.', type: 'success' });
      } else if (renameFolderTarget) {
        await renameFolder(renameFolderTarget.id, {
          name: folderFormName.trim(),
          description: folderFormDescription.trim(),
          storageMode: folderStorageMode,
          visibility: folderVisibility,
        });
        setToast({ message: 'Folder updated.', type: 'success' });
      }
      resetFolderDialog();
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : 'Failed to save folder',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMoveFolder() {
    if (!moveFolderTarget) return;
    setSubmitting(true);
    try {
      await moveFolder({
        folderId: moveFolderTarget.id,
        parentFolder: moveFolderDestination || null,
      });
      setToast({ message: 'Folder moved.', type: 'success' });
      setMoveFolderTarget(null);
      setMoveFolderDestination('');
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : 'Failed to move folder',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteFolder() {
    if (!deleteFolderTarget) return;
    setSubmitting(true);
    try {
      const result = await deleteFolder(deleteFolderTarget.id);
      setToast({
        message: `Folder deleted with ${result.deletedFileCount} files removed.`,
        type: 'success',
      });
      setDeleteFolderTarget(null);
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : 'Failed to delete folder',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRenameFile() {
    if (!renameFileTarget || !renameFileName.trim()) {
      setToast({ message: 'File name is required.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await renameFile(renameFileTarget.id, renameFileName.trim());
      setToast({ message: 'File renamed.', type: 'success' });
      setRenameFileTarget(null);
      setRenameFileName('');
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : 'Failed to rename file',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMoveFile() {
    if (!moveFileTarget) return;
    setSubmitting(true);
    try {
      await moveFile({
        fileId: moveFileTarget.id,
        folderId: moveFileDestination || null,
      });
      setToast({ message: 'File moved.', type: 'success' });
      setMoveFileTarget(null);
      setMoveFileDestination('');
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : 'Failed to move file',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteFile() {
    if (!deleteFileTarget) return;
    setSubmitting(true);
    try {
      await deleteFile(deleteFileTarget.id);
      setToast({ message: 'File deleted.', type: 'success' });
      setDeleteFileTarget(null);
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : 'Failed to delete file',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSelectedFiles() {
    if (!deleteFileBatchTargets.length) return;
    setSubmitting(true);
    try {
      for (const file of deleteFileBatchTargets) {
        await deleteFile(file.id);
      }
      clearFileSelection();
      setDeleteFileBatchTargets([]);
      setToast({
        message:
          deleteFileBatchTargets.length === 1
            ? 'File deleted.'
            : `${deleteFileBatchTargets.length} files deleted.`,
        type: 'success',
      });
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : 'Failed to delete selected files',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateOrUpdateEntry() {
    if (!currentFolderId && !editingEntry) {
      setToast({ message: 'Open a folder first.', type: 'error' });
      return;
    }
    if (!entryTitle.trim()) {
      setToast({ message: 'Title is required.', type: 'error' });
      return;
    }

    const entryType = getActiveEntryType();
    if (entryType === 'link' && !entryLinkUrl.trim()) {
      setToast({ message: 'Link URL is required.', type: 'error' });
      return;
    }
    if (entryType === 'text' && !entryContentText.trim()) {
      setToast({ message: 'Text content is required.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      if (editingEntry) {
        await updateEntry(editingEntry.id, {
          title: entryTitle.trim(),
          description: entryDescription.trim(),
          linkUrl: entryType === 'link' ? entryLinkUrl.trim() : undefined,
          contentText: entryType === 'text' ? entryContentText.trim() : undefined,
        });
        setToast({ message: 'Saved item updated.', type: 'success' });
      } else {
        await createEntry({
          folderId: currentFolderId as string,
          entryType,
          title: entryTitle.trim(),
          description: entryDescription.trim(),
          linkUrl: entryType === 'link' ? entryLinkUrl.trim() : undefined,
          contentText: entryType === 'text' ? entryContentText.trim() : undefined,
        });
        setToast({ message: entryType === 'link' ? 'Link saved.' : 'Note saved.', type: 'success' });
      }
      if (entryType === 'text') {
        setActiveNoteEntryId(editingEntry?.id || activeNoteEntryId);
      }
      resetEntryDialog();
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : 'Failed to save item',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEntry() {
    if (!deleteEntryTarget) return;
    setSubmitting(true);
    try {
      await deleteEntry(deleteEntryTarget.id);
      if (activeNoteEntryId === deleteEntryTarget.id) {
        setActiveNoteEntryId(null);
      }
      setToast({ message: 'Saved item deleted.', type: 'success' });
      setDeleteEntryTarget(null);
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : 'Failed to delete item',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

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
                {breadcrumbItems.length ? (
                  <div className="mt-2.5">
                    <DriveBreadcrumbs items={breadcrumbItems} onNavigate={openFolder} />
                  </div>
                ) : null}
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
                onCreateLink={supportsLinks ? () => openCreateEntryDialog('link') : undefined}
                onCreateText={supportsText ? () => openCreateEntryDialog('text') : undefined}
                onView={openNoteEntry}
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
                  onClick={resetFolderDialog}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-red-200 hover:text-brand-red"
                  aria-label="Close create folder drawer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
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
                  rows={5}
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
                    <option value="public" disabled={createParentIsPrivate}>
                      Public folder
                    </option>
                    <option value="private">Private folder</option>
                  </select>
                  <p className="text-xs leading-5 text-slate-400">
                    {createParentIsPrivate
                      ? 'This folder must stay private because it is being created inside a private folder.'
                      : folderVisibility === 'public'
                        ? 'Visible to every employee who has access to Drive.'
                        : 'Visible only to you, including everything stored inside this folder.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={resetFolderDialog}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleCreateOrRenameFolder()}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                >
                  {folderStorageMode === 'images' ? <ImageIcon size={15} /> : <FolderPlus size={15} />}
                  {submitting ? 'Saving...' : 'Create Folder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {folderDialogMode === 'rename' ? (
        <DriveDialog
          title="Rename Folder"
          description="Update the folder name or description."
          onClose={resetFolderDialog}
          footer={(
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetFolderDialog}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleCreateOrRenameFolder()}
                className="rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        >
          <div className="space-y-4">
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
              rows={4}
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
                <option value="public" disabled={renameParentIsPrivate}>
                  Public folder
                </option>
                <option value="private">Private folder</option>
              </select>
              <p className="text-xs leading-5 text-slate-400">
                {renameParentIsPrivate
                  ? 'This folder must stay private because its parent folder is private.'
                  : folderVisibility === 'public'
                    ? 'Visible to every employee who has access to Drive.'
                    : 'Visible only to you, including everything stored inside this folder.'}
              </p>
            </div>
          </div>
        </DriveDialog>
      ) : null}

      {entryDialogMode ? (
        <DriveDialog
          title={
            editingEntry
              ? editingEntry.entryType === 'link'
                ? 'Edit Link'
                : 'Edit Note'
              : getActiveEntryType() === 'link'
              ? 'Save Link'
              : 'Save Note'
          }
          description={
            editingEntry
              ? 'Update the stored item for this folder.'
              : getActiveEntryType() === 'link'
              ? `Save a reusable link inside ${currentFolderLabel}.`
              : `Save a text note inside ${currentFolderLabel}.`
          }
          onClose={resetEntryDialog}
          footer={(
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetEntryDialog}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleCreateOrUpdateEntry()}
                className="rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
              >
                {submitting ? 'Saving...' : editingEntry ? 'Save Changes' : getActiveEntryType() === 'link' ? 'Save Link' : 'Save Note'}
              </button>
            </div>
          )}
        >
          <div className="space-y-4">
            <input
              value={entryTitle}
              onChange={(event) => setEntryTitle(event.target.value)}
              placeholder={getActiveEntryType() === 'link' ? 'Link title' : 'Note title'}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
            />
            <textarea
              value={entryDescription}
              onChange={(event) => setEntryDescription(event.target.value)}
              placeholder="Short description"
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
            />
            {getActiveEntryType() === 'link' ? (
              <input
                value={entryLinkUrl}
                onChange={(event) => setEntryLinkUrl(event.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
              />
            ) : (
              <textarea
                value={entryContentText}
                onChange={(event) => setEntryContentText(event.target.value)}
                placeholder="Write or paste your note here"
                rows={8}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 outline-none focus:border-red-300"
              />
            )}
          </div>
        </DriveDialog>
      ) : null}

      {moveFolderTarget ? (
        <DriveDialog
          title={`Move ${moveFolderTarget.name}`}
          description="Choose a new destination folder for this folder and everything inside it."
          onClose={() => {
            setMoveFolderTarget(null);
            setMoveFolderDestination('');
          }}
          footer={(
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setMoveFolderTarget(null);
                  setMoveFolderDestination('');
                }}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleMoveFolder()}
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
      ) : null}

      {renameFileTarget ? (
        <DriveDialog
          title="Rename File"
          description="Update the file name shown across the company drive."
          onClose={() => {
            setRenameFileTarget(null);
            setRenameFileName('');
          }}
          footer={(
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRenameFileTarget(null);
                  setRenameFileName('');
                }}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleRenameFile()}
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
      ) : null}

      {moveFileTarget ? (
        <DriveDialog
          title="Move File"
          description="Choose a destination folder for this file."
          onClose={() => {
            setMoveFileTarget(null);
            setMoveFileDestination('');
          }}
          footer={(
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setMoveFileTarget(null);
                  setMoveFileDestination('');
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleMoveFile()}
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

      {deleteFolderTarget ? (
        <ConfirmDialog
          title="Delete folder?"
          description="This permanently removes the folder, every nested subfolder, and all files inside it from the shared drive."
          confirmLabel={submitting ? 'Deleting...' : 'Delete'}
          disabled={submitting}
          onCancel={() => setDeleteFolderTarget(null)}
          onConfirm={() => void handleDeleteFolder()}
        />
      ) : null}

      {deleteFileTarget ? (
        <ConfirmDialog
          title="Delete file?"
          description="This permanently removes the file from the shared drive for everyone in the organization."
          confirmLabel={submitting ? 'Deleting...' : 'Delete'}
          disabled={submitting}
          onCancel={() => setDeleteFileTarget(null)}
          onConfirm={() => void handleDeleteFile()}
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
          onCancel={() => setDeleteFileBatchTargets([])}
          onConfirm={() => void handleDeleteSelectedFiles()}
        />
      ) : null}

      {deleteEntryTarget ? (
        <ConfirmDialog
          title={deleteEntryTarget.entryType === 'link' ? 'Delete link?' : 'Delete note?'}
          description="This permanently removes the saved item from the current folder."
          confirmLabel={submitting ? 'Deleting...' : 'Delete'}
          disabled={submitting}
          onCancel={() => setDeleteEntryTarget(null)}
          onConfirm={() => void handleDeleteEntry()}
        />
      ) : null}

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
