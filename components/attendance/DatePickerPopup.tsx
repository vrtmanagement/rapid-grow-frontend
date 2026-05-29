import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerPopupProps {
  value?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

function normalizeDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCalendarDays(visibleMonth: Date) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const leading = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const items: Array<{ key: string; label: string; date: Date | null }> = [];

  for (let index = 0; index < leading; index += 1) {
    items.push({ key: `blank-${index}`, label: '', date: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    items.push({ key: toIsoDate(date), label: String(day), date });
  }

  while (items.length % 7 !== 0) {
    items.push({ key: `tail-${items.length}`, label: '', date: null });
  }

  return items;
}

const calendarWeekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DatePickerPopup: React.FC<DatePickerPopupProps> = ({ value, onSelect, onClose }) => {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = normalizeDate(value);
    return selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const selectedDate = normalizeDate(value);
  const monthLabel = visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  return (
    <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-full min-w-[192px] rounded-[16px] border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.14)] animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-400">Choose date</p>
          <h4 className="mt-0.5 text-[0.78rem] font-semibold text-slate-900">{monthLabel}</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            type="button"
            onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-7 gap-1">
        {calendarWeekLabels.map((label) => (
          <div key={label} className="text-center text-[7px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            {label}
          </div>
        ))}

        {calendarDays.map((item) => {
          if (!item.date) {
            return <div key={item.key} className="h-7 rounded-lg bg-transparent" />;
          }

          const dayKey = toIsoDate(item.date);
          const isSelected = !!selectedDate && toIsoDate(selectedDate) === dayKey;
          const isToday = toIsoDate(today) === dayKey;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onSelect(dayKey);
                onClose();
              }}
              className={`relative h-7 rounded-lg border text-[0.78rem] font-semibold transition ${
                isSelected
                  ? 'border-brand-red bg-brand-red text-white shadow-md'
                  : isToday
                    ? 'border-brand-red/20 bg-brand-red/5 text-brand-red'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            onSelect(toIsoDate(today));
            onClose();
          }}
          className="rounded-lg border border-brand-red/15 bg-brand-red/5 px-2 py-1 text-[9px] font-semibold text-brand-red transition hover:bg-brand-red/10"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default DatePickerPopup;
