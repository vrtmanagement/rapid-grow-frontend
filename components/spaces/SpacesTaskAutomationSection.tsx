import React from 'react';
import { Mail, Plus, RefreshCw, X } from 'lucide-react';
import type { TaskCreateRecurrenceDraft } from '../../types/spaces';
import { ThemedSelect } from './SpacesFormControls';
import SpacesTaskCreateRecurrenceFields from './SpacesTaskCreateRecurrenceFields';
import SpacesWeeklyReminderFields from './SpacesWeeklyReminderFields';
import { EMAIL_REMINDER_GAP_OPTIONS } from './spacesEmailReminderOptions';

export type TaskAutomationMode = 'none' | 'mail_checklist' | 'repeating';

type SpacesTaskAutomationSectionProps = {
  canUseEmailChecklist: boolean;
  disabled?: boolean;
  mode: TaskAutomationMode;
  onModeChange: (mode: TaskAutomationMode) => void;
  taskTitle: string;
  emailChecklistExternalPerson: boolean;
  setEmailChecklistExternalPerson: (value: boolean) => void;
  externalAssigneeEmail: string;
  setExternalAssigneeEmail: (value: string) => void;
  externalAssigneeName: string;
  setExternalAssigneeName: (value: string) => void;
  onExternalAssigneeSelect?: () => void;
  additionalChecklistTitles: string[];
  setAdditionalChecklistTitles: (value: string[]) => void;
  reminderIntervalHours: string;
  setReminderIntervalHours: (value: string) => void;
  repeatEveryWeek: boolean;
  setRepeatEveryWeek: (value: boolean) => void;
  repeatCadence: string;
  setRepeatCadence: (value: string) => void;
  repeatWeekDays: string[];
  setRepeatWeekDays: (value: string[]) => void;
  repeatWeekTime: string;
  setRepeatWeekTime: (value: string) => void;
  repeatFromDate: string;
  setRepeatFromDate: (value: string) => void;
  repeatToDate: string;
  setRepeatToDate: (value: string) => void;
  taskRecurrence: TaskCreateRecurrenceDraft;
  setTaskRecurrence: React.Dispatch<React.SetStateAction<TaskCreateRecurrenceDraft>>;
  showExternalAssignee?: boolean;
  weeklyFieldName?: string;
};

const MODE_OPTIONS: Array<{
  value: Exclude<TaskAutomationMode, 'none'>;
  label: string;
  description: string;
  icon: React.ReactNode;
  requiresEmailChecklist?: boolean;
}> = [
  {
    value: 'mail_checklist',
    label: 'Mail checklist',
    description: 'Email work items and follow up on unfinished ones.',
    icon: <Mail size={15} />,
    requiresEmailChecklist: true,
  },
  {
    value: 'repeating',
    label: 'Repeating task',
    description: 'Create this task again on a schedule.',
    icon: <RefreshCw size={15} />,
  },
];

const sectionLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700';
const sectionHintClass = 'mt-1 text-[12px] leading-5 text-slate-500';

const ChoicePill: React.FC<{
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, disabled = false, onClick, children }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-3.5 text-[12px] font-semibold transition ${
      active
        ? 'border-brand-red bg-red-50 text-brand-red ring-2 ring-brand-red/10'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
    } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
  >
    {children}
  </button>
);

