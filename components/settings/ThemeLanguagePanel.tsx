import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useI18n, type Locale } from '../../context/I18nContext';

const ThemeLanguagePanel: React.FC = () => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 dark:border-slate-700 space-y-4">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">Appearance & language</h2>
      <label className="flex items-center justify-between text-sm">
        <span>{t('darkMode')}</span>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg border border-slate-200 px-3 py-1 dark:border-slate-600"
        >
          {theme === 'dark' ? 'On' : 'Off'}
        </button>
      </label>
      <label className="flex items-center justify-between text-sm">
        <span>{t('language')}</span>
        <select
          className="rounded-lg border border-slate-200 px-2 py-1 dark:bg-slate-800 dark:border-slate-600"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
        </select>
      </label>
      <button
        type="button"
        className="text-xs text-slate-500 underline"
        onClick={() => setTheme('light')}
      >
        Reset to light
      </button>
    </section>
  );
};

export default ThemeLanguagePanel;
