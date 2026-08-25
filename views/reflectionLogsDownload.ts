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

function toHtmlParagraphs(value: string): string {
  const text = String(value || '').trim();
  if (!text) return '<p>None</p>';
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

function completedTasksHtml(record: ReflectionRecord): string {
  return toHtmlParagraphs(record.accomplishments);
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

function recordHtml(record: ReflectionRecord): string {
  return `
    <h3>${escapeHtml(record.empName || record.empId)} (${escapeHtml(record.empId)}) · ${escapeHtml(formatLongDate(record.date))}</h3>
    <p><strong>Completed tasks / accomplishments</strong></p>
    ${completedTasksHtml(record)}
    <p><strong>Challenges / learnings</strong></p>
    ${toHtmlParagraphs(record.challenges)}
    <p><strong>Unfinished / deferred</strong></p>
    ${toHtmlParagraphs(record.unfinished)}
    <p><strong>Energy peaks</strong></p>
    ${toHtmlParagraphs(record.energyPeaks)}
    <p><strong>Priorities for tomorrow</strong></p>
    ${toHtmlParagraphs(record.bigRocksTomorrow)}
    <hr />
  `;
}

export function buildAllReportsHtml(records: ReflectionRecord[]): string {
  if (!records.length) return '<p>No reports match the current filters.</p>';
  return `
    <h1>Daily reflection reports</h1>
    <p>${records.length} report${records.length === 1 ? '' : 's'} in this download.</p>
    ${records.map(recordHtml).join('')}
  `;
}

export function buildWeeklySheetsHtml(records: ReflectionRecord[]): string {
  if (!records.length) return '<p>No weekly sheets match the current filters.</p>';

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
      const peopleHtml = Array.from(week.people.values())
        .map((personRecords) => {
          const sorted = [...personRecords].sort((a, b) => a.date.localeCompare(b.date));
          const heading = `${sorted[0]?.empName || 'Employee'} (${sorted[0]?.empId || ''})`;
          return `
            <h2>${escapeHtml(heading)}</h2>
            ${sorted.map(recordHtml).join('')}
          `;
        })
        .join('');
      return `
        <h1>Weekly sheet · ${escapeHtml(week.bucket.label)}</h1>
        ${peopleHtml}
      `;
    })
    .join('');

  return `<h1>All weekly sheets</h1>${weekBlocks}`;
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
  const daysHtml = personRecords.length
    ? personRecords
        .map((record) => `
          <h3>${escapeHtml(formatLongDate(record.date))}</h3>
          ${completedTasksHtml(record)}
        `)
        .join('')
    : '<p>No completed tasks found for this person in this week.</p>';

  return `
    <h1>Weekly completed tasks</h1>
    <p><strong>Person:</strong> ${escapeHtml(name)} (${escapeHtml(empId)})</p>
    <p><strong>Week:</strong> ${escapeHtml(week.label)}</p>
    ${daysHtml}
  `;
}

export function downloadWordDoc(filename: string, bodyHtml: string): void {
  const safeName = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(safeName)}</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #0f172a; line-height: 1.45; }
      h1 { font-size: 22px; }
      h2 { font-size: 18px; margin-top: 24px; }
      h3 { font-size: 15px; margin-top: 16px; }
      p { margin: 4px 0; white-space: pre-wrap; }
      hr { border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0; }
    </style>
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
