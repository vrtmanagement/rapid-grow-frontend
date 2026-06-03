let pendingContentDropFiles: File[] | null = null;

export function queueContentDropFiles(files: File[]) {
  if (!files.length) return;
  pendingContentDropFiles = files;
}

export function takeContentDropFiles() {
  const files = pendingContentDropFiles || [];
  pendingContentDropFiles = null;
  return files;
}
