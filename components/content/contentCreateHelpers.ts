import { FileText, Globe, Linkedin, Mail, Sparkles } from 'lucide-react';
import { ContentAsset, ContentType } from '../../services/contentApi';
import { normalizeLooseListMarkup } from '../../utils/clipboardPaste';

export const LINK_STORAGE_KEY = 'rapidgrow-content-links-v1';
export const TAG_STORAGE_KEY = 'rapidgrow-content-tags-v1';
export const CONTENT_CREATE_DRAFT_STORAGE_PREFIX = 'rapidgrow-content-create-draft-v1';

export function getInitialDate(search: string) {
  const value = new URLSearchParams(search).get('date') || '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
}

export function getMode(search: string) {
  const mode = new URLSearchParams(search).get('mode') || 'calendar';
  if (mode === 'follow-ee' || mode === 'follow-ega' || mode === 'blog') return mode;
  return 'calendar';
}

export function getEditContentId(search: string) {
  const value = String(new URLSearchParams(search).get('editId') || '').trim();
  return value || null;
}

export function readStringList(storageKey: string, fallback: string[]) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const cleaned = parsed.map((entry) => String(entry || '').trim()).filter(Boolean);
    return cleaned.length ? cleaned : fallback;
  } catch {
    return fallback;
  }
}

