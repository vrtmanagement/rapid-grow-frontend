import React, { useMemo, useState } from 'react';
import { apiListConversations, apiListUsers } from '../../communication/api';
import type { ForwardRecipientOption } from '../../communication/components/forward/types';
import {
  getStoredAuth,
  mapListConversationsApiRowToSummary,
  mapListUsersApiRowToChatUser,
} from '../../communication/context/communicationContextHelpers';
import { useDrive } from '../context/DriveContext';
import { buildFolderTreeOptions, copyTextToClipboard } from '../components/DriveDestinationPicker';
import type {
  DriveEntry,
  DriveEntryType,
  DriveFile,
  DriveFolder,
  DriveFolderStorageMode,
  DriveFolderVisibility,
} from '../types';

type ToastState = {
  message: string;
  type: 'success' | 'error';
} | null;

// Encapsulates all Drive workspace state, derived selections, and CRUD
// handlers for folders, files, and entries. Consumes the DriveContext
// directly so the returned context can be spread straight into the view.
export function useDriveWorkspaceController() {
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
          description: entryType === 'text' ? entryDescription.trim() : '',
          linkUrl: entryType === 'link' ? entryLinkUrl.trim() : undefined,
          contentText: entryType === 'text' ? entryContentText.trim() : undefined,
        });
        setToast({ message: 'Saved item updated.', type: 'success' });
      } else {
        await createEntry({
          folderId: currentFolderId as string,
          entryType,
          title: entryTitle.trim(),
          description: entryType === 'text' ? entryDescription.trim() : '',
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

  async function handleCopyEntryLink(entry: DriveEntry) {
    const copied = await copyTextToClipboard(entry.linkUrl || '');
    setToast({
      message: copied ? 'Link copied to clipboard.' : 'Could not copy the link.',
      type: copied ? 'success' : 'error',
    });
    return copied;
  }

  return {
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
    renameFolderTarget,
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
    setEntryDialogMode,
    editingEntry,
    setEditingEntry,
    activeNoteEntryId,
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
    forwardFileIds,
    setForwardFileIds,
    forwardModalOpen,
    setForwardModalOpen,
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
  };
}
