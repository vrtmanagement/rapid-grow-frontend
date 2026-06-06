import React from 'react';
import { Loader2, Vote } from 'lucide-react';

export function PollVoteButton({
  disabled,
  loading,
  label,
  onClick,
}: {
  disabled?: boolean;
  loading?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Vote size={14} />}
      {label}
    </button>
  );
}
