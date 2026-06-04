import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface FilterDropdownOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  value: string;
  selectedLabel: string;
  options: FilterDropdownOption[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  maxHeightClass?: string;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  value,
  selectedLabel,
  options,
  open,
  onToggle,
  onSelect,
  containerRef,
  maxHeightClass = 'max-h-72',
}) => (
  <div className="relative" ref={containerRef}>
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition hover:border-slate-300 focus:border-brand-red/35 focus:ring-4 focus:ring-brand-red/10"
    >
      <span className="truncate pr-4">{selectedLabel}</span>
      <ChevronDown
        size={18}
        className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>

    {open ? (
      <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div
          className={`${maxHeightClass} overflow-y-auto py-2 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.85)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/90 [&::-webkit-scrollbar-track]:bg-transparent`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value || option.label}
                type="button"
                onClick={() => onSelect(option.value)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'bg-rose-50 text-slate-900'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="font-medium">{option.label}</span>
                {isSelected ? <span className="text-xs font-semibold text-brand-red">Selected</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    ) : null}
  </div>
);

export default FilterDropdown;
