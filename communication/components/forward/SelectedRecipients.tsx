import React from 'react';
import { getDisplayAvatarUrl } from '../../../utils/avatar';
import { ForwardRecipientOption } from './types';

export function SelectedRecipients({
  recipients,
  onRemove,
}: {
  recipients: ForwardRecipientOption[];
  onRemove: (recipientId: string) => void;
}) {
  if (!recipients.length) return null;

  return (
    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {recipients.map((recipient) => (
        <button
          key={recipient.id}
          type="button"
          onClick={() => onRemove(recipient.recipientId)}
          className="shrink-0 rounded-full transition hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          title={`Remove ${recipient.title}`}
          aria-label={`Remove ${recipient.title}`}
        >
          <img
            src={getDisplayAvatarUrl(recipient.avatar, recipient.title)}
            alt={recipient.title}
            className="h-8 w-8 rounded-full border border-slate-200 object-cover"
          />
        </button>
      ))}
    </div>
  );
}
