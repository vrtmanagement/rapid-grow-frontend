import React, { createContext, useContext, useMemo, useState } from 'react';

export type Locale = 'en' | 'hi';

const messages: Record<Locale, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    spaces: 'Spaces',
    staff: 'Staff',
    crm: 'CRM',
    settings: 'Settings',
    search: 'Search',
    planUsage: 'Plan usage',
    superAdmin: 'Super Admin',
    dataPrivacy: 'Data & privacy',
    darkMode: 'Dark mode',
    language: 'Language',
    upgradePlan: 'Upgrade plan',
    exportData: 'Export data',
    closeAccount: 'Close account',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    spaces: 'स्पेस',
    staff: 'स्टाफ',
    crm: 'सीआरएम',
    settings: 'सेटिंग्स',
    search: 'खोजें',
    planUsage: 'प्लान उपयोग',
    superAdmin: 'सुपर एडमिन',
    dataPrivacy: 'डेटा और गोपनीयता',
    darkMode: 'डार्क मोड',
    language: 'भाषा',
    upgradePlan: 'प्लान अपग्रेड करें',
    exportData: 'डेटा निर्यात',
    closeAccount: 'खाता बंद करें',
  },
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const STORAGE_KEY = 'rapidgrow-locale';
const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'hi' ? 'hi' : 'en';
  });

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const t = (key: string) => messages[locale][key] || messages.en[key] || key;

  const value = useMemo(() => ({ locale, setLocale, t }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
