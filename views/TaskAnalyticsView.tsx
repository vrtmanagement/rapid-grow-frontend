import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { API_BASE, getAuthHeaders } from '../config/api';
import ErrorAlert from '../components/ui/ErrorAlert';
import { getReadableError, parseApiResponse } from '../services/apiClient';

type AnalyticsPayload = {
  summary: {
    totalTasks: number;
    totalCompleted: number;
    onTimePercentage: number;
    openOverdue: number;
  };
  overdueTrend: Array<{ weekStart: string; overdueCount: number; createdCount: number }>;
  byPerson: Array<{
    empId: string;
    name: string;
    assigned: number;
    completed: number;
    onTimePercentage: number;
  }>;
  byProject: Array<{
    projectId: string;
    projectName: string;
    assigned: number;
    completed: number;
    onTimePercentage: number;
  }>;
};

const TaskAnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/analytics/tasks?weeks=8`, {
          headers: getAuthHeaders(),
        });
        const data = await parseApiResponse<{ analytics: AnalyticsPayload }>(res);
        if (active) setAnalytics(data.analytics);
      } catch (err: any) {
        if (active) setError(getReadableError(err, 'Failed to load task analytics'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="text-slate-500">Loading task analytics...</p>;
  }

  if (!analytics) {
    return <ErrorAlert message={error || 'No analytics data'} />;
  }

  const trendData = analytics.overdueTrend.map((row) => ({
    label: new Date(row.weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    overdue: row.overdueCount,
    created: row.createdCount,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Task analytics</h1>
        <p className="text-slate-600 mt-1">On-time delivery, overdue trend, and completion by person and project.</p>
      </div>
      <ErrorAlert message={error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total tasks" value={analytics.summary.totalTasks} />
        <StatCard label="Completed" value={analytics.summary.totalCompleted} />
        <StatCard label="On-time %" value={`${analytics.summary.onTimePercentage}%`} />
        <StatCard label="Open overdue" value={analytics.summary.openOverdue} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Overdue trend</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="overdue" stroke="#dc2626" name="Overdue" />
              <Line type="monotone" dataKey="created" stroke="#64748b" name="Created" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="By person" data={analytics.byPerson} nameKey="name" />
        <ChartCard title="By project" data={analytics.byProject} nameKey="projectName" />
      </div>
    </div>
  );
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  data,
  nameKey,
}: {
  title: string;
  data: Array<Record<string, unknown>>;
  nameKey: string;
}) {
  const chartData = data.map((row) => ({
    name: String(row[nameKey] || row.empId || '—'),
    completed: Number(row.completed || 0),
    onTime: Number(row.onTimePercentage || 0),
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">{title}</h2>
      <PersonProjectBarChart data={chartData} />
    </div>
  );
}

function PersonProjectBarChart({ data }: { data: Array<{ name: string; completed: number; onTime: number }> }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="completed" fill="#0f172a" name="Completed" />
          <Bar dataKey="onTime" fill="#16a34a" name="On-time %" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TaskAnalyticsView;
