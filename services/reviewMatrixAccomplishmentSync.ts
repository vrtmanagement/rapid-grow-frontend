export type DailyCompletedTaskSyncItem = {
  taskId: string;
  title: string;
  completedAt?: string | null;
  status?: string;
  activityLabel?: string;
  syncSource?: string;
};

const BULLET_PREFIX_REGEX =
  /^\s*(?:(?:[-*]|\u2022|\u25cf|\u25aa|\u25e6|\u2023)+|\d+[\).])\s+/u;

function normalizeWhitespace(value = ''): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeComparableText(value = ''): string {
  return normalizeWhitespace(value)
    .replace(BULLET_PREFIX_REGEX, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .toLowerCase();
}

function tokenizeComparableText(value = ''): string[] {
  return normalizeComparableText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseLines(text = ''): string[] {
  return String(text || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function toBulletLine(value = ''): string {
  const cleaned = normalizeWhitespace(String(value || '').replace(BULLET_PREFIX_REGEX, ''));
  return cleaned ? `• ${cleaned}` : '';
}

function lineMatchesTask(line = '', taskTitle = ''): boolean {
  const normalizedLine = normalizeComparableText(line);
  const normalizedTaskTitle = normalizeComparableText(taskTitle);
  if (!normalizedLine || !normalizedTaskTitle) return false;
  if (normalizedLine === normalizedTaskTitle) return true;
  if (normalizedLine.includes(normalizedTaskTitle) || normalizedTaskTitle.includes(normalizedLine)) return true;

  const lineTokens = new Set(tokenizeComparableText(line));
  const titleTokens = tokenizeComparableText(taskTitle);
  if (!lineTokens.size || !titleTokens.length) return false;
  return titleTokens.every((token) => lineTokens.has(token));
}

function dedupeLines(lines: string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();

  lines.forEach((line) => {
    const normalized = normalizeComparableText(line);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    unique.push(line);
  });

  return unique;
}

export function getDismissedTaskIdsFromText(
  text: string,
  tasks: DailyCompletedTaskSyncItem[],
  priorDismissedTaskIds: string[] = [],
): string[] {
  const lines = parseLines(text);
  const dismissed = new Set(
    (Array.isArray(priorDismissedTaskIds) ? priorDismissedTaskIds : [])
      .map((taskId) => String(taskId || '').trim())
      .filter(Boolean),
  );

  (Array.isArray(tasks) ? tasks : []).forEach((task) => {
    const taskId = String(task.taskId || '').trim();
    const title = String(task.title || '').trim();
    if (!taskId || !title) return;

    const present = lines.some((line) => lineMatchesTask(line, title));
    if (present) {
      dismissed.delete(taskId);
    } else {
      dismissed.add(taskId);
    }
  });

  return Array.from(dismissed);
}

export function getImportedTaskIdsFromText(
  text: string,
  tasks: DailyCompletedTaskSyncItem[],
  dismissedTaskIds: string[] = [],
): string[] {
  const lines = parseLines(text);
  const dismissed = new Set(
    (Array.isArray(dismissedTaskIds) ? dismissedTaskIds : [])
      .map((taskId) => String(taskId || '').trim())
      .filter(Boolean),
  );

  return (Array.isArray(tasks) ? tasks : [])
    .filter((task) => {
      const taskId = String(task.taskId || '').trim();
      if (!taskId || dismissed.has(taskId)) return false;
      return lines.some((line) => lineMatchesTask(line, task.title));
    })
    .map((task) => String(task.taskId || '').trim())
    .filter(Boolean);
}

export function mergeAccomplishmentText({
  currentText,
  tasks,
  dismissedTaskIds = [],
}: {
  currentText: string;
  tasks: DailyCompletedTaskSyncItem[];
  dismissedTaskIds?: string[];
}): string {
  const lines = parseLines(currentText);
  const activeTasks = (Array.isArray(tasks) ? tasks : []).filter((task) => {
    const taskId = String(task.taskId || '').trim();
    return taskId && !dismissedTaskIds.includes(taskId);
  });
  const usedLineIndexes = new Set<number>();

  const importedLines = activeTasks.map((task) => {
    const matchIndex = lines.findIndex((line, index) => {
      if (usedLineIndexes.has(index)) return false;
      return lineMatchesTask(line, task.title);
    });

    if (matchIndex !== -1) {
      usedLineIndexes.add(matchIndex);
      return toBulletLine(lines[matchIndex]);
    }

    return toBulletLine(task.title);
  });

  const manualLines = lines
    .filter((_line, index) => !usedLineIndexes.has(index))
    .map((line) => toBulletLine(line))
    .filter(Boolean);

  return dedupeLines([...importedLines, ...manualLines]).join('\n');
}
