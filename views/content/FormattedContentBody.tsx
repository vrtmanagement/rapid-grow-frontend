import React from 'react';

function escapeContentHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPlainDescriptionTokens(text: string, keyPrefix: string) {
  const value = String(text || '');
  const tokenRegex = /(https?:\/\/\S+|#[^\s#]+)/gi;
  const fragments: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      fragments.push(<React.Fragment key={`${keyPrefix}-plain-${matchIndex}`}>{value.slice(lastIndex, match.index)}</React.Fragment>);
    }

    const token = match[0];
    if (/^https?:\/\/\S+$/i.test(token)) {
      fragments.push(
        <a
          key={`${keyPrefix}-link-${matchIndex}`}
          href={token}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          {token}
        </a>,
      );
    } else if (/^#[^\s#]+$/.test(token)) {
      fragments.push(
        <strong key={`${keyPrefix}-hash-${matchIndex}`} className="font-semibold text-slate-800">
          {token}
        </strong>,
      );
    }

    lastIndex = tokenRegex.lastIndex;
    matchIndex += 1;
  }

  if (lastIndex < value.length) {
    fragments.push(<React.Fragment key={`${keyPrefix}-plain-tail`}>{value.slice(lastIndex)}</React.Fragment>);
  }

  return fragments;
}

function normalizeLooseListTextToHtml(value: string) {
  const lines = String(value || '').replace(/\r/g, '').split('\n');
  const output: string[] = [];
  let index = 0;

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
          items.push(currentNumberInline?.[2] || currentBulletInline?.[1] || '');
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

      if (items.length) {
        output.push(`<${type}>${items.map((item) => `<li>${escapeContentHtml(item.trim())}</li>`).join('')}</${type}>`);
        continue;
      }
    }

    output.push(escapeContentHtml(line));
    index += 1;
  }

  return output.join('<br>');
}

function flattenListItemBlockElements(root: HTMLElement) {
  root.querySelectorAll('li').forEach((item) => {
    Array.from(item.children).forEach((child) => {
      const tag = child.tagName.toLowerCase();
      if (tag !== 'div' && tag !== 'p') return;
      while (child.firstChild) {
        item.insertBefore(child.firstChild, child);
      }
      child.remove();
    });

    while (
      item.firstChild &&
      (
        (item.firstChild.nodeType === Node.TEXT_NODE && !(item.firstChild.textContent || '').trim()) ||
        (item.firstChild.nodeType === Node.ELEMENT_NODE && (item.firstChild as HTMLElement).tagName.toLowerCase() === 'br')
      )
    ) {
      item.firstChild.remove();
    }
  });
}

function renderRichDescriptionNode(node: ChildNode, key: string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return <React.Fragment key={key}>{renderPlainDescriptionTokens(node.textContent || '', key)}</React.Fragment>;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map((child, index) => renderRichDescriptionNode(child, `${key}-${index}`));
  const inlineChildren = Array.from(element.childNodes)
    .flatMap((child, index) => {
      if (child.nodeType === Node.ELEMENT_NODE && ['p', 'div'].includes((child as HTMLElement).tagName.toLowerCase())) {
        const nested = Array.from(child.childNodes).map((nestedChild, nestedIndex) => renderRichDescriptionNode(nestedChild, `${key}-${index}-${nestedIndex}`));
        return index === 0 ? nested : [<React.Fragment key={`${key}-${index}-space`}> </React.Fragment>, ...nested];
      }
      return [renderRichDescriptionNode(child, `${key}-${index}`)];
    });

  if (tag === 'br') return <br key={key} />;
  if (tag === 'strong' || tag === 'b') return <strong key={key} className="font-semibold text-slate-800">{children}</strong>;
  if (tag === 'em' || tag === 'i') return <em key={key} className="italic text-slate-700">{children}</em>;
  if (tag === 'u') return <span key={key} className="underline decoration-1 underline-offset-2">{children}</span>;
  if (tag === 'a') {
    const href = String(element.getAttribute('href') || '').trim();
    if (!/^https?:\/\//i.test(href)) return <React.Fragment key={key}>{children}</React.Fragment>;
    return <a key={key} href={href} target="_blank" rel="noreferrer" className="text-blue-600 underline">{children}</a>;
  }
  if (tag === 'ul') return <ul key={key} className="my-2 list-disc space-y-0.5 pl-5">{children}</ul>;
  if (tag === 'ol') return <ol key={key} className="my-2 list-decimal space-y-0.5 pl-5">{children}</ol>;
  if (tag === 'li') return <li key={key}>{inlineChildren}</li>;
  if (tag === 'h1') return <h1 key={key} className="mb-2 mt-3 text-2xl font-semibold text-slate-900">{children}</h1>;
  if (tag === 'h2') return <h2 key={key} className="mb-2 mt-3 text-xl font-semibold text-slate-900">{children}</h2>;
  if (tag === 'h3') return <h3 key={key} className="mb-1.5 mt-2.5 text-lg font-semibold text-slate-900">{children}</h3>;
  if (tag === 'h4') return <h4 key={key} className="mb-1.5 mt-2 text-base font-semibold text-slate-900">{children}</h4>;
  if (tag === 'p' || tag === 'div') return <p key={key} className="mb-2 last:mb-0">{children}</p>;

  return <React.Fragment key={key}>{children}</React.Fragment>;
}

function renderStyledDescription(text: string) {
  const value = String(text || '');
  if (!value.trim()) return 'No description';
  const renderValue = /(^|\n)\s*(?:\d+[.)]?|[•·*-])\s*(?:\n|$)/.test(value)
    ? normalizeLooseListTextToHtml(value)
    : value;

  if (/<\/?(?:strong|b|em|i|u|a|ul|ol|li|h[1-4]|p|div|br)\b/i.test(renderValue) && typeof document !== 'undefined') {
    const root = document.createElement('div');
    root.innerHTML = renderValue;
    flattenListItemBlockElements(root);
    return Array.from(root.childNodes).map((node, index) => renderRichDescriptionNode(node, `rich-${index}`));
  }

  return renderPlainDescriptionTokens(renderValue, 'plain');
}

