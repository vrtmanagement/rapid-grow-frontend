import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { API_BASE, getStoredAuthSession } from '../../config/api';

interface CRMDummyDownloadButtonProps {
  onError?: (message: string) => void;
}

const CRMDummyDownloadButton: React.FC<CRMDummyDownloadButtonProps> = ({ onError }) => {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50"
      onClick={async () => {
        try {
          const session = getStoredAuthSession();
          const token = typeof session?.token === 'string' ? session.token : '';
          const response = await fetch(`${API_BASE}/crm/import-template`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!response.ok) throw new Error('Failed to download dummy file');
          const blob = await response.blob();
          const href = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = href;
          link.download = 'crm-import-dummy.xlsx';
          link.click();
          URL.revokeObjectURL(href);
        } catch (error: any) {
          onError?.(error?.message || 'Failed to download dummy file');
        }
      }}
    >
      <FileSpreadsheet size={15} />
      Download Dummy File
    </button>
  );
};

export default CRMDummyDownloadButton;
