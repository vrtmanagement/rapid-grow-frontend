import React, { useEffect, useState } from 'react';
import { fetchAiUsage } from '../services/p3Api';

const AiUsageDashboardView: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAiUsage(30).then(setData).catch(() => undefined);
  }, []);

  const summary = data?.summary;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">AI usage</h1>
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Calls" value={summary.totalCalls} />
          <Stat label="Est. cost" value={`$${summary.totalCost}`} />
          <Stat label="Remaining" value={summary.remainingCalls} />
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold mb-3">Recent calls</h2>
        <ul className="text-sm space-y-2">
          {(data?.recent || []).map((row: any) => (
            <li key={row._id} className="flex justify-between text-slate-700">
              <span>{row.endpoint}</span>
              <span>{new Date(row.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase text-slate-500 font-semibold">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

export default AiUsageDashboardView;
