import type { ReflectionRecord } from './reflectionViewHelpers';

export type WeekBucket = {
  key: string;
  start: string;
  end: string;
  label: string;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatLongDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatWeekRangeLabel(week: WeekBucket): string {
  return `${formatShortDate(week.start)} – ${formatShortDate(week.end)}`;
}

export function getWeekBucket(dateKey: string): WeekBucket | null {
  const date = parseDateKey(dateKey);
  if (!date) return null;
  const weekday = date.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const start = toDateKey(monday);
  const end = toDateKey(sunday);
  return {
    key: start,
    start,
    end,
    label: `${formatLongDate(start)} – ${formatLongDate(end)}`,
  };
}

export function getWeekForFilters(options: {
  selectedLogDate: string;
  logFilter: 'today' | 'yesterday' | 'all';
  todayKey: string;
  yesterdayKey: string;
}): WeekBucket | null {
  if (options.selectedLogDate) return getWeekBucket(options.selectedLogDate);
  if (options.logFilter === 'yesterday') return getWeekBucket(options.yesterdayKey);
  return getWeekBucket(options.todayKey);
}

function formatShortDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function buildDownloadWeekOptions(todayKey: string, count = 12): Array<{ value: string; label: string; bucket: WeekBucket }> {
  const current = getWeekBucket(todayKey);
  if (!current) return [];

  return Array.from({ length: count }, (_, index) => {
    const startDate = parseDateKey(current.start);
    if (!startDate) return null;
    startDate.setDate(startDate.getDate() - index * 7);
    const bucket = getWeekBucket(toDateKey(startDate));
    if (!bucket) return null;
    const label =
      index === 0
        ? `This week · ${formatShortDate(bucket.start)} – ${formatShortDate(bucket.end)}`
        : index === 1
          ? `Last week · ${formatShortDate(bucket.start)} – ${formatShortDate(bucket.end)}`
          : `${formatShortDate(bucket.start)} – ${formatShortDate(bucket.end)}`;
    return { value: bucket.key, label, bucket };
  }).filter((option): option is { value: string; label: string; bucket: WeekBucket } => Boolean(option));
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bulletLines(value: string): string {
  const text = String(value || '').trim();
  if (!text) return '<p class="empty">—</p>';
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*]|\u2022|\d+[.)])\s*/u, '').trim())
    .filter(Boolean);
  if (!lines.length) return '<p class="empty">—</p>';
  return `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`;
}

function fieldBlock(label: string, value: string): string {
  const text = String(value || '').trim();
  if (!text) return '';
  return `
    <div class="field">
      <div class="field-label">${escapeHtml(label)}</div>
      ${bulletLines(text)}
    </div>
  `;
}

function dayWorkHtml(record: ReflectionRecord, options?: { completedOnly?: boolean }): string {
  if (options?.completedOnly) {
    return `
      <div class="day-card">
        <div class="day-title">${escapeHtml(formatLongDate(record.date))}</div>
        <div class="field">
          <div class="field-label">Completed work</div>
          ${bulletLines(record.accomplishments)}
        </div>
      </div>
    `;
  }

  return `
    <div class="day-card">
      <div class="day-title">${escapeHtml(formatLongDate(record.date))}</div>
      ${fieldBlock('Accomplishments', record.accomplishments)}
      ${fieldBlock('Challenges / learnings', record.challenges)}
      ${fieldBlock('Unfinished / deferred', record.unfinished)}
      ${fieldBlock('Energy peaks', record.energyPeaks)}
      ${fieldBlock('Priorities for tomorrow', record.bigRocksTomorrow)}
    </div>
  `;
}

function personDivider(): string {
  return `
    <table class="divider" role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td class="divider-line">&nbsp;</td>
        <td class="divider-dot">●</td>
        <td class="divider-line">&nbsp;</td>
      </tr>
    </table>
  `;
}

function personWeeklyBlock(
  name: string,
  empId: string,
  weekLabel: string,
  records: ReflectionRecord[],
  options?: { completedOnly?: boolean },
): string {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const daysHtml = sorted.length
    ? sorted.map((record) => dayWorkHtml(record, options)).join('')
    : '<p class="empty">No work logged for this week.</p>';

  return `
    <section class="person-block">
      <div class="person-header">
        <div class="person-name">${escapeHtml(name)}</div>
        <div class="person-meta">ID ${escapeHtml(empId)} · Week ${escapeHtml(weekLabel)}</div>
      </div>
      <div class="days">
        ${daysHtml}
      </div>
    </section>
  `;
}

export function uniquePeopleFromRecords(records: ReflectionRecord[]): Array<{ empId: string; empName: string }> {
  const map = new Map<string, string>();
  records.forEach((record) => {
    const empId = String(record.empId || '').trim();
    if (!empId || map.has(empId)) return;
    map.set(empId, String(record.empName || empId).trim() || empId);
  });
  return Array.from(map.entries())
    .map(([empId, empName]) => ({ empId, empName }))
    .sort((a, b) => a.empName.localeCompare(b.empName));
}

