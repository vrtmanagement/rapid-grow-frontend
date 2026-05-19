import React, { useEffect, useState } from 'react';
import { fetchAiSettings, updateAiSettings } from '../services/p3Api';

const AiSettingsView: React.FC = () => {
  const [form, setForm] = useState({
    hourlyRate: 75,
    currency: 'USD',
    requireApproval: true,
    monthlyCallLimit: 500,
    defaultProvider: 'gemini',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchAiSettings().then((data) => {
      if (data.settings) setForm({ ...form, ...data.settings });
    });
  }, []);

  const save = async () => {
    await updateAiSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">AI settings</h1>
      {(['hourlyRate', 'currency', 'monthlyCallLimit', 'defaultProvider'] as const).map((key) => (
        <div key={key}>
          <label className="block text-sm font-semibold text-slate-700 mb-1">{key}</label>
          <input
            value={String(form[key])}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                [key]: key === 'hourlyRate' || key === 'monthlyCallLimit' ? Number(e.target.value) : e.target.value,
              }))
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.requireApproval}
          onChange={(e) => setForm((prev) => ({ ...prev, requireApproval: e.target.checked }))}
        />
        Require manager approval before TaskHub publish
      </label>
      <button type="button" onClick={save} className="rounded-lg bg-brand-red px-4 py-2 text-white font-semibold">
        Save settings
      </button>
      {saved && <p className="text-sm text-emerald-700">Saved.</p>}
    </div>
  );
};

export default AiSettingsView;
