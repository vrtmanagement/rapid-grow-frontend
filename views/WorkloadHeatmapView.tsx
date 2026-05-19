import React, { useEffect, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../config/api';
import ErrorAlert from '../components/ui/ErrorAlert';
import { getReadableError, parseApiResponse } from '../services/apiClient';

type HeatmapRow = {
  empId: string;
  name: string;
  department: string;
  weekly: Array<{
    weekStart: string;
    assignedHours: number;
    capacityHours: number;
    utilizationPct: number;
    taskCount: number;
  }>;
};

function cellTone(pct: number) {
  if (pct >= 100) return 'bg-red-500 text-white';
  if (pct >= 80) return 'bg-amber-400 text-slate-900';
  if (pct >= 50) return 'bg-emerald-300 text-slate-900';
  return 'bg-slate-100 text-slate-700';
}

const WorkloadHeatmapView: React.FC = () => {
  const [rows, setRows] = useState<HeatmapRow[]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/analytics/workload-heatmap?weeks=4`, {
          headers: getAuthHeaders(),
        });
        const data = await parseApiResponse<{ heatmap: { rows: HeatmapRow[]; weeks: string[] } }>(res);
        if (active) {
          setRows(data.heatmap.rows || []);
          setWeeks(data.heatmap.weeks || []);
        }
      } catch (err: any) {
        if (active) setError(getReadableError(err, 'Failed to load workload heatmap'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="text-slate-500">Loading workload heatmap...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Workload heatmap</h1>
        <p className="text-slate-600 mt-1">Weekly assigned hours vs default capacity (40h).</p>
      </div>
      <ErrorAlert message={error} />
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Employee</th>
              {weeks.map((week) => (
                <th key={week} className="px-3 py-3 text-center font-semibold text-slate-700">
                  {new Date(week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.empId} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.department}</p>
                </td>
                {row.weekly.map((cell) => (
                  <td key={`${row.empId}-${cell.weekStart}`} className="px-3 py-3 text-center">
                    <span
                      className={`inline-flex min-w-[72px] flex-col rounded-lg px-2 py-1 text-xs font-semibold ${cellTone(cell.utilizationPct)}`}
                      title={`${cell.assignedHours}h / ${cell.capacityHours}h`}
                    >
                      <span>{cell.assignedHours}h</span>
                      <span>{cell.utilizationPct}%</span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-6 text-slate-500">No workload data for this period.</p>}
      </div>
    </div>
  );
};

export default WorkloadHeatmapView;
