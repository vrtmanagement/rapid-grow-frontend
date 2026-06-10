import React, {
  createContext,
  startTransition,
  useContext,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { getReadableError } from '../../services/apiClient';
import { invalidateApiCache } from '../../services/apiCache';
import { getSocket } from '../../realtime/socket';
import { useDebounce } from '../../hooks/useDebounce';
import {
  apiCreateDriveEntry,
  apiCreateDriveFolder,
  apiDeleteDriveEntry,
  apiDeleteDriveFile,
  apiDeleteDriveFolder,
  apiDownloadDriveFile,
  apiGetDriveFolder,
  apiListDriveEntries,
  apiListDriveFiles,
  apiListDriveFolders,
  apiMoveDriveEntry,
  apiMoveDriveFile,
  apiMoveDriveFolder,
  apiRenameDriveFile,
  apiUpdateDriveEntry,
  apiUpdateDriveFolder,
} from '../services/driveApi';
import type { DriveEntry, DriveEntryType, DriveFile, DriveFolder, DriveSortOption } from '../types';

type DriveContextValue = {
  currentFolderId: string | null;
  currentFolder: DriveFolder | null;
  folders: DriveFolder[];
  files: DriveFile[];
  entries: DriveEntry[];
  treeFolders: DriveFolder[];
  searchInput: string;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;
  sort: DriveSortOption;
  setSort: React.Dispatch<React.SetStateAction<DriveSortOption>>;
  loading: boolean;
  foldersLoading: boolean;
  filesLoading: boolean;
  entriesLoading: boolean;
  treeLoading: boolean;
  error: string | null;
  folderPage: number;
  folderHasMore: boolean;
  filePage: number;
  fileHasMore: boolean;
  openFolder: (folderId: string | null) => void;
  loadMoreFolders: () => Promise<void>;
  loadMoreFiles: () => Promise<void>;
  refresh: (force?: boolean) => Promise<void>;
  createFolder: (payload: {
    name: string;
    description?: string;
    storageMode?: DriveFolder['storageMode'];
    parentFolder?: string | null;
  }) => Promise<DriveFolder>;
  renameFolder: (
    folderId: string,
    payload: { name?: string; description?: string; storageMode?: DriveFolder['storageMode'] },
  ) => Promise<DriveFolder>;
  moveFolder: (payload: { folderId: string; parentFolder?: string | null }) => Promise<DriveFolder>;
  deleteFolder: (folderId: string) => Promise<{
    success: boolean;
    folderId: string;
    deletedFolderCount: number;
    deletedFileCount: number;
  }>;
  renameFile: (fileId: string, fileName: string) => Promise<DriveFile>;
  moveFile: (payload: { fileId: string; folderId?: string | null }) => Promise<DriveFile>;
  deleteFile: (fileId: string) => Promise<{ success: boolean; file: { id: string; fileName: string; folderId: string | null } }>;
  downloadFile: (file: DriveFile) => Promise<void>;
  createEntry: (payload: {
    folderId: string;
    entryType: DriveEntryType;
    title: string;
    description?: string;
    linkUrl?: string;
    contentText?: string;
  }) => Promise<DriveEntry>;
  updateEntry: (
    entryId: string,
    payload: { title?: string; description?: string; linkUrl?: string; contentText?: string },
  ) => Promise<DriveEntry>;
  moveEntry: (payload: { entryId: string; folderId: string }) => Promise<DriveEntry>;
  deleteEntry: (entryId: string) => Promise<{ success: boolean; entry: { id: string; title?: string; folderId: string | null } }>;
};

const DriveContext = createContext<DriveContextValue | undefined>(undefined);

function mergeItemsById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();
  items.forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

export function DriveProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFolderId = (() => {
    const value = String(searchParams.get('folder') || '').trim();
    return value || null;
  })();

  const [currentFolder, setCurrentFolder] = useState<DriveFolder | null>(null);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [entries, setEntries] = useState<DriveEntry[]>([]);
  const [treeFolders, setTreeFolders] = useState<DriveFolder[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const search = useDebounce(deferredSearch, 250);
  const [sort, setSort] = useState<DriveSortOption>('newest');
  const [loading, setLoading] = useState(true);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderPage, setFolderPage] = useState(1);
  const [folderHasMore, setFolderHasMore] = useState(false);
  const [filePage, setFilePage] = useState(1);
  const [fileHasMore, setFileHasMore] = useState(false);

  const foldersRequestIdRef = useRef(0);
  const filesRequestIdRef = useRef(0);
  const entriesRequestIdRef = useRef(0);
  const treeRequestIdRef = useRef(0);
  const folderDetailsRequestIdRef = useRef(0);

  function openFolder(folderId: string | null) {
    const next = new URLSearchParams(searchParams);
    if (folderId) next.set('folder', folderId);
    else next.delete('folder');
    setSearchParams(next);
  }

  async function loadCurrentFolder() {
    if (!currentFolderId) {
      startTransition(() => setCurrentFolder(null));
      return;
    }

    const requestId = folderDetailsRequestIdRef.current + 1;
    folderDetailsRequestIdRef.current = requestId;

    try {
      const response = await apiGetDriveFolder(currentFolderId);
      if (requestId !== folderDetailsRequestIdRef.current) return;
      startTransition(() => setCurrentFolder(response.folder));
    } catch (nextError) {
      if (requestId !== folderDetailsRequestIdRef.current) return;
      startTransition(() => {
        setCurrentFolder(null);
        setError(getReadableError(nextError, 'Failed to load folder'));
      });
    }
  }

  async function loadFolderTree() {
    const requestId = treeRequestIdRef.current + 1;
    treeRequestIdRef.current = requestId;
    setTreeLoading(true);

    try {
      const aggregatedItems: DriveFolder[] = [];
      let nextPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await apiListDriveFolders({
          parentFolder: null,
          sort: 'name_asc',
          scope: 'tree',
          page: nextPage,
          limit: 100,
        });
        aggregatedItems.push(...response.items);
        hasMore = response.hasMore;
        nextPage = response.page + 1;
      }

      if (requestId !== treeRequestIdRef.current) return;
      startTransition(() => setTreeFolders(mergeItemsById(aggregatedItems)));
    } catch (nextError) {
      if (requestId !== treeRequestIdRef.current) return;
      startTransition(() => setError(getReadableError(nextError, 'Failed to load folder tree')));
    } finally {
      if (requestId === treeRequestIdRef.current) {
        setTreeLoading(false);
      }
    }
  }

  async function loadFolders(page = 1, append = false) {
    const requestId = foldersRequestIdRef.current + 1;
    foldersRequestIdRef.current = requestId;
    setFoldersLoading(true);

    try {
      const response = await apiListDriveFolders({
        parentFolder: currentFolderId,
        search,
        sort,
        page,
        limit: 24,
      });
      if (requestId !== foldersRequestIdRef.current) return;
      startTransition(() => {
        setFolders((prev) => (append ? mergeItemsById([...prev, ...response.items]) : response.items));
        setFolderPage(response.page);
        setFolderHasMore(response.hasMore);
      });
    } catch (nextError) {
      if (requestId !== foldersRequestIdRef.current) return;
      startTransition(() => setError(getReadableError(nextError, 'Failed to load folders')));
    } finally {
      if (requestId === foldersRequestIdRef.current) {
        setFoldersLoading(false);
      }
    }
  }

  async function loadFiles(page = 1, append = false) {
    const requestId = filesRequestIdRef.current + 1;
    filesRequestIdRef.current = requestId;
    setFilesLoading(true);

    try {
      const response = await apiListDriveFiles({
        folderId: currentFolderId,
        search,
        sort,
        page,
        limit: 24,
      });
      if (requestId !== filesRequestIdRef.current) return;
      startTransition(() => {
        setFiles((prev) => (append ? mergeItemsById([...prev, ...response.items]) : response.items));
        setFilePage(response.page);
        setFileHasMore(response.hasMore);
      });
    } catch (nextError) {
      if (requestId !== filesRequestIdRef.current) return;
      startTransition(() => setError(getReadableError(nextError, 'Failed to load files')));
    } finally {
      if (requestId === filesRequestIdRef.current) {
        setFilesLoading(false);
      }
    }
  }

  async function loadEntries() {
    if (!currentFolderId) {
      startTransition(() => setEntries([]));
      return;
    }

    const requestId = entriesRequestIdRef.current + 1;
    entriesRequestIdRef.current = requestId;
    setEntriesLoading(true);

    try {
      const response = await apiListDriveEntries({
        folderId: currentFolderId,
        search,
        sort,
        page: 1,
        limit: 100,
      });
      if (requestId !== entriesRequestIdRef.current) return;
      startTransition(() => setEntries(response.items));
    } catch (nextError) {
      if (requestId !== entriesRequestIdRef.current) return;
      startTransition(() => setError(getReadableError(nextError, 'Failed to load entries')));
    } finally {
      if (requestId === entriesRequestIdRef.current) {
        setEntriesLoading(false);
      }
    }
  }

  async function refresh(force = false) {
    if (force) {
      invalidateApiCache('/drive');
    }
    setLoading(true);
    setError(null);
    await Promise.all([loadCurrentFolder(), loadFolderTree(), loadFolders(1, false), loadFiles(1, false), loadEntries()]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh(false);
  }, [currentFolderId, search, sort]);

  const handleDriveRealtime = useEffectEvent(() => {
    void refresh(true);
  });

  useEffect(() => {
    const socket = getSocket();
    const events = [
      'drive:folder:created',
      'drive:folder:updated',
      'drive:folder:deleted',
      'drive:folder:moved',
      'drive:file:uploaded',
      'drive:file:updated',
      'drive:file:deleted',
      'drive:file:moved',
      'drive:entry:created',
      'drive:entry:updated',
      'drive:entry:deleted',
      'drive:entry:moved',
    ] as const;

    events.forEach((eventName) => socket.on(eventName, handleDriveRealtime));

    return () => {
      events.forEach((eventName) => socket.off(eventName, handleDriveRealtime));
    };
  }, []);

  async function loadMoreFolders() {
    if (foldersLoading || !folderHasMore) return;
    await loadFolders(folderPage + 1, true);
  }

  async function loadMoreFiles() {
    if (filesLoading || !fileHasMore) return;
    await loadFiles(filePage + 1, true);
  }

  async function createFolderAction(payload: {
    name: string;
    description?: string;
    storageMode?: DriveFolder['storageMode'];
    parentFolder?: string | null;
  }) {
    const response = await apiCreateDriveFolder(payload);
    await refresh(true);
    return response.folder;
  }

  async function renameFolderAction(
    folderId: string,
    payload: { name?: string; description?: string; storageMode?: DriveFolder['storageMode'] },
  ) {
    const response = await apiUpdateDriveFolder(folderId, payload);
    await refresh(true);
    return response.folder;
  }

  async function moveFolderAction(payload: { folderId: string; parentFolder?: string | null }) {
    const response = await apiMoveDriveFolder(payload);
    await refresh(true);
    return response.folder;
  }

  async function deleteFolderAction(folderId: string) {
    const response = await apiDeleteDriveFolder(folderId);
    if (folderId === currentFolderId) {
      openFolder(currentFolder?.parentFolder || null);
    } else {
      await refresh(true);
    }
    return response;
  }

  async function renameFileAction(fileId: string, fileName: string) {
    const response = await apiRenameDriveFile(fileId, { fileName });
    await refresh(true);
    return response.file;
  }

  async function moveFileAction(payload: { fileId: string; folderId?: string | null }) {
    const response = await apiMoveDriveFile(payload);
    await refresh(true);
    return response.file;
  }

  async function deleteFileAction(fileId: string) {
    const response = await apiDeleteDriveFile(fileId);
    await refresh(true);
    return response;
  }

  async function downloadFileAction(file: DriveFile) {
    await apiDownloadDriveFile(file.id, file.fileName || file.originalName);
  }

  async function createEntryAction(payload: {
    folderId: string;
    entryType: DriveEntryType;
    title: string;
    description?: string;
    linkUrl?: string;
    contentText?: string;
  }) {
    const response = await apiCreateDriveEntry(payload);
    await refresh(true);
    return response.entry;
  }

  async function updateEntryAction(
    entryId: string,
    payload: { title?: string; description?: string; linkUrl?: string; contentText?: string },
  ) {
    const response = await apiUpdateDriveEntry(entryId, payload);
    await refresh(true);
    return response.entry;
  }

  async function moveEntryAction(payload: { entryId: string; folderId: string }) {
    const response = await apiMoveDriveEntry(payload);
    await refresh(true);
    return response.entry;
  }

  async function deleteEntryAction(entryId: string) {
    const response = await apiDeleteDriveEntry(entryId);
    await refresh(true);
    return response;
  }

  return (
    <DriveContext.Provider
      value={{
        currentFolderId,
        currentFolder,
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
        treeLoading,
        error,
        folderPage,
        folderHasMore,
        filePage,
        fileHasMore,
        openFolder,
        loadMoreFolders,
        loadMoreFiles,
        refresh,
        createFolder: createFolderAction,
        renameFolder: renameFolderAction,
        moveFolder: moveFolderAction,
        deleteFolder: deleteFolderAction,
        renameFile: renameFileAction,
        moveFile: moveFileAction,
        deleteFile: deleteFileAction,
        downloadFile: downloadFileAction,
        createEntry: createEntryAction,
        updateEntry: updateEntryAction,
        moveEntry: moveEntryAction,
        deleteEntry: deleteEntryAction,
      }}
    >
      {children}
    </DriveContext.Provider>
  );
}

export function useDrive() {
  const context = useContext(DriveContext);
  if (!context) {
    throw new Error('useDrive must be used within DriveProvider');
  }
  return context;
}
