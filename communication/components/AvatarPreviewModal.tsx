import React from 'react';
import { getDisplayAvatarUrl } from '../../utils/avatar';

export type AvatarPreviewEntity = {
  name: string;
  avatar?: string;
  subtitle?: string;
};

export function AvatarPreviewModal({
  entity,
  open,
  onClose,
}: {
  entity: AvatarPreviewEntity | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !entity) return null;

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
              src={getDisplayAvatarUrl(entity.avatar, entity.name || 'User')}
              alt={entity.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900">{entity.name}</div>
            {entity.subtitle ? <div className="mt-1 text-lg text-slate-500">{entity.subtitle}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
