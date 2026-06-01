import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Filter, Printer } from 'lucide-react';
import type { ReportsAnalytics } from './expenseTypes';
import { EXPENSE_CATEGORY_LABELS, formatCompactCurrency, formatCurrency } from './expenseTypes';

const CHART_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

interface ReportsAnalyticsSectionProps {
  data: ReportsAnalytics | null;
  loading?: boolean;
}

const formatMonthLabel = (month: string) => {
  const [year, mon] = month.split('-');
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return labels[Number(mon) - 1] || month;
};

const ReportsAnalyticsSection: React.FC<ReportsAnalyticsSectionProps> = ({ data, loading = false }) => {
  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  const categoryData = data.spendByCategory.map((item, index) => ({
    name: EXPENSE_CATEGORY_LABELS[item.category as keyof typeof EXPENSE_CATEGORY_LABELS] || item.category,
    value: item.total,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const monthlyTrend = data.monthlySpendTrend.map((row) => ({
    ...row,
    label: formatMonthLabel(row.month),
  }));

  const budgetTrend = data.budgetVsActuals.map((row) => ({
    ...row,
    label: formatMonthLabel(row.month),
  }));

  const kpis = [
    {
      label: 'Total Spend (YTD)',
      value: formatCompactCurrency(data.kpis.totalSpendYtd),
      badge: `+${data.kpis.totalSpendYtdTrend}%`,
      badgeClass: 'bg-red-100 text-red-600',
    },
    {
      label: 'Avg Spend / Employee',
      value: formatCurrency(data.kpis.avgSpendPerEmployee),
      badge: `${data.kpis.avgSpendPerEmployeeTrend}%`,
      badgeClass: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Pending Reimbursements',
      value: formatCompactCurrency(data.kpis.pendingReimbursements),
      sub: `${data.kpis.pendingReimbursementsCount} items`,
    },
    {
      label: 'Policy Violations',
      value: String(data.kpis.policyViolations),
      badge: String(data.kpis.policyViolationsTrend),
      badgeClass: 'bg-emerald-100 text-emerald-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <Filter size={16} />
            Last 6 Months
          </button>
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            Department: All
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <Printer size={16} />
            Print
          </button>
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            CSV
          </button>
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            PDF
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              {kpi.badge && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${kpi.badgeClass}`}>{kpi.badge}</span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
            {kpi.sub && <p className="mt-1 text-sm text-slate-500">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">Monthly Spend Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `₹${Math.round(Number(value) / 1000)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="travel" stackId="a" fill="#8b5cf6" name="Travel" radius={[0, 0, 0, 0]} />
                <Bar dataKey="hotel" stackId="a" fill="#10b981" name="Hotel" radius={[0, 0, 0, 0]} />
                <Bar dataKey="meals" stackId="a" fill="#f59e0b" name="Meals" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">Travel Budget vs Actuals</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={budgetTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `₹${Math.round(Number(value) / 1000)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="Actual Spend" />
                <Line type="monotone" dataKey="budget" stroke="#93c5fd" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Budget" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">Top Spenders (YTD)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-2 py-2 font-medium">Employee</th>
                  <th className="px-2 py-2 font-medium">Department</th>
                  <th className="px-2 py-2 font-medium">Total Spend</th>
                  <th className="px-2 py-2 font-medium">Expenses</th>
                </tr>
              </thead>
              <tbody>
                {data.topSpenders.length ? (
                  data.topSpenders.map((row) => (
                    <tr key={row.employeeName} className="border-b border-slate-50">
                      <td className="px-2 py-3 font-medium text-slate-800">{row.employeeName}</td>
                      <td className="px-2 py-3 text-slate-600">{row.department}</td>
                      <td className="px-2 py-3 font-semibold text-slate-900">{formatCurrency(row.totalSpend)}</td>
                      <td className="px-2 py-3 text-slate-600">{row.expenseCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-2 py-8 text-center text-slate-500">
                      No spending data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">Spend by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {categoryData.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalyticsSection;
