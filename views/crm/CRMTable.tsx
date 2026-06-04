import React from 'react';
import { Check, Linkedin } from 'lucide-react';

const CELL_CLASS = 'overflow-hidden align-middle px-4 py-3.5 max-w-0';
const NAME_CELL_CLASS = 'align-middle px-4 py-3.5 whitespace-normal break-words';

interface CRMTableProps {
  items: any[];
  rowStart?: number;
  selectedIds: string[];
  onOpen: (item: any) => void;
  onToggleSelect: (id: string) => void;
}

const CRMTable: React.FC<CRMTableProps> = ({ items, rowStart = 0, selectedIds, onOpen, onToggleSelect }) => {
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

  const getLinkedInProfile = (item: any) =>
    String(item?.linkedinProfile || getCustomFieldValue(item, 'linkedin_profile') || '').trim();

  const renderCellText = (value: unknown, options?: { className?: string; title?: string }) => {
    const text = String(value ?? '').trim();
    if (!text || text === '-') return <span className="text-slate-400">-</span>;
    const title = options?.title ?? text;
    return (
      <span className={`block truncate leading-5 ${options?.className || 'text-slate-700'}`} title={title}>
        {text}
      </span>
    );
  };

  return (
    <div className="w-full min-w-0">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: '4%' }} />
          <col style={{ width: '4%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '22%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className={`${CELL_CLASS} text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500`}>
              S No
            </th>
            <th className={`${CELL_CLASS} text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500`}>
              Select
            </th>
            <th className={`${NAME_CELL_CLASS} text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500`}>
              Name
            </th>
            <th className={`${CELL_CLASS} text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500`}>
              Organization
            </th>
            <th className={`${CELL_CLASS} text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500`}>
              Email / Phone
            </th>
            <th className={`${CELL_CLASS} text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500`}>
              Designation
            </th>
            <th className={`${CELL_CLASS} text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500`}>
              LinkedIn
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const designation = String(item.position || getCustomFieldValue(item, 'designation') || '-');
            const company = String(item.company || '').trim() || '-';
            const linkedInProfile = getLinkedInProfile(item);
            const email = String(item.email || '').trim();
            const phone = String(item.phone || getCustomFieldValue(item, 'phone_number') || '').trim();
            const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || '-';
            const rowNumber = rowStart + idx + 1;
            const isSelected = selectedIds.includes(item._id);
            const linkedInHref = linkedInProfile
              ? /^https?:\/\//i.test(linkedInProfile)
                ? linkedInProfile
                : `https://${linkedInProfile}`
              : '';
            const contactLine = [email, phone].filter(Boolean).join(' · ') || '-';

            return (
              <tr
                key={item._id}
                className={`cursor-pointer border-b border-slate-100 transition-colors ${
                  isSelected ? 'bg-brand-red/10 hover:bg-brand-red/15' : 'hover:bg-slate-50/70'
                }`}
                onClick={() => {
                  if (selectedIds.length > 0) {
                    onToggleSelect(item._id);
                    return;
                  }
                  onOpen(item);
                }}
              >
                <td className={`${CELL_CLASS} text-slate-600`}>{rowNumber}</td>
                <td className={CELL_CLASS}>
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
                  >
                    <Check size={13} />
                  </button>
                </td>
                <td className={NAME_CELL_CLASS}>
                  <button
                    type="button"
                    className="group flex w-full items-start gap-2.5 text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(item);
                    }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                      {fullName
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part.charAt(0).toUpperCase())
                        .join('') || 'L'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold leading-snug text-slate-900 group-hover:text-brand-red">
                        {fullName}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                        {item.leadType || 'Lead'}
                      </span>
                    </span>
                  </button>
                </td>
                <td className={CELL_CLASS}>{renderCellText(company, { className: 'font-medium text-slate-800' })}</td>
                <td className={CELL_CLASS}>
                  {contactLine === '-' ? (
                    <span className="text-slate-400">-</span>
                  ) : (
                    <span className="block truncate text-[13px] leading-5 text-slate-700" title={contactLine}>
                      {email ? (
                        <a
                          className="hover:text-brand-red"
                          href={`mailto:${email}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {email}
                        </a>
                      ) : null}
                      {email && phone ? <span className="text-slate-300"> · </span> : null}
                      {phone ? (
                        <a className="hover:text-brand-red" href={`tel:${phone}`} onClick={(e) => e.stopPropagation()}>
                          {phone}
                        </a>
                      ) : null}
                    </span>
                  )}
                </td>
                <td className={CELL_CLASS}>{renderCellText(designation, { className: 'text-slate-800' })}</td>
                <td className={CELL_CLASS}>
                  {linkedInHref ? (
                    <a
                      className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[#0A66C2] hover:text-[#004182]"
                      href={linkedInHref}
                      onClick={(e) => e.stopPropagation()}
                      target="_blank"
                      rel="noreferrer"
                      title={linkedInProfile}
                    >
                      <Linkedin size={14} className="shrink-0" />
                      <span className="min-w-0 truncate">{linkedInProfile}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
          {!items.length && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                No leads found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CRMTable;
