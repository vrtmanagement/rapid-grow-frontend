import React from 'react';
import { Check } from 'lucide-react';

export function MessageSelectionCheckbox({
  checked,
  visible,
  onChange,
}: {
  checked: boolean;
  visible: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
        checked
          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
          : 'border-slate-300 bg-white text-transparent hover:border-slate-400'
      } ${visible ? 'opacity-100' : 'hidden'}`}
      aria-pressed={checked}
      aria-label={checked ? 'Deselect message' : 'Select message'}
    >
      <Check size={12} strokeWidth={3} />
    </button>
  );
}
