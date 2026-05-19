import React, { useEffect, useState } from 'react';
import { fetchStrengthsDashboard } from '../services/p3Api';

const StrengthsDashboardView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStrengthsDashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-slate-500">Loading strengths...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Strengths dashboard</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-3">Team top skills</h2>
          <ul className="space-y-2 text-sm">
            {(data.teamStrengths || []).map((row: any) => (
              <li key={row.name} className="flex justify-between">
                <span>{row.name}</span>
                <span className="text-slate-500">avg {row.avgLevel} · {row.people} people</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-3">By employee</h2>
          <ul className="space-y-3 text-sm max-h-96 overflow-y-auto">
            {(data.byEmployee || []).map((row: any) => (
              <li key={row.empId}>
                <p className="font-medium">{row.empId}</p>
                <p className="text-slate-600">
                  {(row.topSkills || []).map((s: any) => s.name).join(', ') || 'No skills yet'}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StrengthsDashboardView;