const SpacesTaskAutomationSection: React.FC<SpacesTaskAutomationSectionProps> = ({
  canUseEmailChecklist,
  disabled = false,
  mode,
  onModeChange,
  taskTitle,
  emailChecklistExternalPerson,
  setEmailChecklistExternalPerson,
  externalAssigneeEmail,
  setExternalAssigneeEmail,
  externalAssigneeName,
  setExternalAssigneeName,
  onExternalAssigneeSelect,
  additionalChecklistTitles,
  setAdditionalChecklistTitles,
  reminderIntervalHours,
  setReminderIntervalHours,
  repeatEveryWeek,
  setRepeatEveryWeek,
  repeatCadence,
  setRepeatCadence,
  repeatWeekDays,
  setRepeatWeekDays,
  repeatWeekTime,
  setRepeatWeekTime,
  repeatFromDate,
  setRepeatFromDate,
  repeatToDate,
  setRepeatToDate,
  taskRecurrence,
  setTaskRecurrence,
  showExternalAssignee = true,
  weeklyFieldName = 'automation-weekly-occurrences',
}) => {
  const visibleModeOptions = MODE_OPTIONS.filter(
    (option) => !option.requiresEmailChecklist || canUseEmailChecklist,
  );

  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-3.5">
      <div>
        <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-700">Task automation</div>
        <p className={sectionHintClass}>Optional. Select one automation type, or leave unselected for a regular task.</p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        {visibleModeOptions.map((option) => {
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onModeChange(active ? 'none' : option.value)}
              className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
                active
                  ? 'border-brand-red/40 bg-white ring-2 ring-brand-red/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  active ? 'border-brand-red bg-brand-red' : 'border-slate-300 bg-white'
                }`}
              >
                {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                  {option.icon}
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[12px] leading-5 text-slate-500">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {mode === 'mail_checklist' ? (
        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
          {showExternalAssignee ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className={sectionLabelClass}>1. Who receives the email?</div>
              <p className={sectionHintClass}>Pick a team member from Assignee, or send to someone outside your team.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ChoicePill
                  active={!emailChecklistExternalPerson}
                  disabled={disabled}
                  onClick={() => {
                    setEmailChecklistExternalPerson(false);
                    setExternalAssigneeEmail('');
                    setExternalAssigneeName('');
                  }}
                >
                  Team member
                </ChoicePill>
                <ChoicePill
                  active={emailChecklistExternalPerson}
                  disabled={disabled}
                  onClick={() => {
                    setEmailChecklistExternalPerson(true);
                    onExternalAssigneeSelect?.();
                  }}
                >
                  External person
                </ChoicePill>
              </div>

              {emailChecklistExternalPerson ? (
                <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
                      Recipient email *
                    </label>
                    <input
                      type="email"
                      value={externalAssigneeEmail}
                      onChange={(event) => setExternalAssigneeEmail(event.target.value)}
                      disabled={disabled}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:bg-slate-50"
                      placeholder="person@example.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
                      Recipient name
                    </label>
                    <input
                      value={externalAssigneeName}
                      onChange={(event) => setExternalAssigneeName(event.target.value)}
                      disabled={disabled}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:bg-slate-50"
                      placeholder="Optional — used in the email greeting"
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50/60 px-3 py-2 text-[12px] leading-5 text-red-800">
                  Use the Assignee field on the left to choose who gets the checklist email.
                </p>
              )}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className={sectionLabelClass}>{showExternalAssignee ? '2. ' : '1. '}Checklist items</div>
              <span className="text-[11px] text-slate-400">{1 + additionalChecklistTitles.length}/5</span>
            </div>
            <p className={sectionHintClass}>The main task name is always item 1. Add up to 4 more sub-tasks.</p>
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50/40 px-3 py-2 text-[12px] text-slate-700">
              1. {taskTitle.trim() || 'Enter the task name above'}
            </div>
            <div className="mt-2 space-y-2">
              {additionalChecklistTitles.map((taskItemTitle, index) => (
                <div key={`checklist-title-${index}`} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-slate-400">{index + 2}.</span>
                  <input
                    value={taskItemTitle}
                    onChange={(event) => {
                      const next = [...additionalChecklistTitles];
                      next[index] = event.target.value;
                      setAdditionalChecklistTitles(next);
                    }}
                    disabled={disabled}
                    className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:bg-slate-50"
                    placeholder={`Checklist task ${index + 2}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAdditionalChecklistTitles(
                        additionalChecklistTitles.filter((_: string, itemIndex: number) => itemIndex !== index),
                      )
                    }
                    disabled={disabled}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-60"
                    aria-label={`Remove checklist task ${index + 2}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            {additionalChecklistTitles.length < 4 ? (
              <button
                type="button"
                onClick={() => setAdditionalChecklistTitles([...additionalChecklistTitles, ''])}
                disabled={disabled}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-red hover:text-brand-navy disabled:opacity-60"
              >
                <Plus size={13} /> Add checklist task
              </button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className={sectionLabelClass}>{showExternalAssignee ? '3. ' : '2. '}Follow-up schedule</div>
            <p className={sectionHintClass}>Choose how unfinished checklist items should be reminded.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ChoicePill active={!repeatEveryWeek} disabled={disabled} onClick={() => setRepeatEveryWeek(false)}>
                Remind until done
              </ChoicePill>
              <ChoicePill active={repeatEveryWeek} disabled={disabled} onClick={() => setRepeatEveryWeek(true)}>
                Repeat on schedule
              </ChoicePill>
            </div>

            {repeatEveryWeek ? (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <SpacesWeeklyReminderFields
                  repeatCadence={repeatCadence}
                  setRepeatCadence={setRepeatCadence}
                  repeatWeekDays={repeatWeekDays}
                  setRepeatWeekDays={setRepeatWeekDays}
                  repeatWeekTime={repeatWeekTime}
                  setRepeatWeekTime={setRepeatWeekTime}
                  repeatFromDate={repeatFromDate}
                  setRepeatFromDate={setRepeatFromDate}
                  repeatToDate={repeatToDate}
                  setRepeatToDate={setRepeatToDate}
                  disabled={disabled}
                  fieldName={weeklyFieldName}
                />
              </div>
            ) : (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
                  Reminder frequency
                </label>
                <ThemedSelect
                  value={reminderIntervalHours}
                  onChange={setReminderIntervalHours}
                  options={EMAIL_REMINDER_GAP_OPTIONS}
                  compact={true}
                  fullWidthCompact={true}
                  disabled={disabled}
                />
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  Sends another email if checklist items are still incomplete.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {mode === 'repeating' ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <SpacesTaskCreateRecurrenceFields
            taskRecurrence={taskRecurrence}
            setTaskRecurrence={setTaskRecurrence}
            embedded={true}
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  );
};

export default SpacesTaskAutomationSection;
