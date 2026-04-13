import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ChatNotification } from '../types';

export function NotificationCard({
  notification,
  onClose,
  onClick,
}: {
  notification: ChatNotification;
  onClose: () => void;
  onClick: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`pointer-events-auto w-80 max-w-[calc(100vw-2rem)] cursor-pointer rounded-2xl border border-brand-red/20 bg-white/95 p-3 shadow-2xl ring-1 ring-black/5 backdrop-blur transition-all duration-300 ease-out hover:-translate-y-0.5 ${
        isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-8 opacity-0 scale-95'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-brand-red/20 bg-brand-red/5">
          {notification.avatar ? (
            <img src={notification.avatar} alt={notification.senderName} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-bold uppercase text-slate-500">
              {notification.senderName.slice(0, 1)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-red">New message</div>
          <div className="truncate text-sm font-semibold text-slate-900">{notification.senderName}</div>
          <div
            className="mt-0.5 text-xs leading-5 text-slate-600"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {notification.messagePreview}
          </div>
        </div>

        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
