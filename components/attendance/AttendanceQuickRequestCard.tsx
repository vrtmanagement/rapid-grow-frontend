import React, { useEffect, useState } from 'react';
import { ChevronRight, Hourglass, SendHorizontal } from 'lucide-react';
import { LeaveRequest } from './attendanceUtils';

interface AttendanceQuickRequestCardProps {
  onQuickHalfDayRequest: (
    dayPortion: 'FIRST_HALF' | 'SECOND_HALF',
    reason: string,
  ) => Promise<{ ok: boolean; message: string }>;
  onRevertHalfDayRequest: (request: LeaveRequest) => Promise<{ ok: boolean; message: string }>;
  halfDayRequestLoading: boolean;
  todaysHalfDayRequest: LeaveRequest | null;
}

const HALF_DAY_SLOT_OPTIONS = [
  { value: 'FIRST_HALF' as const, label: 'First Half' },
  { value: 'SECOND_HALF' as const, label: 'Second Half' },
];

function getHalfDaySlotLabel(value?: string | null) {
  return value === 'SECOND_HALF' ? 'Second Half' : 'First Half';
}

const AttendanceQuickRequestCard: React.FC<AttendanceQuickRequestCardProps> = ({
  onQuickHalfDayRequest,
  onRevertHalfDayRequest,
  halfDayRequestLoading,
  todaysHalfDayRequest,
}) => {
  const [open, setOpen] = useState(false);
  const [halfDaySlot, setHalfDaySlot] = useState<'FIRST_HALF' | 'SECOND_HALF'>('SECOND_HALF');
  const [halfDayReason, setHalfDayReason] = useState('');
  const [quickRequestFeedback, setQuickRequestFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!todaysHalfDayRequest) return;
    if (todaysHalfDayRequest.dayPortion === 'FIRST_HALF' || todaysHalfDayRequest.dayPortion === 'SECOND_HALF') {
      setHalfDaySlot(todaysHalfDayRequest.dayPortion);
    }
  }, [todaysHalfDayRequest]);

  const quickRequestStatusTone = (() => {
    if (!todaysHalfDayRequest) return null;
    if (todaysHalfDayRequest.status === 'APPROVED') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    if (todaysHalfDayRequest.status === 'PENDING') {
      return 'border-amber-200 bg-amber-50 text-amber-700';
    }
    return 'border-rose-200 bg-rose-50 text-rose-700';
  })();

  const halfDayLocked = !!todaysHalfDayRequest && todaysHalfDayRequest.status !== 'REJECTED';

  const handleHalfDaySubmit = async () => {
    const result = await onQuickHalfDayRequest(
      halfDaySlot,
      halfDayReason.trim() || `Half-day request for ${getHalfDaySlotLabel(halfDaySlot)}`,
    );

    setQuickRequestFeedback({
      tone: result.ok ? 'success' : 'error',
      message: result.message,
    });

    if (result.ok) {
      setHalfDayReason('');
    }
  };

  const handleHalfDayRevert = async () => {
    if (!todaysHalfDayRequest) return;

    const result = await onRevertHalfDayRequest(todaysHalfDayRequest);
    setQuickRequestFeedback({
      tone: result.ok ? 'success' : 'error',
      message: result.message,
    });

    if (result.ok) {
      setHalfDayReason('');
    }
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-2.5">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex w-full items-center justify-between gap-3 rounded-[18px] px-2 py-2 text-left transition"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-amber-50 text-amber-500">
            <Hourglass size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quick requests</p>
            <p className="mt-0.5 truncate text-[0.95rem] font-semibold text-slate-900">Apply for Half-Day</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {todaysHalfDayRequest ? (
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${quickRequestStatusTone}`}>
              {todaysHalfDayRequest.status}
            </span>
          ) : null}
          <ChevronRight
            size={18}
            className={`shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
          />
        </div>
      </button>

      <div
        className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
          open ? 'mt-2 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-slate-200 px-2 pt-3">
            {todaysHalfDayRequest ? (
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600">
                <div className="flex items-center justify-between gap-4">
                  <span>Requested slot</span>
                  <span className="font-medium text-slate-900">
                    {getHalfDaySlotLabel(todaysHalfDayRequest.dayPortion)}
                  </span>
                </div>
                <div className="mt-2 flex items-start justify-between gap-4 border-t border-slate-200 pt-2">
                  <span>Reason</span>
                  <span className="max-w-[220px] text-right text-slate-700">
                    {todaysHalfDayRequest.reason || 'Half-day request submitted'}
                  </span>
                </div>
              </div>
            ) : null}

            <div className={`${todaysHalfDayRequest ? 'mt-3' : ''} grid grid-cols-2 gap-2.5`}>
              {HALF_DAY_SLOT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setHalfDaySlot(option.value)}
                  disabled={halfDayLocked || halfDayRequestLoading}
                  className={`rounded-[18px] border px-3 py-2.5 text-left transition ${
                    halfDaySlot === option.value
                      ? 'border-emerald-300 bg-emerald-50 text-slate-900'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                  } ${halfDayLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <p className={`text-[1rem] font-semibold tracking-[-0.01em] ${halfDaySlot === option.value ? 'text-slate-900' : 'text-slate-700'}`}>
                    {option.label}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-2.5">
              <textarea
                value={halfDayReason}
                onChange={(event) => setHalfDayReason(event.target.value)}
                rows={2}
                disabled={halfDayLocked || halfDayRequestLoading}
                placeholder="Optional note for your approver"
                className={`w-full rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-300/50 ${
                  halfDayLocked ? 'cursor-not-allowed opacity-60' : ''
                }`}
              />
            </div>

            {quickRequestFeedback ? (
              <p
                className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                  quickRequestFeedback.tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {quickRequestFeedback.message}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleHalfDaySubmit}
              disabled={halfDayLocked || halfDayRequestLoading}
              className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[18px] px-4 py-2.5 text-[0.95rem] font-semibold transition ${
                halfDayLocked
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                  : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
              }`}
            >
              {halfDayRequestLoading ? (
                <span className="h-4 w-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
              ) : (
                <SendHorizontal size={16} />
              )}
              {halfDayRequestLoading ? 'Submitting...' : halfDayLocked ? 'Half-day already requested' : 'Submit half-day request'}
            </button>

            {todaysHalfDayRequest ? (
              <button
                type="button"
                onClick={handleHalfDayRevert}
                disabled={halfDayRequestLoading}
                className={`mt-2 inline-flex w-full items-center justify-center rounded-[18px] border border-slate-200 px-4 py-2.5 text-[0.95rem] font-semibold transition ${
                  halfDayRequestLoading
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {halfDayRequestLoading ? 'Updating...' : 'Revert half-day request'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceQuickRequestCard;
