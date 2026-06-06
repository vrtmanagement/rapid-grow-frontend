import React, { useEffect, useMemo, useState } from 'react';
import { Lock, ShieldCheck, TimerOff } from 'lucide-react';
import { ChatMessage } from '../types';
import { PollOption } from './PollOption';
import { PollResults } from './PollResults';
import { PollVoteButton } from './PollVoteButton';

export function PollMessage({
  message,
  pendingVote,
  onVote,
}: {
  message: ChatMessage;
  pendingVote: boolean;
  onVote: (optionIds: string[]) => Promise<void>;
}) {
  const poll = message.poll;
  const [draftSelection, setDraftSelection] = useState<string[]>(poll?.myVoteOptionIds || []);

  useEffect(() => {
    setDraftSelection(poll?.myVoteOptionIds || []);
  }, [poll?.id, poll?.myVoteOptionIds]);

  const hasChangedSelection = useMemo(() => {
    const current = new Set(poll?.myVoteOptionIds || []);
    const draft = new Set(draftSelection);
    if (current.size !== draft.size) return true;
    for (const optionId of draft) {
      if (!current.has(optionId)) return true;
    }
    return false;
  }, [draftSelection, poll?.myVoteOptionIds]);

  if (!poll) {
    return <div className="text-sm text-slate-500">Poll unavailable</div>;
  }

  const handleOptionClick = (optionId: string) => {
    if (!poll.isActive || pendingVote) return;
    if (!poll.allowsMultipleAnswers) {
      setDraftSelection([optionId]);
      void onVote([optionId]);
      return;
    }
    setDraftSelection((prev) =>
      prev.includes(optionId) ? prev.filter((currentId) => currentId !== optionId) : [...prev, optionId]
    );
  };

  const submitMultipleVote = async () => {
    if (!draftSelection.length) return;
    await onVote(draftSelection);
  };

  return (
    <div className="min-w-[260px] max-w-[340px]">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Poll</div>
          <div className="mt-1 text-[15px] font-semibold leading-6 text-slate-900">{poll.question}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-slate-500">
          {poll.anonymous ? <Lock size={14} title="Anonymous poll" /> : <ShieldCheck size={14} title="Named votes" />}
          {!poll.isActive ? <TimerOff size={14} title="Poll closed" /> : null}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {poll.options.map((option) => (
          <PollOption
            key={option.id}
            option={option}
            selected={draftSelection.includes(option.id)}
            interactive={poll.isActive}
            showResults={poll.totalVoters > 0}
            onClick={() => handleOptionClick(option.id)}
          />
        ))}
      </div>

      <PollResults poll={poll} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {poll.isActive && poll.allowsMultipleAnswers ? (
          <PollVoteButton
            label={poll.myVoteOptionIds.length ? 'Update vote' : 'Vote'}
            loading={pendingVote}
            disabled={!draftSelection.length || !hasChangedSelection}
            onClick={() => void submitMultipleVote()}
          />
        ) : null}
        {!poll.isActive ? (
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            {poll.status === 'expired' ? 'Poll expired' : 'Poll closed'}
          </span>
        ) : null}
      </div>
    </div>
  );
}
