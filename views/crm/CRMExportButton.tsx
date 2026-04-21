import React from 'react';
import { API_BASE, getStoredAuthSession } from '../../config/api';

interface CRMExportButtonProps {
  leadType: string;
  customTabName?: string;
}

const CRMExportButton: React.FC<CRMExportButtonProps> = ({ leadType, customTabName = '' }) => {
  return (
    <button
      className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      onClick={async () => {
        const session = getStoredAuthSession();
        const token = typeof session?.token === 'string' ? session.token : '';
        const params = new URLSearchParams({
          leadType: ['HOT', 'WARM', 'COLD'].includes(leadType) ? leadType : 'CUSTOM',
          ...(customTabName ? { customTabName } : {}),
        });
        const response = await fetch(`${API_BASE}/crm/export?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error('Export failed');
        const blob = await response.blob();
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = 'crm-leads.xlsx';
        link.click();
        URL.revokeObjectURL(href);
      }}
    >
      Export Excel
    </button>
  );
};

export default CRMExportButton;
