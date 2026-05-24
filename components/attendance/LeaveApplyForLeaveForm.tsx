import React, { RefObject } from 'react';
import { CalendarDays, ChevronDown, Sparkles, Wand2 } from 'lucide-react';
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
  filteredSuggestions: string[];
  selectedLeaveTypeOption: (typeof LEAVE_TYPE_OPTIONS)[number];
  onSubmitLeave: () => void;
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
  filteredSuggestions,
  selectedLeaveTypeOption,
  onSubmitLeave,
}) => {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red">
            <Sparkles size={14} />
            Leave request
          </div>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">Apply for leave</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Submit leave in a structured way with smart suggestions, auto day calculation, and a backend-ready workflow.
          </p>
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
        <button
          type="button"
          onClick={() => setActivePopup((prev) => (prev === 'reason' ? null : 'reason'))}
          className={`w-full rounded-[24px] border px-4 py-3 text-left outline-none transition ${
            activePopup === 'reason'
              ? 'border-brand-red/35 bg-white ring-4 ring-brand-red/10'
              : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-sm ${leaveReason ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
                {leaveReason || 'Add the reason for your leave request'}
              </p>
              <p className="mt-2 text-xs text-slate-400">Open a focused writing panel with smart suggestions</p>
            </div>
            <Wand2 size={18} className={activePopup === 'reason' ? 'text-brand-red' : 'text-slate-400'} />
          </div>
        </button>

        {activePopup === 'reason' ? (
          <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-30 rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.14)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reason details</p>
                <h4 className="mt-1 text-sm font-semibold text-slate-900">Write a clear approver note</h4>
              </div>
              <button
                type="button"
                onClick={() => setActivePopup(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <textarea
              value={leaveReason}
              onChange={(e) => onChangeReason(e.target.value)}
              rows={5}
              autoFocus
              className="mt-4 w-full rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-red/35 focus:bg-white focus:ring-4 focus:ring-brand-red/10"
              placeholder="Add the reason for your leave request"
            />

            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <Wand2 size={13} />
                Smart suggestions
              </div>
              <div className="grid gap-2">
                {filteredSuggestions.slice(0, 4).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onChangeReason(suggestion)}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-left text-sm text-slate-600 transition hover:border-brand-red/20 hover:bg-white hover:text-slate-900"
                  >
                    <span>{suggestion}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Use</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
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
              <p className="mt-1 text-xs text-slate-400">{selectedLeaveTypeOption.description}</p>
            </div>
            <ChevronDown size={18} className={activePopup === 'type' ? 'text-brand-red' : 'text-slate-400'} />
          </button>

          {activePopup === 'type' ? (
            <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-30 rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.14)] animate-in fade-in zoom-in-95 duration-200">
              <div className="mb-2 px-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Leave type</p>
                <h4 className="mt-1 text-sm font-semibold text-slate-900">Choose the best category</h4>
              </div>
              <div className="grid gap-2">
                {LEAVE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChangeType(option.value);
                      setActivePopup(null);
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      leaveType === option.value
                        ? 'border-brand-red/25 bg-brand-red/5 shadow-sm'
                        : `${option.tone} hover:shadow-sm`
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

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
