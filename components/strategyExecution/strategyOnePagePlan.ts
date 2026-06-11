export interface OnePageSection {
  key: string;
  title: string;
  hint: string;
  placeholder: string;
}

export const ONE_PAGE_SECTIONS: OnePageSection[] = [
  {
    key: 'vision',
    title: 'Vision & strategic priorities',
    hint: 'Where the company is headed this year and the top 3–5 priorities everyone should know.',
    placeholder: 'e.g. Become the #1 provider in our region while improving margins by 5 points…',
  },
  {
    key: 'pillars',
    title: 'Strategic pillars & goals',
    hint: 'Summarize each pillar (Growth, Quality, Service, People, Finance) and its main goal.',
    placeholder: 'e.g. Growth — 15% revenue increase; Quality — reduce defects by 20%…',
  },
  {
    key: 'initiatives',
    title: 'Major initiatives',
    hint: 'The big bets and programs approved for this year.',
    placeholder: 'e.g. Launch digital channel, expand into 2 new markets, upgrade ERP…',
  },
  {
    key: 'accountability',
    title: 'Accountabilities',
    hint: 'Who owns what — department heads and execution teams.',
    placeholder: 'e.g. Sales — pipeline growth; Operations — on-time delivery…',
  },
  {
    key: 'metrics',
    title: 'How we measure success',
    hint: 'The KPIs employees will track monthly and quarterly.',
    placeholder: 'e.g. Revenue, NPS, employee engagement, EBITDA…',
  },
];

const MARKER_PREFIX = '## ';

export function parseOnePagePlan(text: string): Record<string, string> {
  const result = Object.fromEntries(ONE_PAGE_SECTIONS.map((section) => [section.key, '']));
  const trimmed = text?.trim() || '';
  if (!trimmed) return result;

  if (!trimmed.includes(MARKER_PREFIX)) {
    result.vision = trimmed;
    return result;
  }

  for (const section of ONE_PAGE_SECTIONS) {
    const marker = `${MARKER_PREFIX}${section.title}`;
    const start = trimmed.indexOf(marker);
    if (start === -1) continue;
    const contentStart = start + marker.length;
    let contentEnd = trimmed.length;
    for (const other of ONE_PAGE_SECTIONS) {
      if (other.key === section.key) continue;
      const otherMarker = `${MARKER_PREFIX}${other.title}`;
      const otherStart = trimmed.indexOf(otherMarker, contentStart);
      if (otherStart !== -1 && otherStart < contentEnd) {
        contentEnd = otherStart;
      }
    }
    result[section.key] = trimmed.slice(contentStart, contentEnd).trim();
  }
  return result;
}

export function serializeOnePagePlan(sections: Record<string, string>): string {
  return ONE_PAGE_SECTIONS.map((section) => {
    const body = (sections[section.key] || '').trim();
    return body ? `${MARKER_PREFIX}${section.title}\n${body}` : '';
  })
    .filter(Boolean)
    .join('\n\n');
}
