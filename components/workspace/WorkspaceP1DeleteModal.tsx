import React from 'react';
import { Trash2, X } from 'lucide-react';

interface WorkspaceP1DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const WorkspaceP1DeleteModal: React.FC<WorkspaceP1DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
      <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
        <button
          className="absolute top-4 right-4 text-slate-300 hover:text-brand-red transition-colors"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-md">
            <Trash2 size={20} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-brand-navy leading-tight">
              Delete Project Brief
            </h3>
            <p className="text-[13px] text-brand-grey font-medium tracking-[0.15em] mt-1 uppercase">
              This action cannot be undone
            </p>
          </div>
        </div>
        <p className="text-[15px] text-slate-700 mb-8">
          Permanently remove this project brief?
        </p>
        <div className="flex justify-end gap-3">
          <button
            className="px-5 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-brand-grey bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors uppercase"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-brand-red shadow-lg shadow-brand-red/30 hover:bg-brand-navy transition-colors uppercase"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceP1DeleteModal;
