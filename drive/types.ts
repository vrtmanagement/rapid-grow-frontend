export type DriveSortOption =
  | 'newest'
  | 'oldest'
  | 'name_asc'
  | 'name_desc'
  | 'size_desc'
  | 'size_asc';

export type DriveBreadcrumbItem = {
  id: string;
  name: string;
};

export type DriveFolderStorageMode = 'general' | 'images' | 'links' | 'text' | 'mixed';
export type DriveFolderVisibility = 'public' | 'private';

export type DriveFolder = {
  id: string;
  name: string;
  description: string;
  storageMode: DriveFolderStorageMode;
  visibility: DriveFolderVisibility;
  parentFolder: string | null;
  breadcrumb: DriveBreadcrumbItem[];
  depth: number;
  childFolderCount: number;
  fileCount: number;
  entryCount: number;
  linkCount: number;
  textCount: number;
  createdBy: {
    userId: string;
    empId: string;
    name: string;
    avatar?: string;
  } | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type DriveEntryType = 'link' | 'text';

export type DriveEntry = {
  id: string;
  itemKind: 'entry';
  entryType: DriveEntryType;
  title: string;
  description: string;
  linkUrl: string;
  contentText: string;
  folderId: string | null;
  folderName: string | null;
  folderBreadcrumb: DriveBreadcrumbItem[];
  uploadedBy: {
    userId: string;
    empId: string;
    name: string;
  } | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type DriveFile = {
  id: string;
  originalName: string;
  fileName: string;
  cloudinaryUrl: string;
  secureUrl: string;
  publicId: string;
  mimeType: string;
  resourceType: string;
  fileSize: number;
  fileCategory: string;
  extension: string;
  previewable: boolean;
  folderId: string | null;
  folderName: string | null;
  folderBreadcrumb: DriveBreadcrumbItem[];
  uploadedBy: {
    userId: string;
    empId: string;
    name: string;
  } | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  downloadUrl: string;
};

export type DriveListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
};

export type DriveUploadStatus = 'queued' | 'uploading' | 'success' | 'error' | 'cancelled';

export type DriveUploadItem = {
  id: string;
  file: File;
  progress: number;
  status: DriveUploadStatus;
  error?: string;
  uploadedFile?: DriveFile;
};
