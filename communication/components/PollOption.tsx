import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { ChatPollOption } from '../types';
import { getDisplayAvatarUrl } from '../../utils/avatar';

export function PollOption({
  option,
  selected,
  interactive,
  showResults,
  onClick,
}: {
  option: ChatPollOption;
  selected: boolean;
  interactive: boolean;
  showResults: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-200 ${
        selected
          ? 'border-[#bfd8ff] bg-[#eaf3ff] shadow-[0_10px_20px_rgba(59,130,246,0.12)]'
          : 'border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white'
      } ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {showResults ? (
        <div
          className={`absolute inset-y-0 left-0 rounded-2xl transition-[width] duration-500 ease-out ${
            selected ? 'bg-[#d7e9ff]' : 'bg-emerald-200/45'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, option.percentage))}%` }}
        />
      ) : null}
      <div className="relative flex items-start gap-3 px-4 py-3">
        <div className={`mt-0.5 shrink-0 ${selected ? 'text-[#305a9a]' : 'text-emerald-700'}`}>
          {selected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className={`break-words text-[14px] font-medium ${selected ? 'text-[#17325c]' : 'text-slate-900'}`}>{option.text}</div>
            {showResults ? (
              <div className={`shrink-0 text-right text-[11px] font-semibold ${selected ? 'text-[#17325c]' : 'text-slate-700'}`}>
                <div>{option.percentage.toFixed(option.percentage % 1 === 0 ? 0 : 1)}%</div>
                <div className={selected ? 'text-[#44689e]' : 'text-slate-500'}>{option.voteCount} votes</div>
              </div>
            ) : null}
          </div>
          {!showResults && selected ? (
            <div className="mt-1 text-[11px] font-medium text-[#44689e]">Selected</div>
          ) : null}
          {showResults && option.voters.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {option.voters.map((voter) => (
                <div
                  key={voter.id}
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${
                    selected
                      ? 'border-[#c7dbf8] bg-white/75 text-[#274a80]'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <img
                    src={getDisplayAvatarUrl(voter.avatar, voter.name)}
                    alt={voter.name}
                    className="h-5 w-5 rounded-full object-cover"
                  />
                  <span className="text-[11px] font-medium">{voter.name}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
