import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

export const CREATE_INPUT_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[15px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15';

const CREATE_SELECT_TRIGGER_CLASS =
  'flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[15px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const CREATE_SELECT_MENU_CLASS =
  'absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white';

const CREATE_SELECT_OPTION_CLASS =
  'w-full px-5 py-3 text-left text-[15px] text-slate-700 transition-colors hover:bg-red-50 hover:text-brand-red';

const TABLE_SELECT_TRIGGER_CLASS =
  'flex w-[124px] max-w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 pr-4 py-2 text-[13px] text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const COMPACT_FULL_WIDTH_SELECT_TRIGGER_CLASS =
  'flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const TABLE_SELECT_MENU_CLASS =
  'absolute left-0 top-full z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white';

const TABLE_SELECT_OPTION_CLASS =
  'w-full px-4 py-2.5 text-left text-[13px] text-slate-700 transition-colors hover:bg-red-50 hover:text-brand-red';

const TABLE_DATE_TRIGGER_CLASS =
  'w-[138px] max-w-full rounded-xl border border-slate-200 bg-white px-4 pr-10 py-2 text-center text-[13px] text-slate-700 outline-none transition-colors hover:border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const COMPACT_FULL_WIDTH_DATE_TRIGGER_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 py-2.5 text-left text-[14px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 focus:ring-2 focus:ring-brand-red/15 focus:border-brand-red disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

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
  fullWidthCompact?: boolean;
  forceOpenDown?: boolean;
}> = ({ value, onChange, disabled = false, compact = false, fullWidthCompact = false, forceOpenDown = false }) => {
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
    ? fullWidthCompact
      ? COMPACT_FULL_WIDTH_DATE_TRIGGER_CLASS
      : TABLE_DATE_TRIGGER_CLASS
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
        <div className={`absolute left-0 z-30 border border-slate-200 bg-white ${compact ? `w-[248px] rounded-[18px] p-2 ${openAbove ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}` : `w-[270px] rounded-[22px] p-2.5 ${openAbove ? 'bottom-full mb-2' : 'top-full mt-2'}`}`}>
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
  fullWidthCompact?: boolean;
  denseMenu?: boolean;
  forceOpenDown?: boolean;
}> = ({
  value,
  options,
  onChange,
  placeholder = 'Select',
  disabled = false,
  compact = false,
  fullWidthCompact = false,
  denseMenu = false,
  forceOpenDown = false,
}) => {
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
      const estimatedHeight = compact ? (denseMenu ? 196 : 240) : 290;
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
  }, [open, compact, denseMenu, forceOpenDown]);

  useEffect(() => {
    if (!open || !compact) return;
    const updatePosition = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const rowHeight = denseMenu ? 32 : 38;
      const estimatedHeight = Math.min(Math.max(options.length, 1), 6) * rowHeight + (denseMenu ? 10 : 16);
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
  }, [open, compact, options.length, denseMenu, forceOpenDown]);

  const selected = options.find((option) => option.value === value);
  const triggerClass = compact
    ? fullWidthCompact
      ? COMPACT_FULL_WIDTH_SELECT_TRIGGER_CLASS
      : TABLE_SELECT_TRIGGER_CLASS
    : CREATE_SELECT_TRIGGER_CLASS;
  const menuClass = compact ? TABLE_SELECT_MENU_CLASS : CREATE_SELECT_MENU_CLASS;
  const optionClass = compact
    ? denseMenu
      ? 'w-full px-4 py-1.5 text-left text-[12px] text-slate-700 transition-colors hover:bg-red-50 hover:text-brand-red'
      : TABLE_SELECT_OPTION_CLASS
    : CREATE_SELECT_OPTION_CLASS;

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
              className={`${menuClass} fixed z-[220] overflow-y-auto ${denseMenu ? 'max-h-[196px]' : 'max-h-[240px]'}`}
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

export type WeeklyPeriodPickerOption = {
  value: string;
  label: string;
  caption?: string;
  description?: string;
};

