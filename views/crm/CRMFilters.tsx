import React from 'react';
import { canUseTeamFilters } from './RolePermissionUtils';

interface CRMFiltersProps {
  role?: string;
  filters: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

const CRMFilters: React.FC<CRMFiltersProps> = ({ role, filters, onChange }) => {
  const update = (key: string, value: string) => onChange({ ...filters, [key]: value });
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      {canUseTeamFilters(role) && <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Employee ID" value={filters.employeeId || ''} onChange={(e) => update('employeeId', e.target.value)} />}
      {canUseTeamFilters(role) && <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Team Lead ID" value={filters.teamLeadId || ''} onChange={(e) => update('teamLeadId', e.target.value)} />}
      <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Company" value={filters.company || ''} onChange={(e) => update('company', e.target.value)} />
      <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Position" value={filters.position || ''} onChange={(e) => update('position', e.target.value)} />
      <input type="date" className="rounded-lg border border-slate-300 px-3 py-2" value={filters.fromDate || ''} onChange={(e) => update('fromDate', e.target.value)} />
      <input type="date" className="rounded-lg border border-slate-300 px-3 py-2" value={filters.toDate || ''} onChange={(e) => update('toDate', e.target.value)} />
    </div>
  );
};

export default CRMFilters;
