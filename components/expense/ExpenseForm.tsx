import React, { useEffect, useState } from 'react';
import { Loader2, ScanLine, Sparkles, Upload } from 'lucide-react';
import type { ExpenseCategory, ExpenseClaim, ExpenseCurrency, TravelRequest } from './expenseTypes';
import { EXPENSE_CATEGORY_LABELS } from './expenseTypes';
import { checkExpenseDuplicate, createExpenseClaim, submitExpenseClaim, updateExpenseClaim, uploadExpenseReceipt } from './expenseApi';
import ExpenseSideDrawer from './ExpenseSideDrawer';

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingClaim?: ExpenseClaim | null;
  travelRequests?: TravelRequest[];
  canOverrideDuplicate?: boolean;
}

const categories = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];
const CURRENCIES: ExpenseCurrency[] = ['INR', 'USD', 'EUR'];

const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300';

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  open,
  onClose,
  onSaved,
  editingClaim,
  travelRequests = [],
  canOverrideDuplicate = false,
}) => {
  const [category, setCategory] = useState<ExpenseCategory>('OTHER');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<ExpenseCurrency>('INR');
  const [billableToClient, setBillableToClient] = useState(false);
  const [expenseDate, setExpenseDate] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [travelRequestId, setTravelRequestId] = useState('');
  const [extractedVendor, setExtractedVendor] = useState('');
  const [extractedAmount, setExtractedAmount] = useState('');
  const [extractedDate, setExtractedDate] = useState('');
  const [ocrFilled, setOcrFilled] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editingClaim) {
      setCategory(editingClaim.category);
      setAmount(String(editingClaim.amount));
      setCurrency(editingClaim.currency || 'INR');
      setBillableToClient(!!editingClaim.billableToClient);
      setExpenseDate(editingClaim.expenseDate?.slice(0, 10) || '');
      setDescription(editingClaim.description || '');
      setProject(editingClaim.project || '');
      setUrgent(!!editingClaim.urgent);
      setTravelRequestId(typeof editingClaim.travelRequestId === 'object' ? editingClaim.travelRequestId?._id || '' : editingClaim.travelRequestId || '');
      setExtractedVendor(editingClaim.extractedVendor || '');
      setExtractedAmount(editingClaim.extractedAmount != null ? String(editingClaim.extractedAmount) : '');
      setExtractedDate(editingClaim.extractedDate?.slice(0, 10) || '');
      setOcrFilled(!!editingClaim.extractedVendor || editingClaim.extractedAmount != null);
      setClaimId(editingClaim._id);
    } else {
      setCategory('OTHER');
      setAmount('');
      setCurrency('INR');
      setBillableToClient(false);
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setDescription('');
      setProject('');
      setUrgent(false);
      setTravelRequestId('');
      setExtractedVendor('');
      setExtractedAmount('');
      setExtractedDate('');
      setOcrFilled(false);
      setReceiptFile(null);
      setClaimId(null);
    }
    setError(null);
    setDuplicateWarning(null);
  }, [open, editingClaim]);

  const persistClaim = async () => {
    const payload = {
      category,
      amount: Number(amount),
      currency,
      billableToClient,
      expenseDate,
      description,
      project,
      urgent,
      travelRequestId: travelRequestId || undefined,
      extractedVendor,
      extractedAmount: extractedAmount ? Number(extractedAmount) : undefined,
      extractedDate: extractedDate || undefined,
    };

    let saved: ExpenseClaim;
    if (claimId || editingClaim?._id) {
      saved = await updateExpenseClaim(claimId || editingClaim!._id, payload);
    } else {
      saved = await createExpenseClaim(payload);
      setClaimId(saved._id);
    }

    if (receiptFile) {
      const withReceipt = await uploadExpenseReceipt(saved._id, receiptFile);
      if (withReceipt.extractedVendor) {
        setExtractedVendor(withReceipt.extractedVendor);
        setOcrFilled(true);
      }
      if (withReceipt.extractedAmount != null) {
        setExtractedAmount(String(withReceipt.extractedAmount));
      }
      if (withReceipt.extractedDate) {
        setExtractedDate(withReceipt.extractedDate.slice(0, 10));
      }
    }

    return saved;
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);
    try {
      await persistClaim();
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save claim');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (forceDuplicate = false) => {
    setLoading(true);
    setError(null);
    setDuplicateWarning(null);
    try {
      const saved = await persistClaim();
      const duplicate = await checkExpenseDuplicate(saved._id);
      if (duplicate.isDuplicate && !forceDuplicate) {
        setDuplicateWarning('Similar expense claim already exists.');
        return;
      }
      await submitExpenseClaim(saved._id, forceDuplicate && canOverrideDuplicate);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message.includes('Similar expense claim')) {
        setDuplicateWarning(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to submit claim');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExpenseSideDrawer
      open={open}
      onClose={onClose}
      title={editingClaim ? 'Edit Expense' : 'Add Expense'}
      subtitle="Create a new expense entry or upload a receipt"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSaveDraft}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit(false)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Submit for Approval
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>
        )}
        {duplicateWarning && (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {duplicateWarning}
            {canOverrideDuplicate && (
              <button type="button" onClick={() => handleSubmit(true)} className="ml-3 font-medium underline">
                Override & Submit
              </button>
            )}
          </div>
        )}

        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-800">
              <Upload size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {receiptFile ? receiptFile.name : 'Drag & drop receipt here'}
            </p>
            <p className="mt-1 text-xs text-slate-500">JPEG, PNG or PDF up to 10MB</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                Browse Files
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
              </label>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-900">
                <ScanLine size={15} />
                Scan (OCR)
              </span>
            </div>
          </div>
        </div>

        <label className="block">
          <span className={labelClass}>
            Category <span className="text-brand-red">*</span>
          </span>
          <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className={fieldClass}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {EXPENSE_CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>
              Date <span className="text-brand-red">*</span>
            </span>
            <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className={fieldClass} />
          </label>
          <label className="block">
            <span className={labelClass}>
              Amount <span className="text-brand-red">*</span>
            </span>
            <div className="flex overflow-hidden rounded-lg border border-slate-200 focus-within:border-brand-red/40 focus-within:ring-2 focus-within:ring-brand-red/10 dark:border-slate-700">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as ExpenseCurrency)}
                className="cursor-pointer border-0 border-r border-slate-200 bg-slate-50 py-2.5 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                aria-label="Currency"
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border-0 bg-white px-3 py-2.5 text-sm outline-none dark:bg-slate-900"
              />
            </div>
          </label>
        </div>

        <label className="block">
          <span className={labelClass}>Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="E.g., Client lunch at Indigo"
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Project (optional)</span>
          <input value={project} onChange={(e) => setProject(e.target.value)} className={fieldClass} />
        </label>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Billable to Client</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Is this expense reimbursable by a client?</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={billableToClient}
              onClick={() => setBillableToClient((prev) => !prev)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${billableToClient ? 'bg-brand-red' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${billableToClient ? 'left-[22px]' : 'left-0.5'}`}
              />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Mark as Urgent</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Prioritize this expense for faster approval</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={urgent}
              onClick={() => setUrgent((prev) => !prev)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${urgent ? 'bg-brand-red' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${urgent ? 'left-[22px]' : 'left-0.5'}`}
              />
            </button>
          </div>
        </div>

        {travelRequests.length > 0 && (
          <label className="block">
            <span className={labelClass}>Link to Travel Request</span>
            <select value={travelRequestId} onChange={(e) => setTravelRequestId(e.target.value)} className={fieldClass}>
              <option value="">None</option>
              {travelRequests.map((travel) => (
                <option key={travel._id} value={travel._id}>
                  {travel.purpose} ({travel.fromLocation} → {travel.toLocation})
                </option>
              ))}
            </select>
          </label>
        )}

        {ocrFilled && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <Sparkles size={16} />
              Auto-filled from receipt
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={extractedVendor}
                onChange={(e) => setExtractedVendor(e.target.value)}
                placeholder="Vendor"
                className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-emerald-900 dark:bg-slate-950"
              />
              <input
                value={extractedAmount}
                onChange={(e) => setExtractedAmount(e.target.value)}
                placeholder="Amount"
                className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-emerald-900 dark:bg-slate-950"
              />
              <input
                type="date"
                value={extractedDate}
                onChange={(e) => setExtractedDate(e.target.value)}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-emerald-900 dark:bg-slate-950"
              />
            </div>
          </div>
        )}
      </div>
    </ExpenseSideDrawer>
  );
};

export default ExpenseForm;
