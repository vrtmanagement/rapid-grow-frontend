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
      className="group inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-brand-red px-4 text-[13px] font-semibold text-white transition-colors hover:bg-white hover:text-brand-red hover:ring-1 hover:ring-brand-red/20"
    >
      <Plus size={16} strokeWidth={2.4} />
      Create Task
    </button>
  </div>
);

export default SpacesCreateTaskButton;
