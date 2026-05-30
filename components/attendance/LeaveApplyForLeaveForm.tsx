import React, { RefObject, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronDown, Sparkles, X } from 'lucide-react';
import { LeaveLopEvaluation } from './attendanceUtils';
import DatePickerPopup from './DatePickerPopup';
import { LEAVE_TYPE_OPTIONS, formatDisplayDate, ActivePopup } from './leaveManagementPanelUtils';
import { formatLeaveDayCount } from './attendanceUtils';

type LeaveTypeValue = (typeof LEAVE_TYPE_OPTIONS)[number]['value'];

interface LeaveApplyForLeaveFormProps {
  leaveStart: string;
  leaveEnd: string;
  leaveReason: string;
  leaveType: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onChangeReason: (value: string) => void;
  onChangeType: (value: string) => void;
  activePopup: ActivePopup;
  setActivePopup: React.Dispatch<React.SetStateAction<ActivePopup>>;
  startFieldRef: RefObject<HTMLDivElement | null>;
  endFieldRef: RefObject<HTMLDivElement | null>;
  reasonFieldRef: RefObject<HTMLDivElement | null>;
  typeFieldRef: RefObject<HTMLDivElement | null>;
  hasInvalidRange: boolean;
  calculatedDays: number;
  selectedLeaveTypeOption: (typeof LEAVE_TYPE_OPTIONS)[number];
  onSubmitLeave: () => void;
  lopPreviewLoading?: boolean;
  lopEvaluation?: LeaveLopEvaluation | null;
}

