import React, { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { GlossaryEntry } from '../../services/strategyExecutionApi';

interface StrategyGlossaryPanelProps {
  entries: GlossaryEntry[];
}

const GLOSSARY_GROUPS: { title: string; description: string; terms: string[] }[] = [
  {
    title: 'Strategy reviews',
    description: 'How you look backward at performance and forward at risk.',
    terms: ['SPR', 'SER'],
  },
  {
    title: 'Planning horizons',
    description: 'The time frames used in your strategic business plans.',
    terms: ['SBP 1', 'SBP 3', 'Q1'],
  },
  {
    title: 'Goals & execution',
    description: 'How goals are shaped and who drives delivery.',
    terms: ['SMART → FAST', 'Execution Team'],
  },
  {
    title: 'Roles & accountability',
    description: 'Who leads departments and sets company direction.',
    terms: ['Department Heads', 'Top Management'],
  },
];

const StrategyGlossaryPanel: React.FC<StrategyGlossaryPanelProps> = ({ entries }) => {
  const [query, setQuery] = useState('');

  const entryMap = useMemo(
    () => Object.fromEntries(entries.map((entry) => [entry.term, entry.definition])),
    [entries]
  );

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY_GROUPS.map((group) => ({
      ...group,
      items: group.terms
        .map((term) => ({ term, definition: entryMap[term] || '' }))
        .filter(
          (item) =>
            item.definition &&
            (!q ||
              item.term.toLowerCase().includes(q) ||
              item.definition.toLowerCase().includes(q))
        ),
    })).filter((group) => group.items.length > 0);
  }, [entryMap, query]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Strategy glossary</h3>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Key terms used across the execution calendar, strategy map, and planning meetings.
                Use this as a shared language for your team.
              </p>
            </div>
          </div>
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {filteredGroups.map((group) => (
          <section
            key={group.title}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{group.title}</h4>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{group.description}</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {group.items.map((item) => (
                <div key={item.term} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-6">
                  <div className="sm:w-40 shrink-0">
                    <span className="inline-flex rounded-lg bg-brand-red/10 px-2.5 py-1 text-xs font-bold text-brand-red">
                      {item.term}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {item.definition}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          No glossary terms match your search.
        </p>
      )}

      <blockquote className="rounded-2xl border border-slate-200 bg-gradient-to-r from-rose-50 to-white px-6 py-5 text-sm italic leading-relaxed text-slate-600 dark:border-slate-800 dark:from-rose-950/20 dark:to-slate-900 dark:text-slate-400">
        &ldquo;Goals without routines are wishes; routines without goals are aimless. The most
        successful business leaders have a clear vision and the discipline (routines / cadence) to
        make it a reality.&rdquo;
      </blockquote>
    </div>
  );
};

export default StrategyGlossaryPanel;
