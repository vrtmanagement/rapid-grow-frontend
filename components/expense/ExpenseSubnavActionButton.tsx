import React from 'react';

interface ExpenseSubnavActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const ExpenseSubnavActionButton: React.FC<ExpenseSubnavActionButtonProps> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
  >
    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-slate-700 dark:text-slate-200">{icon}</span>
    <span className="text-[13px] font-semibold text-slate-900 dark:text-white">{label}</span>
  </button>
);

export default ExpenseSubnavActionButton;
