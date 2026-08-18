import React, { useEffect, useMemo, useState } from 'react';
import { Check, Globe2, Search } from 'lucide-react';
import { saveUserTimezone } from '../../services/userTimezone';
import { useUserTimeZone } from '../../context/TimezoneContext';
import {
  TIMEZONE_GROUPS,
  formatDateTimeInUserTimeZone,
  getTimezoneOption,
  normalizeUserTimeZone,
} from '../../utils/timezone';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const ChangeTimezonePanel: React.FC = () => {
  const { timeZone, setTimeZone } = useUserTimeZone();
  const [draftTimeZone, setDraftTimeZone] = useState(timeZone);
  const [query, setQuery] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [nowLabel, setNowLabel] = useState(() => formatDateTimeInUserTimeZone(new Date()));

  useEffect(() => {
    setDraftTimeZone(timeZone);
  }, [timeZone]);

  useEffect(() => {
    if (saveState !== 'saved') return undefined;
    const timer = window.setTimeout(() => setSaveState('idle'), 1800);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  useEffect(() => {
    const tick = () => {
      const previous = getUserTimeZoneSafe();
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: draftTimeZone,
        });
        setNowLabel(formatter.format(new Date()));
      } catch {
        setNowLabel(previous);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [draftTimeZone]);

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return TIMEZONE_GROUPS;
    return TIMEZONE_GROUPS.map((group) => ({
      ...group,
      options: group.options.filter((option) =>
        `${option.label} ${option.abbr} ${option.value}`.toLowerCase().includes(needle),
      ),
    })).filter((group) => group.options.length > 0);
  }, [query]);

  const selectedOption = getTimezoneOption(draftTimeZone);
  const savedOption = getTimezoneOption(timeZone);
  const hasChanges = draftTimeZone !== timeZone;

  const handleSave = async () => {
    const next = normalizeUserTimeZone(draftTimeZone);
    setSaveState('saving');
    setError(null);
    try {
      const saved = await saveUserTimezone(next);
      setTimeZone(saved);
      setDraftTimeZone(saved);
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      setError(e instanceof Error ? e.message : 'Failed to update time zone');
    }
  };

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(145deg,#ffffff,#f8fafc_52%,#eef4ff)] px-7 py-7 text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[1.75rem] font-semibold tracking-[-0.02em]">Change Time Zone</p>
            <p className="mt-2 text-sm text-slate-600">
              Choose your time region. Dates and times across the app will show in this zone for you only.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700">
              Now: {nowLabel}
            </span>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!hasChanges || saveState === 'saving'}
              className="inline-flex min-w-[164px] items-center justify-center rounded-full bg-brand-red px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(230,28,33,0.24)] transition hover:bg-[#cf171c] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Save time zone'}
            </button>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-brand-red/50 focus:ring-2 focus:ring-brand-red/15"
            placeholder="Search ET, EST, GST, IST, New York, Dubai..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="max-h-[520px] space-y-5 overflow-y-auto pr-1">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {group.label}
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {group.options.map((option) => {
                  const isSelected = draftTimeZone === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setDraftTimeZone(option.value);
                        setSaveState('idle');
                        setError(null);
                      }}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-brand-red bg-brand-red text-white shadow-[0_12px_28px_rgba(230,28,33,0.18)]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                            isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Globe2 size={18} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{option.label}</span>
                          <span className={`block text-xs ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                            {option.abbr} · {option.value.replace(/_/g, ' ')}
                          </span>
                        </span>
                      </span>
                      {isSelected ? <Check size={16} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {!filteredGroups.length ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              No matching time zones.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-black/5 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              Selected: {selectedOption ? `${selectedOption.label} (${selectedOption.abbr})` : draftTimeZone}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {error
                ? error
                : hasChanges
                  ? 'Save to apply this time zone to every tab for your account only.'
                  : `Currently using ${savedOption ? `${savedOption.label} (${savedOption.abbr})` : timeZone}.`}
            </p>
          </div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-brand-red">
            Personal setting
          </div>
        </div>
      </div>
    </section>
  );
};

function getUserTimeZoneSafe() {
  try {
    return formatDateTimeInUserTimeZone(new Date());
  } catch {
    return '';
  }
}

export default ChangeTimezonePanel;
