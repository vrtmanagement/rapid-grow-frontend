import type { GoogleCalendarEvent } from '../../services/googleCalendar';

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function taskDateKey(value?: string): string | null {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}
export function calendarDays(month: Date): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}
export function eventOccursOn(event: GoogleCalendarEvent, day: Date): boolean {
  if (event.start.date) {
    const key = localDateKey(day);
    return key >= event.start.date && key < (event.end.date || event.start.date + '~');
  }
  const start = new Date(event.start.dateTime || '').getTime();
  const end = new Date(event.end.dateTime || event.start.dateTime || '').getTime();
  const tomorrow = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
  return start < tomorrow && (end > day.getTime() || (start === end && start >= day.getTime()));
}
