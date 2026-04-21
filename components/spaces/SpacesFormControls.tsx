import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export const CREATE_INPUT_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[15px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15';

const CREATE_SELECT_TRIGGER_CLASS =
  'flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[15px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const CREATE_SELECT_MENU_CLASS =
  'absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl';

const CREATE_SELECT_OPTION_CLASS =
  'w-full px-5 py-3 text-left text-[15px] text-slate-700 transition-colors hover:bg-red-50 hover:text-brand-red';

const TABLE_SELECT_TRIGGER_CLASS =
  'flex w-[124px] max-w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 pr-4 py-2 text-[13px] text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const TABLE_SELECT_MENU_CLASS =
  'absolute left-0 top-full z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl';

const TABLE_SELECT_OPTION_CLASS =
  'w-full px-4 py-2.5 text-left text-[13px] text-slate-700 transition-colors hover:bg-red-50 hover:text-brand-red';

const TABLE_DATE_TRIGGER_CLASS =
  'w-[138px] max-w-full rounded-xl border border-slate-200 bg-white px-4 pr-10 py-2 text-center text-[13px] text-slate-700 outline-none transition-colors hover:border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const CALENDAR_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function parseDateValue(value?: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const TaskHubTableSkeleton: React.FC<{ customColumnCount: number }> = ({ customColumnCount }) => {
  const rows = Array.from({ length: 6 });
  const customColumns = Array.from({ length: customColumnCount });

  return (
    <>
      {rows.map((_, rowIndex) => (
        <tr key={`task-skeleton-${rowIndex}`} className="animate-pulse border-b border-slate-100 last:border-b-0">
          <td className="px-4 py-4">
            <div className="space-y-2">
              <div className="h-4 w-40 rounded-full bg-slate-200" />
              <div className="h-3 w-28 rounded-full bg-slate-100" />
            </div>
          </td>
          <td className="px-4 py-4"><div className="h-10 w-full rounded-2xl bg-slate-100" /></td>
          <td className="px-4 py-4"><div className="h-10 w-full rounded-2xl bg-slate-100" /></td>
          <td className="px-4 py-4"><div className="h-10 w-full rounded-2xl bg-slate-100" /></td>
          <td className="px-4 py-4"><div className="h-10 w-full rounded-2xl bg-slate-100" /></td>
          <td className="px-4 py-4"><div className="h-10 w-full rounded-2xl bg-slate-100" /></td>
          <td className="px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-slate-100" />
              <div className="h-4 w-10 rounded-full bg-slate-200" />
            </div>
          </td>
          {customColumns.map((__, columnIndex) => (
            <td key={`task-skeleton-${rowIndex}-column-${columnIndex}`} className="px-4 py-4">
              <div className="h-10 w-full rounded-2xl bg-slate-100" />
            </td>
          ))}
          <td className="px-3 py-4">
            <div className="ml-auto h-9 w-9 rounded-full bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
};

export const ThemedDatePicker: React.FC<{
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  forceOpenDown?: boolean;
}> = ({ value, onChange, disabled = false, compact = false, forceOpenDown = false }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => parseDateValue(value) || new Date());
  const [openAbove, setOpenAbove] = useState(false);

  useEffect(() => {
    const parsed = parseDateValue(value);
    if (parsed) setViewDate(parsed);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!open || !wrapperRef.current) return;
    const updatePlacement = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const estimatedHeight = compact ? 240 : 290;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenAbove(forceOpenDown ? false : spaceBelow < estimatedHeight && spaceAbove > spaceBelow);
    };
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open, compact, forceOpenDown]);

  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const monthLabel = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const selectedDate = parseDateValue(value);
  const today = new Date();
  const triggerClass = compact
    ? TABLE_DATE_TRIGGER_CLASS
    : `${CREATE_INPUT_CLASS} text-left hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`;

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
      <button type="button" onClick={() => !disabled && setOpen((prev) => !prev)} disabled={disabled} className={triggerClass}>
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{formatDateLabel(value)}</span>
        {!disabled ? <Calendar size={compact ? 16 : 18} className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${compact ? 'right-3' : 'right-4'}`} /> : null}
      </button>

      {open && !disabled && (
        <div className={`absolute left-0 z-30 border border-slate-200 bg-white shadow-2xl ${compact ? `w-[248px] rounded-[18px] p-2 ${openAbove ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}` : `w-[270px] rounded-[22px] p-2.5 ${openAbove ? 'bottom-full mb-2' : 'top-full mt-2'}`}`}>
          <div className={`flex items-center justify-between ${compact ? 'mb-1.5' : 'mb-2'}`}>
            <div className={`${compact ? 'text-[13px]' : 'text-[14px]'} font-semibold text-slate-900`}>{monthLabel}</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className={`inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-red/20 hover:bg-red-50 hover:text-brand-red ${compact ? 'h-7 w-7' : 'h-8 w-8'}`}><ChevronLeft size={compact ? 14 : 15} /></button>
              <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className={`inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-red/20 hover:bg-red-50 hover:text-brand-red ${compact ? 'h-7 w-7' : 'h-8 w-8'}`}><ChevronRight size={compact ? 14 : 15} /></button>
            </div>
          </div>

          <div className={`grid grid-cols-7 ${compact ? 'mb-1 gap-0.5' : 'mb-1.5 gap-1'}`}>
            {CALENDAR_WEEKDAYS.map((day) => (
              <div key={day} className={`text-center font-semibold uppercase tracking-[0.08em] text-slate-400 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{day}</div>
            ))}
          </div>

          <div className={`grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'}`}>
            {calendarDays.map((day) => {
              const inCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isTodayValue = isSameDay(day, today);
              return (
                <button key={day.toISOString()} type="button" onClick={() => handleSelect(day)} className={`${compact ? 'h-7 rounded-lg text-[12px]' : 'h-8 rounded-xl text-[13px]'} transition-colors ${isSelected ? 'bg-brand-red text-white shadow-md' : inCurrentMonth ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-50'} ${isTodayValue && !isSelected ? 'border border-brand-red/20 bg-red-50 text-brand-red' : ''}`}>
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className={`flex items-center justify-between border-t border-slate-100 ${compact ? 'mt-1.5 pt-1.5' : 'mt-2 pt-2'}`}>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className={`${compact ? 'text-[11px]' : 'text-[12px]'} font-semibold text-slate-500 hover:text-brand-red`}>Clear</button>
            <button type="button" onClick={() => handleSelect(new Date())} className={`rounded-full bg-brand-red font-semibold text-white hover:bg-brand-navy ${compact ? 'px-3 py-1 text-[11px]' : 'px-3.5 py-1.5 text-[12px]'}`}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ThemedSelect: React.FC<{
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  forceOpenDown?: boolean;
}> = ({ value, options, onChange, placeholder = 'Select', disabled = false, compact = false, forceOpenDown = false }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const [openAbove, setOpenAbove] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!open || !wrapperRef.current) return;
    const updatePlacement = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const estimatedHeight = compact ? 240 : 290;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenAbove = forceOpenDown ? false : spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      setOpenAbove(shouldOpenAbove);
      if (compact) {
        setMenuPosition({
          left: rect.left,
          top: shouldOpenAbove ? Math.max(8, rect.top - estimatedHeight - 6) : rect.bottom + 6,
          width: rect.width,
        });
      }
    };
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open, compact, forceOpenDown]);

  useEffect(() => {
    if (!open || !compact) return;
    const updatePosition = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const estimatedHeight = Math.min(Math.max(options.length, 1), 6) * 38 + 16;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenAbove = forceOpenDown ? false : spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      setOpenAbove(shouldOpenAbove);
      setMenuPosition({
        top: shouldOpenAbove ? Math.max(8, rect.top - estimatedHeight - 6) : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, compact, options.length, forceOpenDown]);

  const selected = options.find((option) => option.value === value);
  const triggerClass = compact ? TABLE_SELECT_TRIGGER_CLASS : CREATE_SELECT_TRIGGER_CLASS;
  const menuClass = compact ? TABLE_SELECT_MENU_CLASS : CREATE_SELECT_MENU_CLASS;
  const optionClass = compact ? TABLE_SELECT_OPTION_CLASS : CREATE_SELECT_OPTION_CLASS;

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" onClick={() => !disabled && setOpen((prev) => !prev)} disabled={disabled} className={triggerClass}>
        <span className={`min-w-0 flex-1 truncate whitespace-nowrap pr-2 text-left ${selected ? 'text-slate-700' : 'text-slate-400'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={compact ? 16 : 18} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && !compact && (
        <div className={`${menuClass} ${openAbove ? 'bottom-full top-auto mb-2 mt-0' : ''}`}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`${optionClass} ${isSelected ? 'bg-red-50 text-brand-red' : ''}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      {open && !disabled && compact
        ? createPortal(
            <div
              ref={menuRef}
              className={`${menuClass} fixed z-[80] max-h-[240px] overflow-y-auto`}
              style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, width: `${menuPosition.width}px` }}
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`${optionClass} ${isSelected ? 'bg-red-50 text-brand-red' : ''}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};