export function extractStyledTokens(text: string) {
  const parts = String(text || '').split(/\s+/).filter(Boolean);
  return parts.filter((part) => /^https?:\/\/\S+$/i.test(part) || /^#[^\s#]+$/.test(part));
}

export type FieldErrors = {
  title?: string;
  description?: string;
  contentDate?: string;
  newLinkValue?: string;
  newTagValue?: string;
};

export const CONTENT_TYPE_OPTIONS = [
  {
    value: 'general' as ContentType,
    label: 'General',
    description: 'General updates and flexible notes',
    icon: FileText,
    accent: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
  },
  {
    value: 'linkedin' as ContentType,
    label: 'LinkedIn',
    description: 'Professional social publishing',
    icon: Linkedin,
    accent: 'border-sky-200 bg-sky-50/80 text-sky-700',
  },
  {
    value: 'youtube' as ContentType,
    label: 'YouTube',
    description: 'Video titles and publish copy',
    icon: Sparkles,
    accent: 'border-rose-200 bg-rose-50/80 text-rose-700',
  },
  {
    value: 'newsletter' as ContentType,
    label: 'Mail',
    description: 'Email and newsletter content',
    icon: Mail,
    accent: 'border-amber-200 bg-amber-50/80 text-amber-700',
  },
  {
    value: 'website' as ContentType,
    label: 'Website',
    description: 'Landing pages and site updates',
    icon: Globe,
    accent: 'border-indigo-200 bg-indigo-50/80 text-indigo-700',
  },
];

export function validateTitle(value: string) {
  const clean = value.trim();
  if (!clean) return 'Title is required.';
  if (clean.length < 3) return 'Use at least 3 characters for the title.';
  if (clean.length > 120) return 'Keep the title under 120 characters.';
  return '';
}

export function validateDescription(value: string) {
  const clean = value.trim();
  if (!clean) return 'Description is required.';
  if (clean.length < 8) return 'Add a little more detail to the description.';
  return '';
}

export function validateContentDate(value: string) {
  if (!value) return 'Date is required.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Choose a valid date.';
  return '';
}

export function validateLinkValue(value: string) {
  const clean = value.trim();
  if (!clean) return 'Link cannot be empty.';
  if (!/^https?:\/\/\S+$/i.test(clean)) return 'Use a full link starting with http:// or https://';
  return '';
}

export function validateTagValue(value: string) {
  const clean = value.trim();
  if (!clean) return 'Hashtag cannot be empty.';
  const normalized = clean.startsWith('#') ? clean : `#${clean}`;
  if (!/^#[A-Za-z0-9_]+$/.test(normalized)) return 'Use letters, numbers, or underscores only.';
  return '';
}

export function parseDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateDisplay(value: string) {
  const date = parseDateValue(value);
  if (!date) return 'Select publish date';
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(value);
}

export function hasNonEmptyDraft(payload: { title: string; description: string; attachments: ContentAsset[] }) {
  return Boolean(
    payload.title.trim() ||
    payload.description.trim() ||
    (payload.attachments && payload.attachments.length > 0)
  );
}

export function getCalendarDays(viewDate: Date) {
  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startWeekday = startOfMonth.getDay();
  const gridStart = new Date(startOfMonth);
  gridStart.setDate(startOfMonth.getDate() - startWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return {
      key: `${year}-${month}-${day}`,
      label: date.getDate(),
      inMonth: date.getMonth() === viewDate.getMonth(),
      isToday: date.toDateString() === new Date().toDateString(),
    };
  });
}

export function escapeRichTextHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeAllowedInlineHtml(value: string) {
  return value
    .replace(/&lt;(\/?)(?:b|strong)&gt;/gi, '<$1strong>')
    .replace(/&lt;(\/?)(?:i|em)&gt;/gi, '<$1em>')
    .replace(/&lt;(\/?)u&gt;/gi, '<$1u>')
    .replace(/&lt;(\/?)p&gt;/gi, '<$1p>')
    .replace(/&lt;(\/?)div&gt;/gi, '<$1div>')
    .replace(/&lt;(\/?)ul&gt;/gi, '<$1ul>')
    .replace(/&lt;(\/?)ol&gt;/gi, '<$1ol>')
    .replace(/&lt;(\/?)li&gt;/gi, '<$1li>')
    .replace(/&lt;(\/?)h([1-4])&gt;/gi, '<$1h$2>')
    .replace(/&lt;a href=&quot;(https?:\/\/[^&<>\s]+)&quot;&gt;/gi, '<a href="$1">')
    .replace(/&lt;a href=&#39;(https?:\/\/[^&<>\s]+)&#39;&gt;/gi, '<a href="$1">')
    .replace(/&lt;\/a&gt;/gi, '</a>')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
}

export function descriptionToEditorHtml(value: string) {
  return normalizeAllowedInlineHtml(escapeRichTextHtml(value).replace(/\r\n?/g, '\n')).replace(/\n/g, '<br>');
}

export function flattenListItemBlocks(value: string) {
  const root = document.createElement('div');
  root.innerHTML = value;

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

  return root.innerHTML;
}

export function serializeEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === 'br') {
    return '\n';
  }

  const content = Array.from(element.childNodes).map(serializeEditorNode).join('');
  const fontWeight = String(element.style?.fontWeight || '').trim();
  const fontStyle = String(element.style?.fontStyle || '').trim().toLowerCase();
  const textDecoration = String(element.style?.textDecoration || element.style?.textDecorationLine || '').trim().toLowerCase();
  const isBoldStyle = fontWeight === 'bold' || Number(fontWeight) >= 600;
  const isItalicStyle = fontStyle === 'italic';
  const isUnderlineStyle = textDecoration.includes('underline');

  if (!content.trim()) return content;
  if (tag === 'strong' || tag === 'b') return `<strong>${content}</strong>`;
  if (tag === 'em' || tag === 'i') return `<em>${content}</em>`;
  if (tag === 'u') return `<u>${content}</u>`;
  if (tag === 'a') {
    const href = String((element as HTMLAnchorElement).href || element.getAttribute('href') || '').trim();
    return /^https?:\/\//i.test(href) ? `<a href="${escapeRichTextHtml(href)}">${content}</a>` : content;
  }
  if (tag === 'li') return `<li>${content}</li>`;
  if (tag === 'ul' || tag === 'ol') return `<${tag}>${content}</${tag}>`;
  if (/^h[1-4]$/.test(tag)) return `<${tag}>${content}</${tag}>`;
  if (isBoldStyle || isItalicStyle || isUnderlineStyle) {
    let next = content;
    if (isUnderlineStyle) next = `<u>${next}</u>`;
    if (isItalicStyle) next = `<em>${next}</em>`;
    if (isBoldStyle) next = `<strong>${next}</strong>`;
    return next;
  }
  if (tag === 'div' || tag === 'p') return `${content}\n`;

  return content;
}

export function editorHtmlToDescription(value: string) {
  const root = document.createElement('div');
  root.innerHTML = flattenListItemBlocks(value);
  const serialized = Array.from(root.childNodes)
    .map(serializeEditorNode)
    .join('')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/<\/(?:ol|ul)>\n+/g, (match) => match.trimEnd())
    .replace(/\n+<(?:ol|ul)>/g, (match) => match.trimStart())
    .replace(/<\/li>\n+<li>/g, '</li><li>');
  return normalizeLooseListMarkup(serialized);
}

export function getEditorSelectionToolbarPosition() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const firstRect = range.getClientRects()[0];
  const activeRect = rect.width || rect.height ? rect : firstRect;
  if (!activeRect) return null;

  const toolbarGap = 14;
  const estimatedToolbarHeight = 52;
  const canShowAbove = activeRect.top > estimatedToolbarHeight + toolbarGap + 16;
  const centerX = activeRect.left + (activeRect.width / 2);
  const top = canShowAbove ? activeRect.top - toolbarGap : activeRect.bottom + toolbarGap;
  return {
    left: Math.min(Math.max(centerX, 120), window.innerWidth - 120),
    top: Math.max(top, 16),
    placement: canShowAbove ? 'top' as const : 'bottom' as const,
  };
}
