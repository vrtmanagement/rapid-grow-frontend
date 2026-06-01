import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { ExpenseClaim } from './expenseTypes';
import { formatCurrency } from './expenseTypes';
import { markReimbursementPaid } from './expenseApi';

interface ReimbursementPanelProps {
  open: boolean;
  claim: ExpenseClaim | null;
  onClose: () => void;
  onSaved: () => void;
}

const ReimbursementPanel: React.FC<ReimbursementPanelProps> = ({ open, claim, onClose, onSaved }) => {
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !claim) return;
    setTransactionReference(claim.reimbursement?.transactionReference || '');
    setPaymentDate(claim.reimbursement?.paymentDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setNotes(claim.reimbursement?.notes || '');
    setError(null);
  }, [open, claim]);

  if (!open || !claim) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await markReimbursementPaid(claim._id, {
        transactionReference,
        paymentDate,
        notes,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process reimbursement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Process Reimbursement</h2>
            <p className="text-sm text-slate-500">{formatCurrency(claim.amount)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Transaction Reference</span>
            <input value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Payment Date</span>
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button type="button" disabled={loading} onClick={handleSubmit} className="inline-flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2 text-sm font-medium text-white">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Mark as Paid
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReimbursementPanel;
