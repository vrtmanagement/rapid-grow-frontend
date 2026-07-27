import type { DriveFile, DriveFolder } from '../types';

export type ToastState = {
  message: string;
  type: 'success' | 'error';
} | null;

export function buildFolderTreeOptions(
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

export async function copyTextToClipboard(value: string): Promise<boolean> {
  if (!value) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall back for browsers without clipboard permissions support.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}
