import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, UserRound, UsersRound } from 'lucide-react';
import { fetchOrgChart } from '../services/p3Api';
import ErrorAlert from '../components/ui/ErrorAlert';

type Employee = {
  _id?: string;
  empId: string;
  empName: string;
  designation?: string;
  department?: string;
  role?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  createdBy?: string;
  createdAt?: string;
  joinedAt?: string;
  metrics?: {
    attendancePercentage?: number;
    attendanceDays?: number;
    taskCompletionPercentage?: number;
    assignedTasks?: number;
    completedTasks?: number;
    projectCount?: number;
    projects?: Array<{ id: string; name: string }>;
  };
};

type Relationship = 'Champion' | 'Supporter' | 'Neutral' | 'Blocker';

const OrgChartView: React.FC = () => {
  const [data, setData] = useState<{ employees?: Employee[] } | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchOrgChart();
      setData(next);
      const employees = Array.isArray(next?.employees) ? next.employees : [];
      setSelectedId((current) => current || employees[0]?._id || employees[0]?.empId || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load org chart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const employees = useMemo(() => normalizeEmployees(data?.employees || []), [data]);
  const selected = employees.find((employee) => getEmployeeKey(employee) === selectedId) || employees[0];
  const roots = useMemo(() => getRootEmployees(employees), [employees]);
  const children = selected ? getChildren(employees, selected) : [];
  const parent = selected ? getParent(employees, selected) : null;
  const chartScale = employees.length > 14 ? 0.64 : employees.length > 9 ? 0.72 : 0.82;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-red">People map</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Relationship mapping</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Select any person to view details and the people created under them.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <ErrorAlert message={error} />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        {loading ? (
          <div className="h-[52vh] animate-pulse rounded-lg bg-slate-100" />
        ) : roots.length ? (
          <div
            className="origin-top"
            style={{
              transform: `scale(${chartScale})`,
              transformOrigin: 'top center',
              width: `${100 / chartScale}%`,
              marginLeft: `${(100 - 100 / chartScale) / 2}%`,
              marginBottom: `-${Math.round((1 - chartScale) * 240)}px`,
            }}
          >
            <div className="flex flex-wrap justify-center gap-5">
              {roots.map((root) => (
                <OrgBranch
                  key={getEmployeeKey(root)}
                  employee={root}
                  employees={employees}
                  selectedId={getEmployeeKey(selected)}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="No employees found" text="Add active employees to see the relationship map." />
        )}
      </section>

      {selected && (
        <div className={children.length ? 'grid gap-4 xl:grid-cols-[0.9fr_1.3fr]' : ''}>
          <SelectedPersonCard employee={selected} parent={parent} childCount={children.length} />
          {children.length > 0 && (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Created under {selected.empName}</h2>
                  <p className="mt-1 text-sm text-slate-500">{children.length} direct person(s)</p>
                </div>
                <UsersRound className="text-slate-400" size={22} />
              </div>
              <div className="mt-5">
                <div className="flex flex-wrap gap-3">
                  {children.map((child) => (
                    <button
                      key={getEmployeeKey(child)}
                      type="button"
                      onClick={() => setSelectedId(getEmployeeKey(child))}
                      className="min-w-[210px] rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-brand-red/40 hover:bg-white"
                    >
                      <p className="font-semibold text-slate-950">{child.empName}</p>
                      <p className="mt-1 text-xs text-slate-500">{child.designation || child.role}</p>
                      <RelationshipBadge relationship={getRelationship(child)} />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

function OrgBranch({
  employee,
  employees,
  selectedId,
  onSelect,
}: {
  employee: Employee;
  employees: Employee[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const children = getChildren(employees, employee);
  const key = getEmployeeKey(employee);

  return (
    <div className="flex flex-col items-center">
      <PersonNode employee={employee} selected={key === selectedId} onClick={() => onSelect(key)} />
      {children.length > 0 && (
        <>
          <div className="h-4 w-px bg-slate-300" />
          <div className="relative flex flex-wrap items-start justify-center gap-4 px-1 pt-5">
            <div className="absolute left-5 right-5 top-0 h-px bg-slate-300" />
            {children.map((child) => (
              <OrgBranch
                key={getEmployeeKey(child)}
                employee={child}
                employees={employees}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PersonNode({ employee, selected, onClick }: { employee: Employee; selected: boolean; onClick: () => void }) {
  const relationship = getRelationship(employee);
  const tone = relationshipTone(relationship);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-w-[128px] max-w-[150px] rounded-lg border px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone.card} ${
        selected ? 'ring-2 ring-brand-red ring-offset-2' : ''
      }`}
    >
      <Avatar employee={employee} className="absolute -left-4 top-1/2 -translate-y-1/2" compact />
      <div className="pl-4">
        <p className="truncate text-[13px] font-bold text-slate-950">{employee.empName}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-600">{employee.designation || employee.role}</p>
        <RelationshipBadge relationship={relationship} />
      </div>
    </button>
  );
}

function SelectedPersonCard({ employee, parent, childCount }: { employee: Employee; parent: Employee | null; childCount: number }) {
  const metrics = employee.metrics || {};
  const projects = metrics.projects || [];
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-6">
        <Avatar employee={employee} className="h-16 w-16 text-lg" />
        <div className="grid flex-1 gap-x-8 gap-y-4 sm:grid-cols-[150px_minmax(0,1fr)]">
          <ProfileRow label="Name" value={employee.empName} strong />
          <ProfileRow label="Designation" value={employee.designation || employee.role || '-'} />
          <ProfileRow label="Relationship" value={<RelationshipBadge relationship={getRelationship(employee)} />} />
          <ProfileRow
            label="Email"
            value={
              employee.email ? (
                <a
                  href={`mailto:${employee.email}`}
                  className="font-semibold text-blue-600 underline decoration-blue-200 underline-offset-4 transition hover:text-brand-red"
                >
                  {employee.email}
                </a>
              ) : (
                '-'
              )
            }
          />
          <ProfileRow label="Phone Number" value={employee.phone || '-'} />
          <ProfileRow label="Employee ID" value={employee.empId} />
          <ProfileRow label="Department" value={employee.department || '-'} />
          <ProfileRow label="Reports / Created By" value={parent?.empName || 'Root'} />
          <ProfileRow label="Joined Org" value={formatDate(employee.joinedAt || employee.createdAt)} />
          <ProfileRow label="Direct Created" value={String(childCount)} />
          <ProfileRow label="Attendance" value={`${metrics.attendancePercentage || 0}% (${metrics.attendanceDays || 0}/30 days)`} />
          <ProfileRow
            label="Task Completion"
            value={`${metrics.taskCompletionPercentage || 0}% (${metrics.completedTasks || 0}/${metrics.assignedTasks || 0} tasks)`}
          />
          <ProfileRow label="Projects Involved" value={String(metrics.projectCount || 0)} />
          <ProfileRow
            label="Project List"
            value={projects.length ? projects.map((project) => project.name).join(', ') : '-'}
          />
        </div>
      </div>
    </section>
  );
}

function ProfileRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <>
      <div className="text-base text-slate-500">{label}</div>
      <div className={`${strong ? 'font-bold' : 'font-medium'} min-w-0 break-words text-base text-slate-900`}>
        {value}
      </div>
    </>
  );
}

function Avatar({
  employee,
  className = '',
  compact = false,
}: {
  employee: Employee;
  className?: string;
  compact?: boolean;
}) {
  const initials = (employee.empName || employee.empId || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sizeClass = compact ? 'h-9 w-9 text-xs' : 'h-11 w-11';

  if (employee.avatar) {
    return (
      <img
        src={employee.avatar}
        alt={employee.empName}
        className={`${sizeClass} rounded-full border-4 border-white bg-slate-100 object-cover shadow ${className}`}
      />
    );
  }

  return (
    <span className={`flex ${sizeClass} items-center justify-center rounded-full border-4 border-white bg-slate-800 font-bold text-white shadow ${className}`}>
      {initials || <UserRound size={18} />}
    </span>
  );
}

function RelationshipBadge({ relationship }: { relationship: Relationship }) {
  const tone = relationshipTone(relationship);
  return (
    <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.badge}`}>
      {relationship}
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function normalizeEmployees(rows: Employee[]) {
  return rows
    .filter((employee) => employee && (employee._id || employee.empId))
    .map((employee) => ({ ...employee, createdBy: employee.createdBy ? String(employee.createdBy) : '' }));
}

function getEmployeeKey(employee?: Employee | null) {
  return String(employee?._id || employee?.empId || '');
}

function getChildren(employees: Employee[], employee: Employee) {
  const key = getEmployeeKey(employee);
  return employees
    .filter((row) => String(row.createdBy || '') === key)
    .sort((a, b) => String(a.empName || '').localeCompare(String(b.empName || '')));
}

function getParent(employees: Employee[], employee: Employee) {
  return employees.find((row) => getEmployeeKey(row) === String(employee.createdBy || '')) || null;
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getRootEmployees(employees: Employee[]) {
  const employeeKeys = new Set(employees.map(getEmployeeKey));
  const roots = employees.filter((employee) => !employee.createdBy || !employeeKeys.has(String(employee.createdBy)));
  return roots.length ? roots : employees.slice(0, 1);
}

function getRelationship(employee: Employee): Relationship {
  const role = String(employee.role || '').toUpperCase();
  if (role.includes('SUPER') || role.includes('ADMIN')) return 'Champion';
  if (role.includes('TEAM')) return 'Supporter';
  if (String(employee.designation || '').toLowerCase().includes('block')) return 'Blocker';
  return 'Neutral';
}

function relationshipTone(relationship: Relationship) {
  if (relationship === 'Champion') {
    return { card: 'border-amber-200 bg-amber-100', badge: 'bg-amber-200 text-amber-900' };
  }
  if (relationship === 'Supporter') {
    return { card: 'border-lime-200 bg-lime-100', badge: 'bg-lime-200 text-lime-900' };
  }
  if (relationship === 'Blocker') {
    return { card: 'border-rose-200 bg-rose-100', badge: 'bg-rose-200 text-rose-900' };
  }
  return { card: 'border-sky-200 bg-sky-100', badge: 'bg-sky-200 text-sky-900' };
}

export default OrgChartView;
