const MAX_PREVIEW_TASKS = 25;
const LEADING_PHRASE_REGEX =
  /^(?:tomorrow\s+)?(?:(?:i|we)\s+)?(?:need|needs|have|has|plan|plans|want|wants|will|should|must|intend|aim)\s+to\s+/i;
const BULLET_PREFIX_REGEX =
  /^\s*(?:(?:[-*]|\u2022|\u25cf|\u25aa|\u25e6|\u2023)+|\d+[\).])\s+/u;

function normalizeWhitespace(value = ''): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeTaskTitle(value = ''): string {
  return normalizeWhitespace(value)
    .replace(/^[`"'([{]+/, '')
    .replace(/[`"')\]}.,;:!?]+$/, '')
    .toLowerCase();
}

function formatTaskTitle(value = ''): string {
  const cleaned = normalizeWhitespace(value);
  if (!cleaned) return '';
  return /^[a-z]/.test(cleaned) ? `${cleaned[0].toUpperCase()}${cleaned.slice(1)}` : cleaned;
}

function cleanTaskFragment(value = ''): string {
  return normalizeWhitespace(
    String(value || '')
      .replace(BULLET_PREFIX_REGEX, '')
      .replace(/\b(?:tomorrow|tmrw)\b[:,-]?\s*/gi, '')
      .replace(LEADING_PHRASE_REGEX, '')
      .replace(/^(?:and|then)\s+/i, '')
      .replace(/\s+(?:thanks|thank you)\s*$/i, '')
      .replace(/[.;]+$/g, ''),
  );
}

function pushUniqueTask(taskTitles: string[], seen: Set<string>, candidate: string) {
  const cleaned = cleanTaskFragment(candidate);
  if (!cleaned) return;
  const normalized = normalizeTaskTitle(cleaned);
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  taskTitles.push(formatTaskTitle(cleaned));
}

function splitSentenceIntoTasks(sentence = ''): string[] {
  const cleanedSentence = cleanTaskFragment(sentence);
  if (!cleanedSentence) return [];

  const protectedSentence = cleanedSentence.replace(/\band\/or\b/gi, ' and or ');
  const parts = protectedSentence
    .split(/\s*(?:,|;|\band\b|\bthen\b)\s+/i)
    .map((part) => cleanTaskFragment(part))
    .filter(Boolean);

  if (parts.length <= 1) return [cleanedSentence];

  const viableParts = parts.filter((part) => {
    const firstWord = String(part.split(/\s+/)[0] || '').toLowerCase();
    return firstWord && !['the', 'a', 'an', 'because', 'if', 'when'].includes(firstWord);
  });

  return viableParts.length >= 2 ? viableParts : [cleanedSentence];
}

export function extractReviewMatrixPreviewTasks(rawText = ''): string[] {
  const input = String(rawText || '').replace(/\u00a0/g, ' ').trim();
  if (!input) return [];

  const lines = input
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const taskTitles: string[] = [];
  const seen = new Set<string>();
  const listLikeLines = lines.filter((line) => BULLET_PREFIX_REGEX.test(line));

  if (listLikeLines.length) {
    lines.forEach((line) => {
      if (BULLET_PREFIX_REGEX.test(line)) {
        if (taskTitles.length < MAX_PREVIEW_TASKS) {
          pushUniqueTask(taskTitles, seen, line);
        }
        return;
      }

      splitSentenceIntoTasks(line).forEach((task) => {
        if (taskTitles.length < MAX_PREVIEW_TASKS) {
          pushUniqueTask(taskTitles, seen, task);
        }
      });
    });
    return taskTitles;
  }

  if (lines.length > 1) {
    lines.forEach((line) => {
      splitSentenceIntoTasks(line).forEach((task) => {
        if (taskTitles.length < MAX_PREVIEW_TASKS) {
          pushUniqueTask(taskTitles, seen, task);
        }
      });
    });
    return taskTitles;
  }

  const sentences = input
    .split(/[.!?\n]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  sentences.forEach((sentence) => {
    splitSentenceIntoTasks(sentence).forEach((task) => {
      if (taskTitles.length < MAX_PREVIEW_TASKS) {
        pushUniqueTask(taskTitles, seen, task);
      }
    });
  });

  return taskTitles;
}
