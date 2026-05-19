import React, { useEffect, useState } from 'react';
import { fetchOrgChart } from '../services/p3Api';

const OrgChartView: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchOrgChart().then(setData).catch(() => undefined);
  }, []);

  const employees = data?.employees || [];
  const byManager = new Map<string, any[]>();
  for (const emp of employees) {
    const key = String(emp.createdBy || 'root');
    if (!byManager.has(key)) byManager.set(key, []);
    byManager.get(key)!.push(emp);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Org chart</h1>
      <p className="text-slate-600">Hierarchy from employee reporting lines, departments, and teams.</p>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        {employees
          .filter((e: any) => !e.createdBy)
          .map((root: any) => (
            <TreeNode key={root.empId} employee={root} employees={employees} depth={0} />
          ))}
      </div>
    </div>
  );
};

function TreeNode({
  employee,
  employees,
  depth,
}: {
  employee: any;
  employees: any[];
  depth: number;
}) {
  const children = employees.filter(
    (e) => String(e.createdBy) === String(employee._id)
  );
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <p className="font-medium text-slate-900">
        {employee.empName}{' '}
        <span className="text-xs text-slate-500">
          ({employee.role}) · {employee.department}
          {employee.teamId ? ` · team ${employee.teamId}` : ''}
        </span>
      </p>
      {children.map((child) => (
        <TreeNode key={child.empId} employee={child} employees={employees} depth={depth + 1} />
      ))}
    </div>
  );
}

export default OrgChartView;
