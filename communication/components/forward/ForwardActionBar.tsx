import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Forward, Trash2, X } from 'lucide-react';

export function ForwardActionBar({
  visible,
  selectedCount,
  canDelete,
  onForward,
  onDelete,
  onClear,
}: {
  visible: boolean;
  selectedCount: number;
  canDelete: boolean;
  onForward: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="sticky top-3 z-30 mb-4"
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Clear selection"
              >
                <X size={16} />
              </button>
              <div>
                <div className="text-sm font-semibold text-slate-900">{selectedCount} selected</div>
                <div className="text-xs text-slate-500">Batch actions keep the original message order.</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onForward}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Forward size={15} />
                Forward
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={!canDelete || !selectedCount}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45"
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