export function buildAllReportsHtml(records: ReflectionRecord[]): string {
  if (!records.length) return '<p class="empty">No reports match the current filters.</p>';

  const byPerson = new Map<string, ReflectionRecord[]>();
  records.forEach((record) => {
    const key = String(record.empId || record.empName || 'unknown');
    const list = byPerson.get(key) || [];
    list.push(record);
    byPerson.set(key, list);
  });

  const blocks = Array.from(byPerson.values())
    .map((personRecords) => {
      const sorted = [...personRecords].sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const weekLabel =
        first && last && first.date !== last.date
          ? `${formatShortDate(first.date)} – ${formatShortDate(last.date)}`
          : formatShortDate(first?.date || '');
      return personWeeklyBlock(
        first?.empName || 'Employee',
        first?.empId || '',
        weekLabel,
        sorted,
      );
    })
    .join(personDivider());

  return `
    <div class="doc-title">Reflection Reports</div>
    <div class="doc-subtitle">${records.length} report${records.length === 1 ? '' : 's'}</div>
    ${blocks}
  `;
}

export function buildWeeklySheetsHtml(records: ReflectionRecord[]): string {
  if (!records.length) return '<p class="empty">No weekly sheets match the current filters.</p>';

  const weeks = new Map<string, { bucket: WeekBucket; people: Map<string, ReflectionRecord[]> }>();
  records.forEach((record) => {
    const bucket = getWeekBucket(record.date);
    if (!bucket) return;
    const week = weeks.get(bucket.key) || { bucket, people: new Map<string, ReflectionRecord[]>() };
    const personKey = String(record.empId || record.empName || 'unknown');
    const personRecords = week.people.get(personKey) || [];
    personRecords.push(record);
    week.people.set(personKey, personRecords);
    weeks.set(bucket.key, week);
  });

  const weekBlocks = Array.from(weeks.values())
    .sort((a, b) => b.bucket.key.localeCompare(a.bucket.key))
    .map((week) => {
      const peopleBlocks = Array.from(week.people.values())
        .sort((a, b) => String(a[0]?.empName || '').localeCompare(String(b[0]?.empName || '')))
        .map((personRecords) => {
          const first = personRecords[0];
          return personWeeklyBlock(
            first?.empName || 'Employee',
            first?.empId || '',
            formatWeekRangeLabel(week.bucket),
            personRecords,
          );
        })
        .join(personDivider());

      return `
        <div class="week-banner">Week of ${escapeHtml(formatWeekRangeLabel(week.bucket))}</div>
        ${peopleBlocks}
      `;
    })
    .join('<div class="week-gap"></div>');

  return `
    <div class="doc-title">Weekly Reflection Sheets</div>
    <div class="doc-subtitle">Person · week · day-by-day work</div>
    ${weekBlocks}
  `;
}

export function buildPersonWeeklyCompletedHtml(
  records: ReflectionRecord[],
  empId: string,
  week: WeekBucket,
): string {
  const personRecords = records
    .filter((record) => record.empId === empId && record.date >= week.start && record.date <= week.end)
    .sort((a, b) => a.date.localeCompare(b.date));
  const name = personRecords[0]?.empName || empId;

  return `
    <div class="doc-title">Weekly Completed Tasks</div>
    <div class="doc-subtitle">${escapeHtml(formatWeekRangeLabel(week))}</div>
    ${personWeeklyBlock(name, empId, formatWeekRangeLabel(week), personRecords, { completedOnly: true })}
  `;
}

const DOC_STYLES = `
  @page { margin: 18mm 16mm; }
  body {
    font-family: Calibri, "Segoe UI", Arial, sans-serif;
    color: #0f172a;
    line-height: 1.5;
    font-size: 12pt;
  }
  .doc-title {
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0f172a;
    margin: 0 0 4px 0;
  }
  .doc-subtitle {
    font-size: 11pt;
    color: #64748b;
    margin: 0 0 22px 0;
  }
  .week-banner {
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #b91c1c;
    margin: 8px 0 18px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid #fecaca;
  }
  .week-gap { height: 28px; }
  .person-block { margin: 0 0 8px 0; }
  .person-header {
    margin: 0 0 14px 0;
    padding: 12px 14px;
    background: #f8fafc;
    border-left: 4px solid #e11d48;
  }
  .person-name {
    font-size: 16pt;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 2px 0;
  }
  .person-meta {
    font-size: 10.5pt;
    color: #64748b;
  }
  .days { margin: 0; }
  .day-card {
    margin: 0 0 14px 0;
    padding: 0 0 12px 0;
    border-bottom: 1px solid #e2e8f0;
  }
  .day-card:last-child { border-bottom: 0; }
  .day-title {
    font-size: 12pt;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 8px 0;
  }
  .field { margin: 0 0 8px 0; }
  .field-label {
    font-size: 9.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    margin: 0 0 3px 0;
  }
  ul {
    margin: 0;
    padding-left: 18px;
  }
  li {
    margin: 0 0 3px 0;
    color: #1e293b;
  }
  p { margin: 0 0 4px 0; }
  .empty { color: #94a3b8; font-style: italic; }
  .divider {
    width: 100%;
    margin: 22px 0 26px 0;
    border-collapse: collapse;
  }
  .divider-line {
    border-bottom: 1.5px solid #cbd5e1;
    height: 1px;
    font-size: 1px;
    line-height: 1px;
  }
  .divider-dot {
    width: 28px;
    text-align: center;
    color: #e11d48;
    font-size: 8pt;
    line-height: 1;
    vertical-align: middle;
  }
`;

export function downloadWordDoc(filename: string, bodyHtml: string): void {
  const safeName = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(safeName)}</title>
    <style>${DOC_STYLES}</style>
  </head>
  <body>${bodyHtml}</body>
</html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
