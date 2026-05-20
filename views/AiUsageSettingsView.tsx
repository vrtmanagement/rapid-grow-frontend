import React, { useState } from 'react';
import AiSettingsView from './AiSettingsView';
import AiUsageDashboardView from './AiUsageDashboardView';

const AiUsageSettingsView: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'usage' | 'settings'>('usage');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-red">AI operations</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">AI usage & settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Monitor calls and cost, then tune company AI defaults from the same screen.
        </p>
      </div>

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActivePanel('usage')}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            activePanel === 'usage' ? 'bg-brand-red text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Usage
        </button>
        <button
          type="button"
          onClick={() => setActivePanel('settings')}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            activePanel === 'settings' ? 'bg-brand-red text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Settings
        </button>
      </div>

      {activePanel === 'usage' ? <AiUsageDashboardView embedded /> : <AiSettingsView embedded />}
    </div>
  );
};

export default AiUsageSettingsView;
