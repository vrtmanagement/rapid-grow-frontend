export function getFilesFromDataTransfer(data: DataTransfer | null) {
  if (!data) return [];
  if (data.files?.length) {
    return Array.from(data.files).filter((file) => file.size > 0 || file.name.trim().length > 0);
  }
  const dropped: File[] = [];
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file) dropped.push(file);
  }
  return dropped;
}

export function toFileArray(files: FileList | File[] | null | undefined) {
  if (!files) return [];
  return Array.from(files);
}
