import React, { useState } from 'react';
import { analyzeSkillGaps } from '../services/p3Api';

const SkillGapAnalysisView: React.FC = () => {
  const [required, setRequired] = useState('React, Node.js, Project management');
  const [gaps, setGaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const skills = required.split(',').map((s) => s.trim()).filter(Boolean);
      const data = await analyzeSkillGaps(skills);
      setGaps(data.gaps || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Skill gap analysis</h1>
      <p className="text-slate-600 mt-1">Compare required skills vs your team&apos;s learned skills.</p>
      <textarea
        value={required}
        onChange={(e) => setRequired(e.target.value)}
        className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm min-h-[80px]"
      />
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="mt-3 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? 'Analyzing...' : 'Analyze gaps'}
      </button>
      <ul className="mt-6 space-y-2">
        {gaps.map((gap) => (
          <li
            key={gap.skill}
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm flex justify-between"
          >
            <span className="font-medium">{gap.skill}</span>
            <span className={gap.gap === 'missing' ? 'text-red-600' : 'text-emerald-700'}>
              {gap.gap} ({gap.availableCount})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SkillGapAnalysisView;
