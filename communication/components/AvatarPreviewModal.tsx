import React from 'react';
import { ChatUser } from '../types';

function fallbackAvatar(name: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.replace(/\s/g, ''))}`;
}

export function AvatarPreviewModal({
  user,
  open,
  onClose,
}: {
  user: ChatUser | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !user) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="h-62 w-62 overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-sm">
            <img
              src={user.avatar || fallbackAvatar(user.name || 'User')}
              alt={user.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900">{user.name}</div>
            <div className="mt-1 text-lg text-slate-500">
              {user.online ? 'Online now' : 'Offline'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
