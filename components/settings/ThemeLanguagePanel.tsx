import React, { useEffect, useMemo, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '../../context/ThemeContext';

const formatThemeLabel = (value: Theme) => value.charAt(0).toUpperCase() + value.slice(1);
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

const ThemeLanguagePanel: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [draftTheme, setDraftTheme] = useState<Theme>(theme);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light';
  });
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    setDraftTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_DARK_QUERY);
    const syncSystemTheme = () => setSystemTheme(media.matches ? 'dark' : 'light');

    syncSystemTheme();
    media.addEventListener('change', syncSystemTheme);
    return () => media.removeEventListener('change', syncSystemTheme);
  }, []);

  useEffect(() => {
    if (saveState !== 'saved') return undefined;
    const timer = window.setTimeout(() => setSaveState('idle'), 1800);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  const previewTheme = useMemo(
    () => (draftTheme === 'system' ? systemTheme : draftTheme),
    [draftTheme, systemTheme],
  );

  const hasChanges = draftTheme !== theme;

  const themeOptions: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const handleSave = () => {
    setTheme(draftTheme);
    setSaveState('saved');
  };

  const shellClassName =
    previewTheme === 'dark'
      ? 'border-slate-800/80 bg-[linear-gradient(145deg,#020617,#0f172a_50%,#111827)] text-white shadow-[0_24px_60px_rgba(2,6,23,0.26)]'
      : 'border-slate-200/80 bg-[linear-gradient(145deg,#ffffff,#f8fafc_52%,#eef4ff)] text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.08)]';

  const mutedTextClassName = previewTheme === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const secondaryTextClassName = previewTheme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const infoPillClassName =
    previewTheme === 'dark'
      ? 'border-white/10 bg-white/8 text-slate-100'
      : 'border-white/80 bg-white/80 text-slate-700';
  const optionShellClassName =
    previewTheme === 'dark'
      ? 'bg-white/[0.04] ring-1 ring-white/10'
      : 'bg-white/80 ring-1 ring-slate-200/80';

  return (
    <section className={`rounded-[28px] border px-7 py-7 transition-colors duration-300 ${shellClassName}`}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[1.75rem] font-semibold tracking-[-0.02em]">Appearance</p>
            <p className={`mt-2 text-sm ${mutedTextClassName}`}>
              Choose how the workspace should look across the app.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium ${infoPillClassName}`}>
              Current: {theme === 'system' ? `System (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})` : resolvedTheme === 'dark' ? 'Dark' : 'Light'}
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges}
              className="inline-flex min-w-[164px] items-center justify-center rounded-full bg-brand-red px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(230,28,33,0.24)] transition hover:bg-[#cf171c] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {saveState === 'saved' ? 'Saved' : 'Save appearance'}
            </button>
          </div>
        </div>

        <div className={`rounded-[24px] p-3 transition-colors duration-300 ${optionShellClassName}`}>
          <div className="grid gap-3 md:grid-cols-3">
            {themeOptions.map(({ value, label, icon: Icon }) => {
              const isSelected = draftTheme === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setDraftTheme(value);
                    setSaveState('idle');
                  }}
                  className={`group rounded-[20px] px-5 py-5 text-left transition-all duration-200 ${
                    isSelected
                      ? 'bg-brand-red text-white shadow-[0_16px_34px_rgba(230,28,33,0.24)]'
                      : previewTheme === 'dark'
                        ? 'bg-transparent text-slate-100 hover:bg-white/[0.06]'
                        : 'bg-transparent text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                      isSelected
                        ? 'bg-white/15 text-white'
                        : previewTheme === 'dark'
                          ? 'bg-white/[0.07] text-slate-100'
                          : 'bg-slate-100 text-slate-700'
                    }`}>
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold tracking-[-0.01em]">{label}</p>
                      <p className={`mt-1 text-xs font-medium ${isSelected ? 'text-white/80' : secondaryTextClassName}`}>
                        {value === 'system' ? `Follow device setting (${systemTheme === 'dark' ? 'Dark' : 'Light'})` : `${label} appearance`}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-black/5 pt-1 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div>
            <p className="text-sm font-medium">
              Selected theme: {formatThemeLabel(draftTheme)}
            </p>
            <p className={`mt-1 text-xs ${secondaryTextClassName}`}>
              {hasChanges
                ? 'Save to apply this choice throughout the workspace.'
                : draftTheme === 'system'
                  ? `Your workspace is following your device setting: ${systemTheme === 'dark' ? 'Dark' : 'Light'}.`
                  : 'Your appearance setting is already applied.'}
            </p>
          </div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-brand-red">
            {draftTheme === 'system' ? `Follows ${systemTheme} mode` : 'Manual selection'}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ThemeLanguagePanel;
