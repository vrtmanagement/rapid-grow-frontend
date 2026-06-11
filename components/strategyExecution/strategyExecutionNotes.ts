export interface NumberedNote {
  number: number;
  body: string;
}

export function parseNumberedNotes(existingNotes: string): NumberedNote[] {
  const trimmed = existingNotes?.trim() || '';
  if (!trimmed) return [];

  const headers = [...trimmed.matchAll(/^Note (\d+):/gm)];
  if (headers.length === 0) {
    return [{ number: 1, body: trimmed }];
  }

  return headers.map((match, index) => {
    const number = Number(match[1]);
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < headers.length ? (headers[index + 1].index ?? trimmed.length) : trimmed.length;
    const body = trimmed
      .slice(start, end)
      .trim()
      .replace(/^\n+/, '')
      .replace(/\n+$/, '');
    return { number, body };
  });
}

export function getNextNoteNumber(existingNotes: string): number {
  const parsed = parseNumberedNotes(existingNotes);
  if (!parsed.length) return 1;
  return Math.max(...parsed.map((note) => note.number)) + 1;
}

export function appendNumberedNote(existingNotes: string, newText: string): string {
  const body = newText.trim();
  if (!body) return existingNotes?.trim() || '';

  let normalized = existingNotes?.trim() || '';
  if (normalized && !/^Note \d+:/m.test(normalized)) {
    normalized = `Note 1: ${normalized}`;
  }

  const next = getNextNoteNumber(normalized);
  const entry = `Note ${next}: ${body}`;
  return normalized ? `${normalized}\n\n${entry}` : entry;
}

export function serializeNumberedNotes(notes: NumberedNote[]): string {
  return notes
    .filter((note) => note.body.trim())
    .map((note) => `Note ${note.number}: ${note.body.trim()}`)
    .join('\n\n');
}

export function updateNumberedNote(existingNotes: string, noteNumber: number, newBody: string): string {
  const parsed = parseNumberedNotes(existingNotes);
  const body = newBody.trim();
  if (!body) {
    return deleteNumberedNote(existingNotes, noteNumber);
  }
  return serializeNumberedNotes(
    parsed.map((note) => (note.number === noteNumber ? { ...note, body } : note))
  );
}

export function deleteNumberedNote(existingNotes: string, noteNumber: number): string {
  const parsed = parseNumberedNotes(existingNotes);
  return serializeNumberedNotes(parsed.filter((note) => note.number !== noteNumber));
}
