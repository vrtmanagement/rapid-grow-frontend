import React from 'react';
import { Plus } from 'lucide-react';

type SpacesCreateTaskButtonProps = {
  onClick: () => void;
};

const SpacesCreateTaskButton: React.FC<SpacesCreateTaskButtonProps> = ({ onClick }) => (
  <div className="relative flex h-11 items-center justify-end">
    <button
      type="button"
      aria-label="Create Task"
      onClick={onClick}
      className="group inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-red px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
    >
      <Plus size={16} strokeWidth={2.4} />
      Create Task
    </button>
  </div>
);

export default SpacesCreateTaskButton;
