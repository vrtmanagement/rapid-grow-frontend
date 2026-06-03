import React from 'react';
import { Check, ExternalLink, Mail, Pencil, Phone, Trash2 } from 'lucide-react';

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
  const getLatestAction = (item: any) => {
    const customFields = item?.customFields || {};
    const actionsRaw =
      customFields.action_items ??
      customFields.actionItems ??
      customFields.actions ??
      customFields.lead_actions;
    if (!Array.isArray(actionsRaw) || actionsRaw.length === 0) return null;
    return actionsRaw
      .map((entry: any) => ({
        title: String(entry?.title || '').trim(),
        description: String(entry?.description || '').trim(),
        updatedAt: String(entry?.updatedAt || entry?.createdAt || ''),
      }))
      .filter((entry) => entry.title)
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0] || null;
  };
  const renderCellText = (
    value: unknown,
    options?: { maxChars?: number; tooltipFullText?: boolean },
  ) => {
    const text = String(value ?? '').trim();
    if (!text || text === '-') return '-';
    const maxChars = options?.maxChars;
    const shouldTruncate = typeof maxChars === 'number' && maxChars > 0 && text.length > maxChars;
    const displayText = shouldTruncate ? `${text.slice(0, maxChars)}...` : text;
    return (
      <span className="inline-flex max-w-full text-left text-slate-700" title={options?.tooltipFullText ? text : undefined}>
        <span className="truncate">{displayText}</span>
      </span>
    );
  };

  return (
    <div className="rounded-lg bg-white border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="min-w-full table-fixed text-sm">
          <thead className="sticky top-0 bg-slate-50/95 backdrop-blur border-b border-slate-200">
            <tr>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[64px]">S No</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[70px]">Select</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[210px]">Contact</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[190px]">Organization</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[170px]">Email / Phone</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[230px]">Next Action</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[140px]">Designation</th>
              <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wide text-slate-600 w-[110px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              (() => {
                const designation = String(item.position || getCustomFieldValue(item, 'designation') || '-');
                const companyUrl = String(item.url || getCustomFieldValue(item, 'company_url') || '-');
                const email = String(item.email || '').trim();
                const phone = String(item.phone || getCustomFieldValue(item, 'phone_number') || '').trim();
                const latestAction = getLatestAction(item);
                const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || '-';
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
                <td className="px-3 py-3 w-[210px]">
                  <button
                    type="button"
                    className="group flex min-w-0 items-center gap-2 text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(item);
                    }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                      {fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'L'}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900 group-hover:text-brand-red">{fullName}</span>
                      <span className="block truncate text-xs text-slate-500">{item.leadType || 'Lead'}</span>
                    </span>
                  </button>
                </td>
                <td className="px-3 py-3 w-[190px]">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800">{renderCellText(item.company || '-', { maxChars: 28, tooltipFullText: true })}</div>
                    {companyUrl && companyUrl !== '-' ? (
                      <a
                        className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-indigo-600 hover:text-indigo-700"
                        href={companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        rel="noreferrer"
                        title={companyUrl}
                      >
                        <ExternalLink size={12} />
                        <span className="truncate">{renderCellText(companyUrl, { maxChars: 25 })}</span>
                      </a>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3 w-[170px]">
                  <div className="flex min-w-0 flex-col gap-1">
                    {email ? (
                      <a className="inline-flex items-center gap-1.5 truncate text-xs font-medium text-slate-700 hover:text-brand-red" href={`mailto:${email}`} onClick={(e) => e.stopPropagation()} title={email}>
                        <Mail size={13} />
                        <span className="truncate">{email}</span>
                      </a>
                    ) : null}
                    {phone ? (
                      <a className="inline-flex items-center gap-1.5 truncate text-xs text-slate-500 hover:text-brand-red" href={`tel:${phone}`} onClick={(e) => e.stopPropagation()} title={phone}>
                        <Phone size={13} />
                        <span className="truncate">{phone}</span>
                      </a>
                    ) : null}
                    {!email && !phone ? <span className="text-slate-400">-</span> : null}
                  </div>
                </td>
                <td className="px-3 py-3 w-[230px]">
                  {latestAction ? (
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-800" title={latestAction.title}>{latestAction.title}</div>
                      <div className="mt-0.5 truncate text-xs text-slate-500" title={latestAction.description}>{latestAction.description || 'No notes added'}</div>
                    </div>
                  ) : (
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Needs action</span>
                  )}
                </td>
                <td className="px-3 py-3 truncate w-[140px]">{designation}</td>
                <td className="px-3 py-3 w-[110px]">
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
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">No leads found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CRMTable;