function richDescriptionNodeToPlainText(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const childText = () => Array.from(element.childNodes).map(richDescriptionNodeToPlainText).join('');

  if (tag === 'br') return '\n';
  if (tag === 'ul') {
    return Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === 'li')
      .map((child) => `• ${richDescriptionNodeToPlainText(child).trim()}`)
      .join('\n');
  }
  if (tag === 'ol') {
    return Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === 'li')
      .map((child, index) => `${index + 1}. ${richDescriptionNodeToPlainText(child).trim()}`)
      .join('\n');
  }
  if (tag === 'li') return childText();
  if (tag === 'p' || tag === 'div' || /^h[1-4]$/.test(tag)) return `${childText().trim()}\n`;

  return childText();
}

function richDescriptionToPlainText(text: string) {
  const value = String(text || '');
  if (!value.trim()) return '';
  const copyValue = /(^|\n)\s*(?:\d+[.)]?|[•·*-])\s*(?:\n|$)/.test(value)
    ? normalizeLooseListTextToHtml(value)
    : value;

  if (/<\/?(?:strong|b|em|i|u|a|ul|ol|li|h[1-4]|p|div|br)\b/i.test(copyValue) && typeof document !== 'undefined') {
    const root = document.createElement('div');
    root.innerHTML = copyValue;
    flattenListItemBlockElements(root);
    return Array.from(root.childNodes)
      .map(richDescriptionNodeToPlainText)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return value;
}

function richDescriptionToClipboardHtml(text: string) {
  const value = String(text || '');
  const copyValue = /(^|\n)\s*(?:\d+[.)]?|[•·*-])\s*(?:\n|$)/.test(value)
    ? normalizeLooseListTextToHtml(value)
    : value;
  if (/<\/?(?:strong|b|em|i|u|a|ul|ol|li|h[1-4]|p|div|br)\b/i.test(copyValue)) {
    if (typeof document === 'undefined') return copyValue;
    const root = document.createElement('div');
    root.innerHTML = copyValue;
    flattenListItemBlockElements(root);
    return root.innerHTML;
  }
  return escapeContentHtml(copyValue).replace(/\r\n?/g, '\n').replace(/\n/g, '<br>');
}

export function FormattedContentBody({ text, compact = false, clampLines, flat = false }: { text: string; compact?: boolean; clampLines?: number; flat?: boolean }) {
  const hasValue = String(text || '').trim().length > 0;
  const handleCopy = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (!hasValue) return;
    event.preventDefault();
    event.clipboardData.setData('text/plain', richDescriptionToPlainText(text));
    event.clipboardData.setData('text/html', richDescriptionToClipboardHtml(text));
  };

  return (
    <div className={`mt-3 overflow-hidden rounded-[1.5rem] ${flat ? 'border border-slate-200/80 bg-slate-50/65' : 'border border-white/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 shadow-[0_16px_40px_rgba(15,23,42,0.08)]'} ${compact ? 'p-3' : 'p-4'}`}>
      <div
        onCopy={handleCopy}
        className={`whitespace-pre-wrap break-words text-slate-700 ${compact ? 'text-sm leading-6' : 'text-[15px] leading-7'}`}
        style={clampLines ? {
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: clampLines,
          overflow: 'hidden',
        } : undefined}
      >
        {hasValue ? renderStyledDescription(text) : 'No description'}
      </div>
    </div>
  );
}
