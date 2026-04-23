import React, { useState } from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';

interface CRMTableProps {
  items: any[];
  rowStart?: number;
  selectedIds: string[];
  deletingId?: string;
  onOpen: (item: any) => void;
  onToggleSelect: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

const CRMTable: React.FC<CRMTableProps> = ({ items, rowStart = 0, selectedIds, deletingId, onOpen, onToggleSelect, onEdit, onDelete }) => {
  const normalizeCustomFieldKey = (value: string) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  const getCustomFieldValue = (item: any, key: string) => {
    const customFields = item?.customFields || {};
    const normalizedTarget = normalizeCustomFieldKey(key);
    const matchKey = Object.keys(customFields).find((entryKey) => normalizeCustomFieldKey(entryKey) === normalizedTarget);
    if (!matchKey) return '';
    const raw = customFields[matchKey];
    if (raw && typeof raw === 'object' && 'value' in raw) return String((raw as any).value ?? '').trim();
    return String(raw ?? '').trim();
  };
  const [copiedCell, setCopiedCell] = useState('');
  const copyCellValue = async (e: React.MouseEvent, key: string, value: unknown) => {
    e.stopPropagation();
    const text = String(value ?? '').trim();
    if (!text || text === '-') return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCell(key);
      window.setTimeout(() => {
        setCopiedCell((prev) => (prev === key ? '' : prev));
      }, 1200);
    } catch {
      // Fail silently if clipboard is blocked.
    }
  };
  const renderCopyableText = (
    itemId: string,
    field: 'url' | 'company' | 'name',
    value: unknown,
    copyLabel: string,
    options?: { maxChars?: number; tooltipFullText?: boolean },
  ) => {
    const text = String(value ?? '').trim();
    if (!text || text === '-') return '-';
    const copyKey = `${itemId}-${field}`;
    const isCopied = copiedCell === copyKey;
    const maxChars = options?.maxChars;
    const shouldTruncate = typeof maxChars === 'number' && maxChars > 0 && text.length > maxChars;
    const displayText = shouldTruncate ? `${text.slice(0, maxChars)}...` : text;
    const tooltipText = isCopied
      ? 'Copied'
      : options?.tooltipFullText
        ? `${text} (click to copy)`
        : `Copy ${copyLabel}`;
    return (
      <button
        type="button"
        className="group relative inline-flex max-w-full items-center text-left text-slate-700 hover:text-brand-red"
        onClick={(e) => copyCellValue(e, copyKey, text)}
      >
        <span className="truncate">{displayText}</span>
        <span className="pointer-events-none absolute left-1/2 top-0 z-[9999] -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
          {tooltipText}
        </span>
        <span className="pointer-events-none absolute left-1/2 top-0 z-[9999] h-2 w-2 -translate-x-1/2 -translate-y-[6px] rotate-45 bg-slate-900 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      </button>
    );
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-visible shadow-sm">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="min-w-full table-fixed text-sm">
          <thead className="sticky top-0 bg-slate-100/95 backdrop-blur border-b border-slate-200">
            <tr>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[64px]">S No</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[70px]">Select</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[170px]">Name</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[170px]">Company URL</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[170px]">Company</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[150px]">Designation</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[110px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              (() => {
                const designation = String(item.position || getCustomFieldValue(item, 'designation') || '-');
                const companyUrl = String(item.url || getCustomFieldValue(item, 'company_url') || '-');
                const rowNumber = rowStart + idx + 1;
                const isSelected = selectedIds.includes(item._id);
                return (
              <tr
                key={item._id}
                className={`border-b border-slate-100 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-brand-red/10 hover:bg-brand-red/15'
                    : 'hover:bg-slate-50/60'
                }`}
                onClick={() => {
                  if (selectedIds.length > 0) {
                    onToggleSelect(item._id);
                    return;
                  }
                  onOpen(item);
                }}
              >
                <td className="px-3 py-2 w-[64px] text-slate-600">{rowNumber}</td>
                <td className="px-3 py-2 w-[70px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(item._id);
                    }}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                      isSelected
                        ? 'border-brand-red bg-brand-red text-white shadow-sm'
                        : 'border-slate-300 bg-white text-transparent hover:border-brand-red/60'
                    }`}
                    aria-label={isSelected ? 'Deselect row' : 'Select row'}
                    title={isSelected ? 'Deselect' : 'Select'}
                  >
                    <Check size={13} />
                  </button>
                </td>
                <td className="px-3 py-2 w-[170px] overflow-visible relative">
                  {renderCopyableText(
                    item._id,
                    'name',
                    `${item.firstName || ''} ${item.lastName || ''}`.trim() || '-',
                    'Name',
                    { maxChars: 20, tooltipFullText: true },
                  )}
                </td>
                <td className="px-3 py-2 w-[170px] overflow-visible relative">{renderCopyableText(item._id, 'url', companyUrl, 'Company URL', { maxChars: 25, tooltipFullText: true })}</td>
                <td className="px-3 py-2 w-[170px] overflow-visible relative">{renderCopyableText(item._id, 'company', item.company || '-', 'Company', { maxChars: 25, tooltipFullText: true })}</td>
                <td className="px-3 py-2 truncate w-[150px]">{designation}</td>
                <td className="px-3 py-2 w-[110px]">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                  <button
                    className="inline-flex items-center justify-center rounded-md border border-slate-300 h-7 w-7 text-slate-700 hover:bg-slate-100"
                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                    title="Edit"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-md border border-red-200 h-7 w-7 text-red-600 hover:bg-red-50 disabled:opacity-60"
                    disabled={deletingId === item._id}
                    onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                    title={deletingId === item._id ? 'Deleting...' : 'Delete'}
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                  </div>
                </td>
              </tr>
                );
              })()
            ))}
            {!items.length && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">No leads found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CRMTable;
