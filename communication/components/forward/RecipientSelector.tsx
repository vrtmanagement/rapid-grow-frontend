import React from 'react';
import { Building2, Check, Clock3, Hash, Search, UserRound } from 'lucide-react';
import { getDisplayAvatarUrl } from '../../../utils/avatar';
import { ForwardRecipientOption } from './types';

const SECTION_META = {
  recent: {
    title: 'Recent chats',
    Icon: Clock3,
  },
  channels: {
    title: 'Team channels',
    Icon: Hash,
  },
  employees: {
    title: 'Employees',
    Icon: UserRound,
  },
} as const;

export function RecipientSelector({
  query,
  onQueryChange,
  recipients,
  selectedRecipientIds,
  maxRecipients = 5,
  onToggleRecipient,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  recipients: ForwardRecipientOption[];
  selectedRecipientIds: string[];
  maxRecipients?: number;
  onToggleRecipient: (recipient: ForwardRecipientOption) => void;
}) {
  const selectionLimitReached = selectedRecipientIds.length >= maxRecipients;
  const grouped = recipients.reduce<Record<string, ForwardRecipientOption[]>>((acc, recipient) => {
    if (!acc[recipient.section]) acc[recipient.section] = [];
    acc[recipient.section].push(recipient);
    return acc;
  }, {});

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex justify-center px-1">
        <label className="flex w-full max-w-[320px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 shadow-sm">
          <Search size={14} className="shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search people or teams"
            className="w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-0.5">
        {recipients.length === 0 ? (
          <div className="mx-auto max-w-[320px] rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center">
            <div className="text-sm font-medium text-slate-700">No matches found</div>
            <div className="mt-1 text-xs text-slate-500">Try another name or team.</div>
          </div>
        ) : null}

        <div className="mx-auto w-full max-w-[320px]">
          {Object.entries(grouped).map(([sectionKey, items]) => {
            const sectionMeta = SECTION_META[sectionKey as keyof typeof SECTION_META];
            const SectionIcon = sectionMeta?.Icon || Building2;

            return (
              <div key={sectionKey} className="mb-3 last:mb-0">
                <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  <SectionIcon size={12} />
                  {sectionMeta?.title || 'Recipients'}
                </div>
                <div className="space-y-0.5">
                  {items.map((recipient) => {
                    const selected = selectedRecipientIds.includes(recipient.recipientId);
                    const selectionDisabled = !selected && selectionLimitReached;
                    return (
                      <button
                        key={recipient.id}
                        type="button"
                        onClick={() => onToggleRecipient(recipient)}
                        disabled={selectionDisabled}
                        className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${
                          selected
                            ? 'border-slate-300 bg-slate-100'
                            : selectionDisabled
                              ? 'cursor-not-allowed border-transparent opacity-50'
                              : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <img
                          src={getDisplayAvatarUrl(recipient.avatar, recipient.title)}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-lg border border-slate-200 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-slate-900">{recipient.title}</div>
                          <div className="truncate text-[11px] text-slate-500">{recipient.subtitle}</div>
                        </div>
                        <div
                          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                            selected ? 'border-red-500 bg-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {selected ? <Check size={12} className="text-red-600" strokeWidth={3} /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
