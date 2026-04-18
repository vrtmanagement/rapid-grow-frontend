export function formatStorageSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 1024 * 10 ? 1 : 0)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 * 10 ? 1 : 0)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatUsageSummary(sizeBytes: number, limitBytes: number): string {
  return `${formatStorageSize(sizeBytes)} / ${formatStorageSize(limitBytes)} used`;
}

export function getUsagePercent(sizeBytes: number, limitBytes: number): number {
  if (!Number.isFinite(limitBytes) || limitBytes <= 0) {
    return 0;
  }

  return Number(((sizeBytes / limitBytes) * 100).toFixed(1));
}

export function getAllocationPercent(sizeBytes: number, totalSizeBytes: number): number {
  if (!Number.isFinite(totalSizeBytes) || totalSizeBytes <= 0) {
    return 0;
  }

  return Number(((sizeBytes / totalSizeBytes) * 100).toFixed(1));
}

export function formatAllocationSummary(sizeBytes: number, totalSizeBytes: number): string {
  if (!Number.isFinite(totalSizeBytes) || totalSizeBytes <= 0) {
    return `${formatStorageSize(sizeBytes)} footprint`;
  }

  return `${formatStorageSize(sizeBytes)} of ${formatStorageSize(totalSizeBytes)} monitored`;
}

const COLLECTION_ALLOCATION_WEIGHTS: Record<string, number> = {
  messages: 15,
  contentItems: 12,
  performance: 10,
  reflections: 8,
  attendanceSessions: 8,
  spacesTasks: 8,
  goals: 7,
  projectCharters: 6,
  conversationUserStates: 5,
  uploadedFiles: 5,
  leaveRequests: 4,
  messageReceipts: 3,
  contentDrafts: 3,
  notifications: 2,
  feedback: 2,
  contentChannels: 1,
  spacesMeta: 1,
};

const DEFAULT_COLLECTION_ALLOCATION_WEIGHT = 2;

export function getCollectionAllocatedBytes(collectionKey: string, totalLimitBytes: number): number {
  if (!Number.isFinite(totalLimitBytes) || totalLimitBytes <= 0) {
    return 0;
  }

  const weight = COLLECTION_ALLOCATION_WEIGHTS[collectionKey] ?? DEFAULT_COLLECTION_ALLOCATION_WEIGHT;
  return Math.round((totalLimitBytes * weight) / 100);
}

export function getAllocatedUsagePercent(sizeBytes: number, allocatedBytes: number): number {
  if (!Number.isFinite(allocatedBytes) || allocatedBytes <= 0) {
    return 0;
  }

  return Number(((sizeBytes / allocatedBytes) * 100).toFixed(1));
}

export function formatAllocatedUsageSummary(sizeBytes: number, allocatedBytes: number): string {
  if (!Number.isFinite(allocatedBytes) || allocatedBytes <= 0) {
    return `${formatStorageSize(sizeBytes)} used`;
  }

  return `${formatStorageSize(sizeBytes)} / ${formatStorageSize(allocatedBytes)} allocated`;
}

export function getUsageTone(percent: number): 'normal' | 'warning' | 'danger' {
  if (percent >= 90) return 'danger';
  if (percent >= 80) return 'warning';
  return 'normal';
}

export function getAllocationTone(percent: number): 'normal' | 'warning' | 'danger' {
  if (percent >= 45) return 'danger';
  if (percent >= 25) return 'warning';
  return 'normal';
}

export function getAllocatedUsageTone(percent: number): 'normal' | 'warning' | 'danger' {
  if (percent >= 100) return 'danger';
  if (percent >= 80) return 'warning';
  return 'normal';
}
