import React from 'react';
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  PenLine,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import ReflectionHabitsCard from '../components/reflection/ReflectionHabitsCard';
import { ReflectionField } from './ReflectionField';
import type { PlanningState } from '../types';
import type { ReflectionRecord } from './reflectionViewHelpers';
import { getUserTimeZone } from '../utils/timezone';

export type ReflectionFormPanelProps = {
  state: PlanningState;
  todayKey: string;
  editingId: string | null;
  myTodayRecord: ReflectionRecord | null | undefined;
  handleAccomplishmentsChange: (value: string) => void;
  handleChange: (key: keyof PlanningState['reflection'], val: string) => void;
  taskSyncHint?: string;
  importedTaskCount: number;
  syncLoading: boolean;
  tomorrowPreviewTasks: string[];
  error: string | null;
  successMessage: string | null;
  handleSave: () => void;
  saving: boolean;
};

export const ReflectionFormPanel: React.FC<ReflectionFormPanelProps> = ({
  state,
  todayKey,
  editingId,
  myTodayRecord,
  handleAccomplishmentsChange,
  handleChange,
  taskSyncHint,
  importedTaskCount,
  syncLoading,
  tomorrowPreviewTasks,
  error,
  successMessage,
  handleSave,
  saving,
}) => (
  <div className="mx-auto max-w-6xl scroll-mt-24 pt-2">
    <div className="grid gap-8 lg:grid-cols-12">
      <aside className="lg:col-span-4">
        <div className="lg:sticky lg:top-[4.75rem] lg:z-10">
          <ReflectionHabitsCard error={null} />
        </div>
      </aside>

      <div className="min-w-0 lg:col-span-8">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="relative border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-red-50/40 px-6 py-5 sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-red">Daily report</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">End of Day Report</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {new Intl.DateTimeFormat('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    timeZone: getUserTimeZone(),
                  }).format(new Date(`${todayKey}T12:00:00`))}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {editingId ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    <PenLine size={14} />
                    Editing entry
                  </span>
                ) : myTodayRecord ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 size={14} />
                    Submitted today
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    <Sparkles size={14} className="text-brand-red" />
                    Ready to submit
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <ReflectionField
              step={1}
              label="What did you accomplish today?"
              value={state.reflection.accomplishments}
              onChange={handleAccomplishmentsChange}
              icon={<Zap className="text-brand-red" size={20} />}
              placeholder="Summarize wins, deliveries, and momentum you created today..."
              helper={taskSyncHint}
              footer={
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                    ✓ Synced from TaskHub
                  </span>
                  <span className="text-slate-500">
                    {importedTaskCount} TaskHub task{importedTaskCount === 1 ? '' : 's'} imported
                  </span>
                  {syncLoading ? <span className="text-slate-400">Refreshing...</span> : null}
                </div>
              }
            />

            <ReflectionField
              step={2}
              label="What didn’t go well? What did you learn?"
              value={state.reflection.mistakes}
              onChange={(v) => handleChange('mistakes', v)}
              icon={<AlertCircle className="text-brand-red" size={20} />}
              placeholder="Capture setbacks honestly and what you will do differently..."
            />

            <ReflectionField
              step={3}
              label="What was left unfinished or deferred?"
              value={state.reflection.forgotten}
              onChange={(v) => handleChange('forgotten', v)}
              icon={<ShieldCheck className="text-slate-700" size={20} />}
              placeholder="Note open loops so they do not get lost overnight..."
            />

            <ReflectionField
              step={4}
              label="When did you feel most energized?"
              value={state.reflection.energyPeaks}
              onChange={(v) => handleChange('energyPeaks', v)}
              icon={<BrainCircuit className="text-brand-red" size={20} />}
              placeholder="Morning focus block, collaboration, deep work — what gave you energy?"
            />

            <div className="relative overflow-hidden rounded-2xl border border-brand-red/20 bg-gradient-to-br from-red-50 via-white to-white p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand-red/10 blur-2xl" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red text-white shadow-md shadow-brand-red/25">
                    <Target size={18} />
                  </span>
                  <div>
                    <label className="text-base font-semibold text-slate-900">Top priorities for tomorrow</label>
                    <p className="mt-1 text-sm text-slate-500">
                      Tasks added here will automatically appear in your TaskHub for tomorrow.
                    </p>
                  </div>
                </div>
                <textarea
                  value={state.reflection.bigRocksTomorrow}
                  onChange={(e) => handleChange('bigRocksTomorrow', e.target.value)}
                  rows={4}
                  className="w-full resize-none overflow-y-auto rounded-xl border border-brand-red/15 bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10"
                  placeholder="List the 1–3 most important tasks to start tomorrow with clarity."
                />
                <div className="rounded-xl border border-brand-red/10 bg-white/80 px-4 py-3">
                  <p className="text-sm font-medium text-slate-700">
                    {tomorrowPreviewTasks.length
                      ? `${tomorrowPreviewTasks.length} task${tomorrowPreviewTasks.length === 1 ? '' : 's'} will be created in TaskHub.`
                      : 'Add tomorrow priorities to preview the tasks that will be created in TaskHub.'}
                  </p>
                  {tomorrowPreviewTasks.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tomorrowPreviewTasks.slice(0, 6).map((task) => (
                        <span
                          key={task}
                          className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-brand-red"
                        >
                          {task}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-5 sm:px-8">
            {error ? (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            ) : null}
            {successMessage ? (
              <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </p>
            ) : null}
            {!editingId && myTodayRecord ? (
              <p className="mb-4 text-sm text-slate-600">
                You already submitted today&apos;s report. Use <span className="font-semibold">All Logs</span> to edit if needed.
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!!myTodayRecord && !editingId)}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-brand-red to-[#c41e24] px-6 py-4 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(230,28,33,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(230,28,33,0.32)] hover:from-brand-navy hover:to-slate-900 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <Send size={20} className="-rotate-45" />
              {saving ? 'Saving...' : editingId ? 'Save updates' : 'Submit daily report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