const LeaveApplyForLeaveForm: React.FC<LeaveApplyForLeaveFormProps> = ({
  leaveStart,
  leaveEnd,
  leaveReason,
  leaveType,
  onChangeStart,
  onChangeEnd,
  onChangeReason,
  onChangeType,
  activePopup,
  setActivePopup,
  startFieldRef,
  endFieldRef,
  reasonFieldRef,
  typeFieldRef,
  hasInvalidRange,
  calculatedDays,
  selectedLeaveTypeOption,
  onSubmitLeave,
  lopPreviewLoading = false,
  lopEvaluation = null,
}) => {
  const [typePopupPlacement, setTypePopupPlacement] = useState<'top' | 'bottom'>('bottom');
  const reasonTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (activePopup !== 'type') return undefined;

    const updateTypePopupPlacement = () => {
      const field = typeFieldRef.current;
      if (!field) {
        setTypePopupPlacement('bottom');
        return;
      }

      const rect = field.getBoundingClientRect();
      const estimatedPopupHeight = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < estimatedPopupHeight && spaceAbove > spaceBelow) {
        setTypePopupPlacement('top');
        return;
      }

      setTypePopupPlacement('bottom');
    };

    updateTypePopupPlacement();
    window.addEventListener('resize', updateTypePopupPlacement);
    window.addEventListener('scroll', updateTypePopupPlacement, true);

    return () => {
      window.removeEventListener('resize', updateTypePopupPlacement);
      window.removeEventListener('scroll', updateTypePopupPlacement, true);
    };
  }, [activePopup, typeFieldRef]);

  useEffect(() => {
    const textarea = reasonTextareaRef.current;
    if (!textarea) return;

    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 24;
    const minRows = 2;
    const maxRows = 4;
    const verticalPadding =
      (Number.parseFloat(computedStyle.paddingTop) || 0) + (Number.parseFloat(computedStyle.paddingBottom) || 0);
    const borderHeight =
      (Number.parseFloat(computedStyle.borderTopWidth) || 0) + (Number.parseFloat(computedStyle.borderBottomWidth) || 0);
    const minHeight = lineHeight * minRows + verticalPadding + borderHeight;
    const maxHeight = lineHeight * maxRows + verticalPadding + borderHeight;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [leaveReason]);

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red">
            <Sparkles size={14} />
            Leave request
          </div>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">Apply for leave</h3>
        
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Duration</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {hasInvalidRange ? 'Invalid range' : formatLeaveDayCount(calculatedDays)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="relative" ref={startFieldRef}>
          <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">From date</span>
          <button
            type="button"
            onClick={() => setActivePopup((prev) => (prev === 'start' ? null : 'start'))}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm outline-none transition ${
              activePopup === 'start'
                ? 'border-brand-red/35 bg-white ring-4 ring-brand-red/10'
                : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div>
              <p className="font-semibold text-slate-900">{formatDisplayDate(leaveStart)}</p>
              <p className="mt-1 text-xs text-slate-400">Choose the first day of leave</p>
            </div>
            <CalendarDays size={18} className={activePopup === 'start' ? 'text-brand-red' : 'text-slate-400'} />
          </button>
          {activePopup === 'start' ? (
            <DatePickerPopup
              value={leaveStart}
              onSelect={(value) => {
                onChangeStart(value);
                if (leaveEnd && leaveEnd < value) {
                  onChangeEnd(value);
                }
              }}
              onClose={() => setActivePopup(null)}
            />
          ) : null}
        </div>

        <div className="relative" ref={endFieldRef}>
          <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">To date</span>
          <button
            type="button"
            onClick={() => setActivePopup((prev) => (prev === 'end' ? null : 'end'))}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm outline-none transition ${
              activePopup === 'end'
                ? 'border-brand-red/35 bg-white ring-4 ring-brand-red/10'
                : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div>
              <p className="font-semibold text-slate-900">{formatDisplayDate(leaveEnd)}</p>
              <p className="mt-1 text-xs text-slate-400">Choose the last day of leave</p>
            </div>
            <CalendarDays size={18} className={activePopup === 'end' ? 'text-brand-red' : 'text-slate-400'} />
          </button>
          {activePopup === 'end' ? (
            <DatePickerPopup
              value={leaveEnd || leaveStart}
              onSelect={(value) => {
                onChangeEnd(value);
                if (!leaveStart || leaveStart > value) {
                  onChangeStart(value);
                }
              }}
              onClose={() => setActivePopup(null)}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">
          Total Days: <span className="text-brand-red">{formatLeaveDayCount(calculatedDays)}</span>
        </p>
        <p className="text-xs text-slate-500">Only Sundays are excluded from the leave duration.</p>
        {hasInvalidRange ? (
          <p className="text-xs font-semibold text-rose-600">The end date cannot be earlier than the start date.</p>
        ) : null}
      </div>

      <div className="relative mt-4" ref={reasonFieldRef}>
        <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">Reason</span>
        <div className="relative rounded-[24px] border border-slate-200 bg-white p-4 transition focus-within:border-brand-red/35 focus-within:ring-4 focus-within:ring-brand-red/10">
          <button
            type="button"
            onClick={() => onChangeReason('')}
            disabled={!leaveReason}
            aria-label="Clear leave reason"
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={14} />
          </button>
          <div className="flex items-start justify-between gap-3">
            <textarea
              ref={reasonTextareaRef}
              value={leaveReason}
              onChange={(e) => onChangeReason(e.target.value)}
              rows={2}
              className="min-h-[56px] max-h-[112px] w-full resize-none overflow-y-hidden bg-transparent pr-12 text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Type your leave reason here."
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="relative" ref={typeFieldRef}>
          <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">Leave type</span>
          <button
            type="button"
            onClick={() => setActivePopup((prev) => (prev === 'type' ? null : 'type'))}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left outline-none transition ${
              activePopup === 'type'
                ? 'border-brand-red/35 bg-white ring-4 ring-brand-red/10'
                : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{selectedLeaveTypeOption.label}</p>
            </div>
            <ChevronDown size={18} className={activePopup === 'type' ? 'text-brand-red' : 'text-slate-400'} />
          </button>

          {activePopup === 'type' ? (
            <div className={`absolute left-0 right-0 z-30 rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.14)] animate-in fade-in zoom-in-95 duration-200 ${
              typePopupPlacement === 'top' ? 'bottom-[calc(100%+12px)]' : 'top-[calc(100%+12px)]'
            }`}>
              <div className="mb-2 px-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Leave type</p>
                <h4 className="mt-1 text-sm font-semibold text-slate-900">Choose the best category</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LEAVE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChangeType(option.value);
                      setActivePopup(null);
                    }}
                    className={`rounded-2xl border bg-white px-4 py-3 text-left transition ${
                      leaveType === option.value
                        ? 'border-brand-red/35 shadow-[0_10px_22px_rgba(239,68,68,0.08)]'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {lopPreviewLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500 animate-pulse">
            Checking LOP policy…
          </div>
        ) : null}

        {!lopPreviewLoading && lopEvaluation?.warningAtApply && lopEvaluation.warningMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/90 px-4 py-4 shadow-[0_12px_30px_rgba(245,158,11,0.12)]">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">LOP policy warning</p>
                <p className="mt-1 text-sm leading-6 text-amber-800">{lopEvaluation.warningMessage}</p>
                {typeof lopEvaluation.advanceNoticeHours === 'number' ? (
                  <p className="mt-2 text-xs text-amber-700/90">
                    Advance notice: {lopEvaluation.advanceNoticeHours}h (required:{' '}
                    {lopEvaluation.requiredAdvanceHours}h)
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onSubmitLeave}
          className="inline-flex items-center justify-center rounded-2xl bg-brand-red px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-red-600"
        >
          Submit leave request
        </button>
      </div>
    </section>
  );
};

export default LeaveApplyForLeaveForm;
