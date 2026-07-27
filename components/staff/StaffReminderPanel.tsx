import React from 'react';
import { BellRing, ChevronDown, Clock3 } from 'lucide-react';
import WeeklyPerformanceEmailControls from './WeeklyPerformanceEmailControls';
import {
  REMINDER_HOUR_OPTIONS,
  REMINDER_MERIDIEM_OPTIONS,
  REMINDER_MINUTE_OPTIONS,
} from './staffViewHelpers';

type StaffReminderPanelProps = { ctx: Record<string, any> };

const StaffReminderPanel: React.FC<StaffReminderPanelProps> = ({ ctx }) => {
  const {
    canShowReminderControls,
    checkInControlsTab,
    setCheckInControlsTab,
    reminderLoading,
    reminderDraft,
    setReminderDraft,
    reminderStatusChipLabel,
    reminderSettings,
    reminderScheduleLabel,
    reminderDraftScheduleLabel,
    timePickerOpen,
    setTimePickerOpen,
    timePickerRef,
    reminderTimeSelection,
    handleReminderTimePartChange,
    reminderError,
    reminderDirty,
    reminderSaving,
    handleSaveReminderSettings,
    setToast,
  } = ctx;

  return (
    <>
{canShowReminderControls ? (
  <div className="rounded-xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
    <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-red-50 text-brand-red">
          <BellRing size={20} />
        </div>
        <div>
          <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
            Check-in & performance email
          </h3>
          <p className="mt-1 text-[14px] text-slate-500">
            Daily check-in reminders and automated weekly performance reports for employees on the main execution matrix.
          </p>
          <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setCheckInControlsTab('daily')}
              className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                checkInControlsTab === 'daily'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Daily check-in
            </button>
            <button
              type="button"
              onClick={() => setCheckInControlsTab('weekly')}
              className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                checkInControlsTab === 'weekly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Weekly performance email
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex rounded-full px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] ${
            reminderLoading
              ? 'border border-slate-200 bg-slate-50 text-slate-500'
              : reminderDraft.enabled
                ? 'border border-emerald-600 bg-emerald-600 text-white'
                : 'border border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          {reminderLoading ? 'LOADING' : reminderStatusChipLabel}
        </span>
        <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {reminderSettings.timezone || 'Asia/Kolkata'}
        </span>
      </div>
    </div>

    {checkInControlsTab === 'weekly' ? (
      <WeeklyPerformanceEmailControls
        onToast={(type, message) => setToast({ type, message })}
      />
    ) : (
    <div className="grid gap-5 px-6 py-5 xl:grid-cols-[1.25fr_minmax(360px,0.95fr)]">
        <div className="self-start rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.18),_rgba(255,255,255,0)_48%),linear-gradient(180deg,rgba(255,251,243,1)_0%,rgba(255,255,255,1)_100%)] px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm">
              <Clock3 size={20} />
            </div>
            <div>
              <h4 className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900">
                Current schedule
              </h4>
              <p className="mt-3 text-[14px] leading-7 text-slate-600">
                {reminderSettings.enabled
                  ? `The daily reminder is scheduled for all staff members at ${reminderScheduleLabel}.`
                  : 'The daily reminder is currently paused for all staff members.'}
              </p>
              <p className="mt-4 text-[14px] leading-7 text-slate-500">
                This setting controls the daily reminder email and the reminder notification timing together.
              </p>
            </div>
          </div>
        </div>

      <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="rounded-[20px] border border-slate-200 bg-slate-50/40 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
                Reminder status
              </h4>
              <p className="mt-1 text-[14px] text-slate-500">
                Turn the daily reminder on or off for everyone.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={reminderDraft.enabled}
              onClick={() =>
                setReminderDraft((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              disabled={reminderLoading || reminderSaving}
              className={`relative h-9 w-[62px] rounded-full transition ${
                reminderDraft.enabled ? 'bg-emerald-500' : 'bg-slate-300'
              } disabled:cursor-not-allowed disabled:opacity-60`}
              aria-label="Toggle reminder status"
            >
              <span
                className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition ${
                  reminderDraft.enabled ? 'left-[30px]' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-3 block text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
            Reminder time
          </label>
          <div className="relative" ref={timePickerRef}>
            <button
              type="button"
              onClick={() => setTimePickerOpen((prev) => !prev)}
              disabled={reminderLoading || reminderSaving}
              className={`flex w-full items-center justify-between rounded-[20px] border bg-white px-5 py-3.5 text-left transition ${
                timePickerOpen
                  ? 'border-slate-900 shadow-[0_0_0_3px_rgba(244,63,94,0.10)]'
                  : 'border-slate-200 hover:border-slate-300'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-slate-50 text-slate-700">
                  <Clock3 size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
                    {reminderDraftScheduleLabel}
                  </div>
                  <div className="mt-1 text-[12px] uppercase tracking-[0.16em] text-slate-400">
                    Custom time picker
                  </div>
                </div>
              </div>

              <ChevronDown
                size={20}
                className={`shrink-0 text-slate-400 transition ${timePickerOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {timePickerOpen ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                <div className="grid grid-cols-[1fr_1fr_110px] gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Hour
                    </p>
                    <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-[20px] border border-slate-200 bg-slate-50/80 p-3">
                      {REMINDER_HOUR_OPTIONS.map((hour) => {
                        const selected = reminderTimeSelection.hour === hour;
                        return (
                          <button
                            key={hour}
                            type="button"
                            onClick={() => handleReminderTimePartChange('hour', hour)}
                            className={`flex w-full items-center justify-center rounded-2xl px-3 py-3 text-[14px] font-semibold transition ${
                              selected
                                ? 'bg-red-500 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                            }`}
                          >
                            {hour}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Minute
                    </p>
                    <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-[20px] border border-slate-200 bg-slate-50/80 p-3">
                      {REMINDER_MINUTE_OPTIONS.map((minute) => {
                        const selected = reminderTimeSelection.minute === minute;
                        return (
                          <button
                            key={minute}
                            type="button"
                            onClick={() => handleReminderTimePartChange('minute', minute)}
                            className={`flex w-full items-center justify-center rounded-2xl px-3 py-3 text-[14px] font-semibold transition ${
                              selected
                                ? 'bg-red-500 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                            }`}
                          >
                            {minute}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Period
                    </p>
                    <div className="mt-2 space-y-2 rounded-[20px] border border-slate-200 bg-slate-50/80 p-3">
                      {REMINDER_MERIDIEM_OPTIONS.map((meridiem) => {
                        const selected = reminderTimeSelection.meridiem === meridiem;
                        return (
                          <button
                            key={meridiem}
                            type="button"
                            onClick={() => handleReminderTimePartChange('meridiem', meridiem)}
                            className={`flex w-full items-center justify-center rounded-2xl px-3 py-4 text-[14px] font-semibold transition ${
                              selected
                                ? 'bg-red-500 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                            }`}
                          >
                            {meridiem}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Selected time
                    </p>
                    <p className="mt-1 text-[14px] font-semibold text-slate-900">
                      {reminderDraftScheduleLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTimePickerOpen(false)}
                    className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-7 text-slate-500">
          Time is stored in {reminderSettings.timezone || 'Asia/Kolkata'} and applied to both email and
          notification reminders.
        </p>

        {reminderError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {reminderError}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-slate-500">
            {reminderLoading
              ? 'Loading reminder settings...'
              : reminderDirty
                ? 'You have unsaved reminder changes.'
                : 'Reminder settings are up to date.'}
          </p>

          <button
            type="button"
            onClick={handleSaveReminderSettings}
            disabled={reminderLoading || reminderSaving || !reminderDirty}
            className="inline-flex items-center justify-center rounded-full bg-[#f87171] px-6 py-3 text-[15px] font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reminderSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
    )}
  </div>
) : null}
    </>
  );
};

export default StaffReminderPanel;