type WeeklyTaskPeriodPickerProps = {
  summary: string;
  detail: string;
  projectOptions?: WeeklyPeriodPickerOption[];
  selectedProject?: string;
  onProjectChange?: (value: string) => void;
  quarterOptions: WeeklyPeriodPickerOption[];
  selectedQuarter: string;
  onQuarterChange: (value: string) => void;
  monthOptions: WeeklyPeriodPickerOption[];
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  weekOptions: WeeklyPeriodPickerOption[];
  selectedWeek: string;
  onWeekChange: (value: string) => void;
  disabled?: boolean;
  compactTrigger?: boolean;
  dropdownAlign?: 'left' | 'right';
};

const WeeklyTaskPeriodOptionColumn: React.FC<{
  heading: string;
  options: WeeklyPeriodPickerOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  compact?: boolean;
  roomy?: boolean;
}> = ({ heading, options, selectedValue, onSelect, compact = false, roomy = false }) => {
  const getRoomyPrimaryLabel = (label: string) => {
    const trimmed = String(label || '').trim();
    if (/^Q(\d+)$/i.test(trimmed)) return `Quarter ${trimmed.slice(1)}`;
    if (/^M(\d+)$/i.test(trimmed)) return `Month ${trimmed.slice(1)}`;
    if (/^W(\d+)$/i.test(trimmed)) return `Week ${trimmed.slice(1)}`;
    return trimmed;
  };

  return (
    <div className="min-w-0">
      <div className={`px-1 font-semibold uppercase tracking-[0.2em] text-slate-400 ${compact ? 'mb-1 text-[9px]' : 'mb-2 text-[10px]'}`}>
        {heading}
      </div>
      <div
        className={`space-y-1.5 overflow-y-auto border border-slate-200/90 bg-slate-50/60 ${
          roomy ? 'max-h-[232px] rounded-[24px] p-2.5' : compact ? 'max-h-[204px] rounded-[15px] p-1.5' : 'max-h-[196px] rounded-[22px] p-2'
        }`}
      >
        {options.map((option) => {
          const isSelected = option.value === selectedValue;
          const roomyPrimaryLabel = getRoomyPrimaryLabel(option.label);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`w-full border text-left transition-all duration-150 ${
                roomy ? 'rounded-[18px] px-4 py-3' : compact ? 'rounded-[12px] px-2.5 py-1.5' : 'rounded-[16px] px-3 py-2'
              } ${
                isSelected
                  ? roomy
                    ? 'border-red-200 bg-[linear-gradient(180deg,rgba(254,242,242,1),rgba(254,226,226,0.9))] text-slate-900 shadow-[0_10px_24px_rgba(248,113,113,0.12)]'
                    : 'border-brand-red bg-brand-red text-white shadow-[0_16px_30px_rgba(239,68,68,0.18)]'
                  : 'border-slate-100 bg-white/95 text-slate-700 shadow-[0_3px_10px_rgba(15,23,42,0.035)] hover:border-slate-200 hover:bg-white'
              }`}
            >
              {roomy ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[14px] font-semibold leading-5 text-slate-800">{roomyPrimaryLabel}</div>
                    {option.caption ? (
                      <div className={`shrink-0 text-right text-[12px] font-medium leading-5 ${isSelected ? 'text-rose-500' : 'text-slate-500'}`}>
                        {option.caption}
                      </div>
                    ) : null}
                  </div>
                  {option.description ? (
                    <div className={`mt-1.5 line-clamp-2 text-[12px] leading-5 ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                      {option.description}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className={compact ? 'text-[11px] font-semibold leading-4' : 'text-[13px] font-semibold leading-5'}>
                    {option.label}
                  </div>
                  {option.caption ? (
                    <div className={`${compact ? 'mt-0.5 text-[8px] leading-3.5' : 'mt-0.5 text-[10px] leading-4'} ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                      {option.caption}
                    </div>
                  ) : null}
                  {option.description ? (
                    <div className={`${compact ? 'mt-0.5 line-clamp-2 text-[8px] leading-3.5' : 'mt-0.5 line-clamp-2 text-[10px] leading-4'} ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                      {option.description}
                    </div>
                  ) : null}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const WeeklyTaskPeriodTrigger: React.FC<{
  summary: string;
  detail: string;
  disabled?: boolean;
  compactTrigger?: boolean;
  open?: boolean;
  onToggle: () => void;
}> = ({ summary, detail, disabled = false, compactTrigger = false, open = false, onToggle }) => (
  <button
    type="button"
    onClick={() => !disabled && onToggle()}
    disabled={disabled}
    className={`flex w-full items-center justify-between text-left transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 ${
      compactTrigger
        ? 'min-h-[56px] gap-2 rounded-[16px] border border-slate-300 bg-white px-2 py-1.5 shadow-[0_8px_18px_rgba(15,23,42,0.05)]'
        : 'gap-4 rounded-[28px] border border-slate-300 bg-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]'
    }`}
  >
    <div className={`flex min-w-0 items-center ${compactTrigger ? 'gap-1.5' : 'gap-4'}`}>
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 ${
          compactTrigger ? 'h-7 w-7' : 'h-14 w-14'
        }`}
      >
        <Calendar size={compactTrigger ? 12 : 20} />
      </div>
      <div className="min-w-0">
        <div className={`truncate font-semibold leading-none text-slate-900 ${compactTrigger ? 'text-[13px]' : 'text-[26px]'}`}>{summary}</div>
        <div className={`truncate uppercase tracking-[0.14em] text-slate-400 ${compactTrigger ? 'mt-0.5 text-[6px]' : 'mt-2 text-[12px]'}`}>{detail}</div>
      </div>
    </div>
    <ChevronDown size={compactTrigger ? 12 : 18} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
  </button>
);

export const WeeklyTaskPeriodCanvas: React.FC<WeeklyTaskPeriodPickerProps & { open: boolean; onClose: () => void }> = ({
  summary,
  detail,
  projectOptions = [],
  selectedProject = '',
  onProjectChange,
  quarterOptions,
  selectedQuarter,
  onQuarterChange,
  monthOptions,
  selectedMonth,
  onMonthChange,
  weekOptions,
  selectedWeek,
  onWeekChange,
  open,
  onClose,
}) => (
  <div
    aria-hidden={!open}
    className={`overflow-hidden transition-all duration-300 ease-out ${
      open ? 'max-h-[828px] opacity-100' : 'pointer-events-none max-h-0 opacity-0'
    }`}
  >
    <div className={`transition-transform duration-300 ease-out ${open ? 'translate-y-0' : '-translate-y-4'}`}>
      <div className="relative overflow-hidden rounded-none border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(248,250,252,0.92),rgba(255,255,255,0.96)_42%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,1))] p-3.5 md:p-4">
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="rounded-none border border-white/70 bg-white/90 p-3.5 backdrop-blur md:p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:gap-6">
              <h3 className="text-[24px] font-semibold tracking-tight text-slate-900">Weekly Planner Focus</h3>
              <div className="max-w-[320px] rounded-[18px] border border-slate-200 bg-slate-50/90 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Selected Period</div>
                <div className="mt-1.5 text-[22px] font-semibold leading-tight text-slate-900">{summary}</div>
                <div className="mt-1 text-[12px] leading-5 text-slate-600">{detail}</div>
              </div>
            </div>
            <div className="flex flex-col gap-3 md:min-w-[280px] md:max-w-[320px]">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <X size={14} />
                Close canvas
              </button>
            </div>
          </div>

          <div className={`mt-4 grid gap-4 ${projectOptions.length && onProjectChange ? 'xl:grid-cols-[minmax(0,1.15fr)_repeat(3,minmax(0,1fr))]' : 'xl:grid-cols-3'}`}>
            {projectOptions.length && onProjectChange ? (
              <WeeklyTaskPeriodOptionColumn
                heading="Visions"
                options={projectOptions}
                selectedValue={selectedProject}
                onSelect={onProjectChange}
                roomy={true}
              />
            ) : null}
            <WeeklyTaskPeriodOptionColumn heading="Quarter" options={quarterOptions} selectedValue={selectedQuarter} onSelect={onQuarterChange} roomy={true} />
            <WeeklyTaskPeriodOptionColumn heading="Month" options={monthOptions} selectedValue={selectedMonth} onSelect={onMonthChange} roomy={true} />
            <WeeklyTaskPeriodOptionColumn heading="Week" options={weekOptions} selectedValue={selectedWeek} onSelect={onWeekChange} roomy={true} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const WeeklyTaskPeriodPicker: React.FC<WeeklyTaskPeriodPickerProps> = ({
  summary,
  detail,
  projectOptions = [],
  selectedProject = '',
  onProjectChange,
  quarterOptions,
  selectedQuarter,
  onQuarterChange,
  monthOptions,
  selectedMonth,
  onMonthChange,
  weekOptions,
  selectedWeek,
  onWeekChange,
  disabled = false,
  compactTrigger = false,
  dropdownAlign = 'left',
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

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

  return (
    <div ref={wrapperRef} className="relative">
      <WeeklyTaskPeriodTrigger summary={summary} detail={detail} disabled={disabled} compactTrigger={compactTrigger} open={open} onToggle={() => setOpen((prev) => !prev)} />

      {open && !disabled ? (
        <div
          className={`absolute top-full z-30 mt-2.5 max-w-[calc(100vw-2rem)] border border-slate-200 bg-white ${
            compactTrigger
              ? 'left-1/2 w-[min(900px,calc(100vw-2rem))] -translate-x-1/2 rounded-[20px] p-3'
              : 'w-[min(1100px,calc(100vw-2rem))] rounded-[26px] p-3.5'
          } ${compactTrigger ? '' : dropdownAlign === 'right' ? 'right-0' : 'left-0'}`}
        >
          {compactTrigger ? (
            <div className="absolute left-1/2 top-0 h-3 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white" />
          ) : null}
          <div className={`grid ${compactTrigger ? 'gap-2.5' : 'gap-3'} ${projectOptions.length ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            {projectOptions.length && onProjectChange
              ? <WeeklyTaskPeriodOptionColumn heading="Visions" options={projectOptions} selectedValue={selectedProject} onSelect={onProjectChange} compact={compactTrigger} />
              : null}
            <WeeklyTaskPeriodOptionColumn heading="Quarter" options={quarterOptions} selectedValue={selectedQuarter} onSelect={onQuarterChange} compact={compactTrigger} />
            <WeeklyTaskPeriodOptionColumn heading="Month" options={monthOptions} selectedValue={selectedMonth} onSelect={onMonthChange} compact={compactTrigger} />
            <WeeklyTaskPeriodOptionColumn heading="Week" options={weekOptions} selectedValue={selectedWeek} onSelect={onWeekChange} compact={compactTrigger} />
          </div>

          <div className={`mt-2.5 flex flex-col gap-2 border border-slate-200 bg-slate-50/70 md:flex-row md:items-center md:justify-between ${
            compactTrigger ? 'rounded-[14px] px-3 py-2' : 'rounded-[22px] px-4 py-3.5'
          }`}>
            <div>
              <div className={`font-semibold uppercase tracking-[0.18em] text-slate-400 ${compactTrigger ? 'text-[9px]' : 'text-[11px]'}`}>Selected Period</div>
              <div className={`mt-0.5 font-semibold text-slate-900 ${compactTrigger ? 'text-[15px]' : 'text-[22px]'}`}>{summary}</div>
              <div className={`mt-0.5 text-slate-500 ${compactTrigger ? 'text-[10px]' : 'text-[13px]'}`}>{detail}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`inline-flex items-center justify-center rounded-full border border-slate-200 bg-white font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 ${
                compactTrigger ? 'px-4 py-1.5 text-[13px]' : 'px-6 py-3 text-[15px]'
              }`}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
