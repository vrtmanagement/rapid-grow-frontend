import React from 'react';

interface CRMTableProps {
  items: any[];
  selectedIds: string[];
  deletingId?: string;
  onOpen: (item: any) => void;
  onToggleSelect: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

const CRMTable: React.FC<CRMTableProps> = ({ items, selectedIds, deletingId, onOpen, onToggleSelect, onEdit, onDelete }) => {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-100/95 backdrop-blur border-b border-slate-200">
            <tr>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600">Select</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600">First Name</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600">Last Name</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600">URL</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600">Email Address</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600">Company</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600">Position</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600">Connected On</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600">Employee Count</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item._id}
                className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors cursor-pointer"
                onClick={() => onOpen(item)}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item._id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleSelect(item._id)}
                  />
                </td>
                <td className="px-3 py-2">{item.firstName}</td>
                <td className="px-3 py-2">{item.lastName}</td>
                <td className="px-3 py-2">{item.url}</td>
                <td className="px-3 py-2">{item.email}</td>
                <td className="px-3 py-2">{item.company}</td>
                <td className="px-3 py-2">{item.position}</td>
                <td className="px-3 py-2">{item.connectedOn ? new Date(item.connectedOn).toLocaleDateString() : '-'}</td>
                <td className="px-3 py-2">{item.employeeCount ?? '-'}</td>
                <td className="px-3 py-2">
                  <button className="inline-flex items-center rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 mr-2" onClick={(e) => { e.stopPropagation(); onEdit(item); }}>Edit</button>
                  <button className="inline-flex items-center rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60" disabled={deletingId === item._id} onClick={(e) => { e.stopPropagation(); onDelete(item); }}>
                    {deletingId === item._id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-500">No leads found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CRMTable;
