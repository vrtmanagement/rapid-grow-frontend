import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ONE_PAGE_SECTIONS,
  parseOnePagePlan,
  serializeOnePagePlan,
} from './strategyOnePagePlan';

interface StrategyOnePagePlanPanelProps {
  value: string;
  canManage: boolean;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}

const StrategyOnePagePlanPanel: React.FC<StrategyOnePagePlanPanelProps> = ({
  value,
  canManage,
  saving,
  onChange,
  onSave,
}) => {
  const [sections, setSections] = useState(() => parseOnePagePlan(value));
  const [openKey, setOpenKey] = useState(ONE_PAGE_SECTIONS[0].key);

  useEffect(() => {
    setSections(parseOnePagePlan(value));
  }, [value]);

  const filledCount = useMemo(
    () => ONE_PAGE_SECTIONS.filter((section) => (sections[section.key] || '').trim()).length,
    [sections]
  );

  const updateSection = (key: string, text: string) => {
    const next = { ...sections, [key]: text };
    setSections(next);
    onChange(serializeOnePagePlan(next));
  };

  const previewText = serializeOnePagePlan(sections);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-rose-50/80 via-white to-slate-50 shadow-sm dark:border-slate-800 dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-950">
        <div className="border-b border-slate-200/80 bg-white/70 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">One-Page Strategy Plan</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Your December deliverable — a single page every employee can read to understand
                where the company is going, what matters, and who owns what.
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-red">
                <Sparkles size={14} />
                {filledCount.length} of {ONE_PAGE_SECTIONS.length} sections completed
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
          {ONE_PAGE_SECTIONS.map((section, index) => {
            const isOpen = openKey === section.key;
            const hasContent = Boolean((sections[section.key] || '').trim());
            return (
              <div key={section.key} className="bg-white/50 dark:bg-slate-900/30">
                <button
                  type="button"
                  onClick={() => setOpenKey(isOpen ? '' : section.key)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-white/80 dark:hover:bg-slate-900/50"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        hasContent
                          ? 'bg-brand-red text-white'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{section.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{section.hint}</p>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={18} className="shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown size={18} className="shrink-0 text-slate-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-6 pb-5 pt-2 dark:border-slate-800">
                    {canManage ? (
                      <textarea
                        className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900"
                        value={sections[section.key] || ''}
                        onChange={(e) => updateSection(section.key, e.target.value)}
                        placeholder={section.placeholder}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {(sections[section.key] || '').trim() || 'Not published yet.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!canManage && !previewText.trim() && (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
          Leadership has not published the one-page plan yet. Check back after December strategy finalization.
        </div>
      )}

      {canManage && (
        <div className="sticky bottom-4 z-20 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded-xl bg-brand-red px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-red/25 disabled:opacity-60"
          >
            {saving ? 'Publishing…' : 'Publish one-page plan'}
          </button>
        </div>
      )}
    </div>
  );
};

export default StrategyOnePagePlanPanel;
