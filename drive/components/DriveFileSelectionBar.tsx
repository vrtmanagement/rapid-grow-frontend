import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Forward, Trash2, X } from 'lucide-react';

export default function DriveFileSelectionBar({
  visible,
  selectedCount,
  onForward,
  onDelete,
  onClear,
}: {
  visible: boolean;
  selectedCount: number;
  onForward: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="sticky top-3 z-20"
        >
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Clear file selection"
              >
                <X size={16} />
              </button>
              <div>
                <div className="text-sm font-semibold text-slate-900">{selectedCount} selected</div>
                <div className="text-xs text-slate-500">Batch actions keep your chosen file order.</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onForward}
                disabled={!selectedCount}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Forward size={15} />
                Forward
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={!selectedCount}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
