import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUserTimeZone } from '../../utils/timezone';

function parseDateValue(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value?: string): string {
  const parsed = parseDateValue(value);
  if (!parsed) return 'mm/dd/yyyy';
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${month}/${day}/${year}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const CALENDAR_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const ScheduleDatePicker: React.FC<{
  value?: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => parseDateValue(value) || new Date());

  useEffect(() => {
    const parsed = parseDateValue(value);
    if (parsed) setViewDate(parsed);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const monthLabel = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: getUserTimeZone() });
  const selectedDate = parseDateValue(value);
  const today = new Date();
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const startDay = startOfMonth.getDay();
    const gridStart = new Date(startOfMonth);
    gridStart.setDate(startOfMonth.getDate() - startDay);
    for (let i = 0; i < 42; i += 1) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [startOfMonth]);

  const handleSelect = (date: Date) => {
    onChange(formatDateValue(date));
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-11 text-left text-sm outline-none transition hover:border-slate-300 focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{formatDateLabel(value)}</span>
        <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-[270px] rounded-[22px] border border-slate-200 bg-white p-2.5 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[14px] font-semibold text-slate-900">{monthLabel}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-red/20 hover:bg-red-50 hover:text-brand-red"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-red/20 hover:bg-red-50 hover:text-brand-red"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {CALENDAR_WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const inCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isTodayValue = isSameDay(day, today);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={`h-8 rounded-xl text-[13px] transition-colors ${
                    isSelected
                      ? 'bg-brand-red text-white shadow-md'
                      : inCurrentMonth
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-300 hover:bg-slate-50'
                  } ${isTodayValue && !isSelected ? 'border border-brand-red/20 bg-red-50 text-brand-red' : ''}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-[12px] font-semibold text-slate-500 hover:text-brand-red"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleSelect(new Date())}
              className="rounded-full bg-brand-red px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-navy"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
