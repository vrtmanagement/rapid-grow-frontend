import WordCleaner from 'word-paste-editor/cleaner';

export function normalizePlainTextPaste(value: string) {
  return String(value || '').replace(/\r\n?/g, '\n');
}

export function isGoogleDocsClipboardHtml(html: string) {
  return /docs-internal-guid|google-sheets-html-origin/i.test(html);
}

export function isOfficeLikeClipboardHtml(html: string) {
  return WordCleaner.isWordHTML(html) || isGoogleDocsClipboardHtml(html);
}

export function cleanClipboardHtml(html: string) {
  return WordCleaner.clean(html);
}

export function normalizeLooseListMarkup(value: string) {
  const lines = String(value || '').replace(/\r/g, '').split('\n');
  const output: string[] = [];
  let index = 0;

  const closeList = (type: 'ol' | 'ul', items: string[]) => {
    if (items.length) output.push(`<${type}>${items.map((item) => `<li>${item.trim()}</li>`).join('')}</${type}>`);
  };

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    const numberMarker = trimmed.match(/^(\d+)[.)]?$/);
    const numberInline = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    const bulletMarker = /^[•·*-]$/.test(trimmed);
    const bulletInline = trimmed.match(/^[•·*-]\s+(.+)$/);

    if (numberMarker || numberInline || bulletMarker || bulletInline) {
      const type: 'ol' | 'ul' = numberMarker || numberInline ? 'ol' : 'ul';
      const items: string[] = [];

      while (index < lines.length) {
        const current = lines[index].trim();
        const currentNumberMarker = current.match(/^(\d+)[.)]?$/);
        const currentNumberInline = current.match(/^(\d+)[.)]\s+(.+)$/);
        const currentBulletMarker = /^[•·*-]$/.test(current);
        const currentBulletInline = current.match(/^[•·*-]\s+(.+)$/);
        const isSameType =
          type === 'ol'
            ? Boolean(currentNumberMarker || currentNumberInline)
            : Boolean(currentBulletMarker || currentBulletInline);

        if (!isSameType) break;

        if (currentNumberInline || currentBulletInline) {
          items.push((currentNumberInline?.[2] || currentBulletInline?.[1] || '').trim());
          index += 1;
          continue;
        }

        let nextIndex = index + 1;
        while (nextIndex < lines.length && !lines[nextIndex].trim()) nextIndex += 1;
        const nextText = lines[nextIndex]?.trim() || '';
        if (!nextText) break;

        items.push(nextText);
        index = nextIndex + 1;
      }

      closeList(type, items);
      continue;
    }

    output.push(line);
    index += 1;
  }

  return output.join('\n');
}

export function prepareClipboardPasteForDescription(
  clipboardData: DataTransfer,
  convertHtmlToDescription: (html: string) => string,
) {
  const plainText = normalizePlainTextPaste(clipboardData.getData('text/plain'));
  const rawHtml = clipboardData.getData('text/html').trim();
  const fromOfficeLikeSource = rawHtml ? isOfficeLikeClipboardHtml(rawHtml) : false;

  // Word and Google Docs put messy HTML on the clipboard (hidden list numbers, mso-* styles).
  // Plain text matches what Notepad shows and is what users expect when copying from a doc.
  if (fromOfficeLikeSource && plainText.trim()) {
    return plainText;
  }

  if (rawHtml) {
    const cleanedHtml = cleanClipboardHtml(rawHtml);
    if (cleanedHtml) {
      const fromHtml = convertHtmlToDescription(cleanedHtml).trim();
      if (fromHtml) return fromHtml;
    }
  }

  if (plainText.trim()) {
    return normalizeLooseListMarkup(plainText);
  }

  return '';
}
