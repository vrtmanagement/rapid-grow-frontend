import React, { useState } from 'react';

interface CRMImportModalProps {
  isOpen: boolean;
  activeTab: string;
  onClose: () => void;
  onImport: (file: File, duplicateStrategy: 'SKIP' | 'REPLACE' | 'ADD_DUPLICATE') => Promise<void>;
}

const CRMImportModal: React.FC<CRMImportModalProps> = ({ isOpen, activeTab, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [strategy, setStrategy] = useState<'SKIP' | 'REPLACE' | 'ADD_DUPLICATE'>('SKIP');
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/35 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Import Excel ({activeTab})</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">Close</button>
        </div>
        <div className="p-6 space-y-4">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 w-full" value={strategy} onChange={(e) => setStrategy(e.target.value as any)}>
            <option value="SKIP">Skip duplicate email</option>
            <option value="REPLACE">Replace duplicate email</option>
            <option value="ADD_DUPLICATE">Add duplicate</option>
          </select>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={onClose}>Cancel</button>
          <button
            className="px-4 py-2 rounded-lg bg-brand-red text-white disabled:opacity-60"
            disabled={!file || loading}
            onClick={async () => {
              if (!file) return;
              setLoading(true);
              try { await onImport(file, strategy); } finally { setLoading(false); }
            }}
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CRMImportModal;
