import React from 'react';

export function ChatBubble({
  isOwn,
  className = '',
  children,
}: {
  isOwn: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        'rounded-[22px] border px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition-all duration-200',
        isOwn
          ? 'border-[#b8e7c4] bg-[#d9fdd3] text-slate-900'
          : 'border-slate-200 bg-white text-slate-900',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
