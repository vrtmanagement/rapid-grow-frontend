import React from 'react';
import { Trash2 } from 'lucide-react';
import {
  apiDeleteContentDraft,
  ContentDraftMode,
  ContentDraftRecord,
} from '../../services/contentApi';
import {
  CONTENT_CREATE_DRAFT_STORAGE_PREFIX,
  hasServerDraftContent,
  toDateKey,
} from '../../views/contentViewShared';

type ScheduleDraftRecord = { fromDate: string; toDate: string; topic: string; text: string };

interface SavedDraftsPanelProps {
  savedDrafts: Partial<Record<ContentDraftMode, ContentDraftRecord | null>>;
  scheduleDraft: ScheduleDraftRecord | null;
  deletingDraftMode: ContentDraftMode | null;
  setDeletingDraftMode: (mode: ContentDraftMode | null) => void;
  setSavedDrafts: React.Dispatch<React.SetStateAction<Partial<Record<ContentDraftMode, ContentDraftRecord | null>>>>;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
  selectedDate: string;
  navigate: (to: string) => void;
  momentDraftStorageKey: string;
  setMomentTopic: (value: string) => void;
  setMomentText: (value: string) => void;
  setEditingMomentId: (value: string | null) => void;
  setScheduleDraft: (value: ScheduleDraftRecord | null) => void;
  setScheduleAutosaveStatus: (value: 'idle' | 'saving' | 'saved' | 'error') => void;
  setActiveTab: (value: any) => void;
  setMomentFromDate: (value: string) => void;
  setMomentToDate: (value: string) => void;
  setShowScheduleForm: (value: boolean) => void;
}

const DRAFT_MODES: ContentDraftMode[] = ['calendar', 'follow-ee', 'follow-ega'];

const SavedDraftsPanel: React.FC<SavedDraftsPanelProps> = ({
  savedDrafts,
  scheduleDraft,
  deletingDraftMode,
  setDeletingDraftMode,
  setSavedDrafts,
  setToast,
  selectedDate,
  navigate,
  momentDraftStorageKey,
  setMomentTopic,
  setMomentText,
  setEditingMomentId,
  setScheduleDraft,
  setScheduleAutosaveStatus,
  setActiveTab,
  setMomentFromDate,
  setMomentToDate,
  setShowScheduleForm,
}) => {
  const hasAnyDraft =
    DRAFT_MODES.some((mode) => hasServerDraftContent(savedDrafts[mode] || null)) || !!scheduleDraft;

  if (!hasAnyDraft) return null;

  return (
    <div className="w-full max-w-full rounded-[1.6rem] border border-violet-100 bg-white px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700">Saved drafts</h3>
        <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-medium text-violet-700">
          Resume unsaved content
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
        {DRAFT_MODES.map((mode) => {
          const draft = savedDrafts[mode] || null;
          if (!hasServerDraftContent(draft)) return null;
          const modeLabel = mode === 'calendar' ? 'Calendar' : mode === 'follow-ee' ? 'Follow Reminder EE' : 'Follow Reminder EGA';
          return (
            <div
              key={mode}
              className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50/40"
            >
              <button
                type="button"
                onClick={async (event) => {
                  event.stopPropagation();
                  if (deletingDraftMode) return;
                  setDeletingDraftMode(mode);
                  try {
                    await apiDeleteContentDraft(mode);
                    localStorage.removeItem(`${CONTENT_CREATE_DRAFT_STORAGE_PREFIX}:${mode}`);
                    setSavedDrafts((prev) => ({ ...prev, [mode]: null }));
                    setToast({ message: 'Draft deleted.', type: 'success' });
                  } catch (err: any) {
                    setToast({ message: err?.message || 'Failed to delete draft', type: 'error' });
                  } finally {
                    setDeletingDraftMode(null);
                  }
                }}
                className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                title="Delete draft"
                aria-label="Delete draft"
                disabled={deletingDraftMode === mode}
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/content/new?mode=${encodeURIComponent(mode)}&date=${encodeURIComponent(draft?.contentDate || selectedDate || toDateKey(new Date()))}`)}
                className="block w-full pr-8 text-left"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{modeLabel}</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">{String(draft?.title || 'Untitled draft')}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                  {String(draft?.description || 'No description yet')}
                </p>
              </button>
            </div>
          );
        })}
        {scheduleDraft ? (
          <div className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50/40">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(momentDraftStorageKey);
                setMomentTopic('');
                setMomentText('');
                setEditingMomentId(null);
                setScheduleDraft(null);
                setScheduleAutosaveStatus('idle');
              }}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
              title="Delete draft"
              aria-label="Delete draft"
            >
              <Trash2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('content-schedule');
                const defaultDate = toDateKey(new Date());
                setMomentFromDate(scheduleDraft.fromDate || defaultDate);
                setMomentToDate(scheduleDraft.toDate || scheduleDraft.fromDate || defaultDate);
                setMomentTopic(scheduleDraft.topic || '');
                setMomentText(scheduleDraft.text || '');
                setShowScheduleForm(true);
                navigate('/content?tab=content-schedule');
              }}
              className="block w-full pr-8 text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Content Schedule</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">{scheduleDraft.topic || 'Untitled schedule draft'}</p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                {scheduleDraft.text || 'No description yet'}
              </p>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SavedDraftsPanel;
