export const MONTH_SLOT_LABELS = ['M1', 'M2', 'M3'] as const;
export type MonthSlotLabel = (typeof MONTH_SLOT_LABELS)[number];

export function isMonthSlotLabel(timeline?: string): timeline is MonthSlotLabel {
  return MONTH_SLOT_LABELS.includes((timeline || '') as MonthSlotLabel);
}

/** Sort key: M1, M2, M3 first; then other months (legacy extras). */
export function monthSlotSortKey(timeline?: string): number {
  const i = MONTH_SLOT_LABELS.indexOf((timeline || '') as MonthSlotLabel);
  return i === -1 ? 100 : i;
}

export function monthSlotDisplayName(timeline?: string): string {
  switch (timeline) {
    case 'M1':
      return 'Month 1';
    case 'M2':
      return 'Month 2';
    case 'M3':
      return 'Month 3';
    default:
      return timeline?.trim() ? timeline : 'Extra month';
  }
}
