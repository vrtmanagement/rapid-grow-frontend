export const VISION_STAGE_CONFIG = [
  { key: 'year', to: '/yearly', short: 'Year', label: 'Yearly Vision', description: 'Choose a yearly vision to open its quarterly execution map.' },
  { key: 'quarter', to: '/quarterly', short: 'Quarter', label: 'Quarterly Vision', description: 'Open one quarter to see only its monthly milestones.' },
  { key: 'month', to: '/monthly', short: 'Month', label: 'Monthly Goals', description: 'Open one month to see the weekly operating commitments inside it.' },
  { key: 'week', to: '/weekly', short: 'Week', label: 'Weekly Tasks', description: 'Choose one week to move into the seven-day execution board.' },
  { key: 'day', to: '/daily', short: 'Day', label: 'Daily Tasks', description: 'Run the selected week with a clean daily execution board.' },
] as const;

export function buildVisionSearch(values: Record<string, string | undefined | null>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function buildVisionStageHref(
  stageKey: string,
  selection: { yearId?: string; quarterId?: string; monthId?: string; weekId?: string; weekSlot?: string | number },
) {
  if (stageKey === 'year') return '/yearly';
  if (stageKey === 'quarter') return `/quarterly${buildVisionSearch({ yearId: selection.yearId })}`;
  if (stageKey === 'month') {
    return `/monthly${buildVisionSearch({ yearId: selection.yearId, quarterId: selection.quarterId })}`;
  }
  if (stageKey === 'week') {
    return `/weekly${buildVisionSearch({ yearId: selection.yearId, quarterId: selection.quarterId, monthId: selection.monthId })}`;
  }
  return `/daily${buildVisionSearch({
    yearId: selection.yearId,
    quarterId: selection.quarterId,
    monthId: selection.monthId,
    weekId: selection.weekId,
    weekSlot: selection.weekSlot ? String(selection.weekSlot) : '',
  })}`;
}

export function resolveVisionStageFromPath(pathname: string) {
  if (pathname.startsWith('/daily')) return 'day';
  if (pathname.startsWith('/weekly')) return 'week';
  if (pathname.startsWith('/monthly')) return 'month';
  if (pathname.startsWith('/quarterly')) return 'quarter';
  return 'year';
}

export function isVisionRoute(pathname: string) {
  return ['/vision', '/yearly', '/quarterly', '/monthly', '/weekly', '/daily'].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
