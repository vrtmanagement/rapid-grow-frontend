import React, { useMemo, useState } from 'react';
import { Plus, SquarePen, Trash2, X } from 'lucide-react';
import { MessageActionModal } from './MessageActionModal';
import { usePollStore } from '../stores/usePollStore';

type CreatePollPayload = {
  question: string;
  options: string[];
  allowsMultipleAnswers: boolean;
  anonymous: boolean;
  expiresAt: string | null;
};

export function CreatePollModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePollPayload) => Promise<void>;
}) {
  const {
    draft,
    creatingPoll,
    setCreatingPoll,
    updateDraft,
    setOptionValue,
    addOption,
    removeOption,
    resetDraft,
  } = usePollStore();
  const [error, setError] = useState<string | null>(null);

  const trimmedOptions = useMemo(
    () => draft.options.map((option) => option.trim()).filter(Boolean),
    [draft.options]
  );

  const duplicateOption = useMemo(() => {
    const normalized = trimmedOptions.map((option) => option.toLowerCase());
    return new Set(normalized).size !== normalized.length;
  }, [trimmedOptions]);

  const canSubmit =
    draft.question.trim().length >= 5 &&
    trimmedOptions.length >= 2 &&
    trimmedOptions.length <= 12 &&
    !duplicateOption &&
    !creatingPoll;

  const handleClose = () => {
    if (creatingPoll) return;
    setError(null);
    resetDraft();
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('Enter a question and at least two unique options.');
      return;
    }
    try {
      setCreatingPoll(true);
      setError(null);
      await onSubmit({
        question: draft.question.trim(),
        options: trimmedOptions,
        allowsMultipleAnswers: draft.allowsMultipleAnswers,
        anonymous: draft.anonymous,
        expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
      });
      resetDraft();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create poll');
    } finally {
      setCreatingPoll(false);
    }
  };

  return (
    <MessageActionModal
      open={open}
      title="Create Poll"
      onClose={handleClose}
    >
      <div className="relative min-h-[32rem] space-y-5">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          aria-label="Close poll modal"
        >
          <X size={16} />
        </button>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Question
          </label>
          <div className="relative">
            <SquarePen size={16} className="pointer-events-none absolute left-4 top-4 text-slate-400" />
            <textarea
              rows={4}
              value={draft.question}
              onChange={(event) => updateDraft({ question: event.target.value })}
              placeholder="What should we prioritize next?"
              className="min-h-[7rem] w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 pt-3 pb-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Options
            </label>
            <span className="text-[11px] font-medium text-slate-500">{draft.options.length}/12</span>
          </div>
          <div className="space-y-2">
            {draft.options.map((option, index) => (
              <div key={`poll-option-${index}`} className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  {index + 1}
                </div>
                <input
                  value={option}
                  onChange={(event) => setOptionValue(index, event.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  disabled={draft.options.length <= 2}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Remove option ${index + 1}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOption}
            disabled={draft.options.length >= 12}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} />
            Add option
          </button>
          {duplicateOption ? (
            <div className="mt-2 text-xs text-rose-600">Options must be unique.</div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={draft.allowsMultipleAnswers}
              onChange={(event) => updateDraft({ allowsMultipleAnswers: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">Multiple choice</div>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={draft.anonymous}
              onChange={(event) => updateDraft({ anonymous: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">Anonymous poll</div>
            </div>
          </label>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <X size={16} />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Create poll
          </button>
        </div>
      </div>
    </MessageActionModal>
  );
}
