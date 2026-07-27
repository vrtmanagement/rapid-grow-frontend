import React from 'react';
import type { DriveFolder } from '../types';

export {
  buildFolderTreeOptions,
  copyTextToClipboard,
  type ToastState,
} from './driveViewHelpers';

export default function DriveDestinationPicker({
  value,
  onChange,
  options,
  rootLabel,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  options: DriveFolder[];
  rootLabel: string;
}) {
  const destinations = [
    {
      id: '',
      label: rootLabel,
      path: 'Move this item back to the main shared drive.',
    },
    ...options.map((folder) => ({
      id: folder.id,
      label: folder.name,
      path: folder.breadcrumb.map((item) => item.name).join(' / '),
    })),
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="max-h-[20rem] overflow-y-auto">
        {destinations.map((destination) => {
          const active = value === destination.id;
          return (
            <button
              key={destination.id || 'root'}
              type="button"
              onClick={() => onChange(destination.id)}
              className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 ${
                active ? 'bg-red-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${active ? 'text-brand-red' : 'text-slate-900'}`}>
                  {destination.label}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{destination.path}</div>
              </div>
              <span
                className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border ${
                  active ? 'border-brand-red bg-brand-red' : 'border-slate-300 bg-white'
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
