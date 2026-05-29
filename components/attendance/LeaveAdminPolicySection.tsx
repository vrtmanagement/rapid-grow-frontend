import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Gift, PencilRuler, ScrollText, Shield, Users } from 'lucide-react';
import { LeaveAdminActivityItem, LeavePolicyConfig } from './attendanceUtils';
import { AttendanceEmployeeOption } from './attendanceViewUtils';
import FilterDropdown from './FilterDropdown';

interface Props {
  viewerRole: 'employee' | 'team_lead' | 'admin';
  canManagePolicy?: boolean;
  policies: LeavePolicyConfig[];
  activity: LeaveAdminActivityItem[];
  employeeOptions: AttendanceEmployeeOption[];
  savingPolicy?: boolean;
  savingAdjustment?: boolean;
  exportLoading?: boolean;
  onSavePolicy: (payload: Record<string, unknown>) => Promise<void>;
  onCreateAdjustment: (payload: Record<string, unknown>) => Promise<void>;
  onExport: () => void;
}

const leaveTypeOrder = ['CASUAL', 'SICK', 'PAID', 'UNPAID', 'HALF_DAY', 'EMERGENCY'];
const roleOptions = ['ADMIN', 'TEAM_LEAD', 'EMPLOYEE'];
const adjustmentOperationOptions = ['BONUS', 'DEDUCTION', 'CORRECTION'] as const;
const scopeOptions = [
  { value: 'company', label: 'Company' },
  { value: 'role', label: 'Role' },
  { value: 'team', label: 'Team' },
];

const LeaveAdminPolicySection: React.FC<Props> = ({
  viewerRole,
  canManagePolicy = false,
  policies,
  activity,
  employeeOptions,
  savingPolicy = false,
  savingAdjustment = false,
  exportLoading = false,
  onSavePolicy,
  onCreateAdjustment,
  onExport,
}) => {
  const canManage = canManagePolicy;
  const [scopeType, setScopeType] = useState<'company' | 'role' | 'team'>('company');
  const [role, setRole] = useState('EMPLOYEE');
  const [teamId, setTeamId] = useState('');
  const [policyName, setPolicyName] = useState('Default Leave Policy');
  const [monthlyPaidLeaves, setMonthlyPaidLeaves] = useState('2');
  const [maxCarryForward, setMaxCarryForward] = useState('6');
  const [carryForwardExpiryMonth, setCarryForwardExpiryMonth] = useState('3');
  const [halfDayDeduction, setHalfDayDeduction] = useState('0.5');
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState('2');
  const [carryForwardEnabled, setCarryForwardEnabled] = useState(true);
  const [autoLopWhenBalanceExhausted, setAutoLopWhenBalanceExhausted] = useState(true);
  const [policyNote, setPolicyNote] = useState('');
  const [adjustmentEmployeeEmpId, setAdjustmentEmployeeEmpId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('CASUAL');
  const [adjustmentOperation, setAdjustmentOperation] = useState<'BONUS' | 'DEDUCTION' | 'CORRECTION'>('BONUS');
  const [adjustmentDays, setAdjustmentDays] = useState('1');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [policyTypes, setPolicyTypes] = useState<Record<string, { monthlyAllocation: string; yearlyAllocation: string; paid: boolean }>>({});
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [adjustmentEmployeeDropdownOpen, setAdjustmentEmployeeDropdownOpen] = useState(false);
  const [adjustmentTypeDropdownOpen, setAdjustmentTypeDropdownOpen] = useState(false);
  const [adjustmentOperationDropdownOpen, setAdjustmentOperationDropdownOpen] = useState(false);
  const scopeDropdownRef = useRef<HTMLDivElement | null>(null);
  const roleDropdownRef = useRef<HTMLDivElement | null>(null);
  const adjustmentEmployeeDropdownRef = useRef<HTMLDivElement | null>(null);
  const adjustmentTypeDropdownRef = useRef<HTMLDivElement | null>(null);
  const adjustmentOperationDropdownRef = useRef<HTMLDivElement | null>(null);

  const configuredPolicies = useMemo(
    () => [...policies].sort((a, b) => a.scopeType.localeCompare(b.scopeType) || a.name.localeCompare(b.name)),
    [policies],
  );

  const activePolicy = useMemo(() => {
    return (
      configuredPolicies.find((policy) =>
        policy.scopeType === scopeType &&
        (scopeType !== 'role' || policy.role === role) &&
        (scopeType !== 'team' || policy.teamId === teamId),
      ) || configuredPolicies.find((policy) => policy.scopeType === 'company') || null
    );
  }, [configuredPolicies, role, scopeType, teamId]);

  const recentActivity = useMemo(() => activity.slice(0, 6), [activity]);
  const employeeDropdownOptions = useMemo(
    () =>
      employeeOptions.map((employee) => ({
        value: employee.empId,
        label: `${employee.empName} (${employee.empId})`,
      })),
    [employeeOptions],
  );
  const roleDropdownOptions = useMemo(
    () => roleOptions.map((option) => ({ value: option, label: option.replace(/_/g, ' ') })),
    [],
  );
  const leaveTypeDropdownOptions = useMemo(
    () => leaveTypeOrder.map((type) => ({ value: type, label: type.replace(/_/g, ' ') })),
    [],
  );
  const adjustmentOperationDropdownOptions = useMemo(
    () => adjustmentOperationOptions.map((option) => ({ value: option, label: option === 'DEDUCTION' ? 'Deduct' : option === 'CORRECTION' ? 'Correction' : 'Bonus' })),
    [],
  );
  const selectedAdjustmentEmployeeLabel =
    employeeDropdownOptions.find((option) => option.value === adjustmentEmployeeEmpId)?.label || 'Select employee';
  const selectedRoleLabel =
    roleDropdownOptions.find((option) => option.value === role)?.label || role.replace(/_/g, ' ');
  const selectedAdjustmentTypeLabel =
    leaveTypeDropdownOptions.find((option) => option.value === adjustmentType)?.label || adjustmentType.replace(/_/g, ' ');
  const selectedAdjustmentOperationLabel =
    adjustmentOperationDropdownOptions.find((option) => option.value === adjustmentOperation)?.label || adjustmentOperation;
  const selectedScopeLabel =
    scopeOptions.find((option) => option.value === scopeType)?.label || 'Company';

  useEffect(() => {
    if (
      !scopeDropdownOpen &&
      !roleDropdownOpen &&
      !adjustmentEmployeeDropdownOpen &&
      !adjustmentTypeDropdownOpen &&
      !adjustmentOperationDropdownOpen
    ) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (scopeDropdownRef.current && !scopeDropdownRef.current.contains(target)) {
        setScopeDropdownOpen(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(target)) {
        setRoleDropdownOpen(false);
      }
      if (adjustmentEmployeeDropdownRef.current && !adjustmentEmployeeDropdownRef.current.contains(target)) {
        setAdjustmentEmployeeDropdownOpen(false);
      }
      if (adjustmentTypeDropdownRef.current && !adjustmentTypeDropdownRef.current.contains(target)) {
        setAdjustmentTypeDropdownOpen(false);
      }
      if (adjustmentOperationDropdownRef.current && !adjustmentOperationDropdownRef.current.contains(target)) {
        setAdjustmentOperationDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setScopeDropdownOpen(false);
        setRoleDropdownOpen(false);
        setAdjustmentEmployeeDropdownOpen(false);
        setAdjustmentTypeDropdownOpen(false);
        setAdjustmentOperationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [
    adjustmentEmployeeDropdownOpen,
    adjustmentOperationDropdownOpen,
    adjustmentTypeDropdownOpen,
    roleDropdownOpen,
    scopeDropdownOpen,
  ]);

  useEffect(() => {
    if (!employeeOptions.length) return;
    setAdjustmentEmployeeEmpId((current) => current || employeeOptions[0].empId);
  }, [employeeOptions]);

  useEffect(() => {
    if (!activePolicy) return;
    setPolicyName(activePolicy.name);
    setMonthlyPaidLeaves(String(activePolicy.monthlyPaidLeaves));
    setMaxCarryForward(String(activePolicy.maxCarryForward));
    setCarryForwardExpiryMonth(String(activePolicy.carryForwardExpiryMonth));
    setHalfDayDeduction(String(activePolicy.halfDayDeduction));
    setLowBalanceThreshold(String(activePolicy.lowBalanceThreshold));
    setCarryForwardEnabled(activePolicy.carryForwardEnabled);
    setAutoLopWhenBalanceExhausted(activePolicy.autoLopWhenBalanceExhausted);
    setPolicyNote(activePolicy.notes || '');

    const nextTypes: Record<string, { monthlyAllocation: string; yearlyAllocation: string; paid: boolean }> = {};
    activePolicy.leaveTypes.forEach((entry) => {
      nextTypes[entry.type] = {
        monthlyAllocation: String(entry.monthlyAllocation),
        yearlyAllocation: String(entry.yearlyAllocation),
        paid: entry.paid,
      };
    });
    setPolicyTypes(nextTypes);
  }, [activePolicy]);

  const handleSavePolicy = async () => {
    const leaveTypes = leaveTypeOrder.map((type) => ({
      type,
      monthlyAllocation: Number(policyTypes[type]?.monthlyAllocation || 0),
      yearlyAllocation: Number(policyTypes[type]?.yearlyAllocation || 0),
      paid: Boolean(policyTypes[type]?.paid ?? type !== 'UNPAID'),
    }));

    await onSavePolicy({
      name: policyName,
      scopeType,
      role,
      teamId,
      monthlyPaidLeaves: Number(monthlyPaidLeaves || 0),
      maxCarryForward: Number(maxCarryForward || 0),
      carryForwardExpiryMonth: Number(carryForwardExpiryMonth || 1),
      halfDayDeduction: Number(halfDayDeduction || 0.5),
      lowBalanceThreshold: Number(lowBalanceThreshold || 0),
      carryForwardEnabled,
      autoLopWhenBalanceExhausted,
      notes: policyNote,
      leaveTypes,
    });
  };

  const handleCreateAdjustment = async () => {
    await onCreateAdjustment({
      employeeEmpId: adjustmentEmployeeEmpId,
      leaveType: adjustmentType,
      operation: adjustmentOperation,
      days: Number(adjustmentDays || 0),
      reason: adjustmentReason,
      effectiveDate: adjustmentDate,
    });
    setAdjustmentReason('');
  };

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red">
            <Shield size={14} />
            Admin Leave Controls
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-slate-950">Policy and balance management</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {configuredPolicies.map((policy) => (
            <span key={policy.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {policy.scopeType === 'company' ? 'Company' : policy.scopeType === 'role' ? policy.role : policy.teamId}
            </span>
          ))}
        </div>
      </div>

      {!canManage ? (
        <div className="mt-5 rounded-[24px] border border-sky-200 bg-sky-50/80 px-5 py-4 text-sm text-sky-700">
          Team leads can review active leave policies and activity logs here. Editing policies and manual balance adjustments remain restricted to admins.
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-slate-900">
                  <PencilRuler size={18} />
                  <h4 className="text-lg font-semibold">Leave policy builder</h4>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Scope</span>
                <FilterDropdown
                  value={scopeType}
                  selectedLabel={selectedScopeLabel}
                  options={scopeOptions}
                  open={scopeDropdownOpen}
                  onToggle={() => {
                    if (!canManage) return;
                    setScopeDropdownOpen((prev) => !prev);
                    setRoleDropdownOpen(false);
                    setAdjustmentEmployeeDropdownOpen(false);
                    setAdjustmentTypeDropdownOpen(false);
                    setAdjustmentOperationDropdownOpen(false);
                  }}
                  onSelect={(value) => {
                    setScopeType(value as 'company' | 'role' | 'team');
                    setScopeDropdownOpen(false);
                  }}
                  containerRef={scopeDropdownRef}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Policy name</span>
                <input
                  value={policyName}
                  onChange={(event) => setPolicyName(event.target.value)}
                  disabled={!canManage}
                  className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </label>

              {scopeType === 'role' ? (
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Role</span>
                  <FilterDropdown
                    value={role}
                    selectedLabel={selectedRoleLabel}
                    options={roleDropdownOptions}
                    open={roleDropdownOpen}
                    onToggle={() => {
                      if (!canManage) return;
                      setRoleDropdownOpen((prev) => !prev);
                      setScopeDropdownOpen(false);
                      setAdjustmentEmployeeDropdownOpen(false);
                      setAdjustmentTypeDropdownOpen(false);
                      setAdjustmentOperationDropdownOpen(false);
                    }}
                    onSelect={(value) => {
                      setRole(value);
                      setRoleDropdownOpen(false);
                    }}
                    containerRef={roleDropdownRef}
                  />
                </label>
              ) : null}

              {scopeType === 'team' ? (
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Team ID</span>
                  <input
                    value={teamId}
                    onChange={(event) => setTeamId(event.target.value)}
                    disabled={!canManage}
                    placeholder="Enter team ID"
                    className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Monthly paid leaves</span>
                <input
                  type="number"
                  step="0.5"
                  value={monthlyPaidLeaves}
                  onChange={(event) => setMonthlyPaidLeaves(event.target.value)}
                  disabled={!canManage}
                  className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Carry forward max</span>
                <input
                  type="number"
                  step="0.5"
                  value={maxCarryForward}
                  onChange={(event) => setMaxCarryForward(event.target.value)}
                  disabled={!canManage}
                  className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Expiry month</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={carryForwardExpiryMonth}
                  onChange={(event) => setCarryForwardExpiryMonth(event.target.value)}
                  disabled={!canManage}
                  className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Half-day deduction</span>
                <input
                  type="number"
                  step="0.25"
                  value={halfDayDeduction}
                  onChange={(event) => setHalfDayDeduction(event.target.value)}
                  disabled={!canManage}
                  className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Low balance alert</span>
                <input
                  type="number"
                  step="0.5"
                  value={lowBalanceThreshold}
                  onChange={(event) => setLowBalanceThreshold(event.target.value)}
                  disabled={!canManage}
                  className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Enable carry forward</p>
                  <p className="mt-1 text-xs text-slate-500">Roll unused balance into the next policy year.</p>
                </div>
                <input
                  type="checkbox"
                  checked={carryForwardEnabled}
                  onChange={(event) => setCarryForwardEnabled(event.target.checked)}
                  disabled={!canManage}
                  className="h-4 w-4 rounded border-slate-300 text-brand-red focus:ring-brand-red/20"
                />
              </label>

              <label className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Auto LOP on exhaustion</p>
                  <p className="mt-1 text-xs text-slate-500">Convert excess approvals into unpaid leave automatically.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoLopWhenBalanceExhausted}
                  onChange={(event) => setAutoLopWhenBalanceExhausted(event.target.checked)}
                  disabled={!canManage}
                  className="h-4 w-4 rounded border-slate-300 text-brand-red focus:ring-brand-red/20"
                />
              </label>
            </div>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.55fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <span>Leave type</span>
                <span>Monthly</span>
                <span>Yearly</span>
                <span>Paid</span>
              </div>
              <div className="divide-y divide-slate-100">
                {leaveTypeOrder.map((type) => (
                  <div key={type} className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.55fr] gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{type.replace(/_/g, ' ')}</span>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      value={policyTypes[type]?.monthlyAllocation || '0'}
                      disabled={!canManage}
                      onChange={(event) =>
                        setPolicyTypes((current) => ({
                          ...current,
                          [type]: {
                            monthlyAllocation: event.target.value,
                            yearlyAllocation: current[type]?.yearlyAllocation || '0',
                            paid: current[type]?.paid ?? type !== 'UNPAID',
                          },
                        }))
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={policyTypes[type]?.yearlyAllocation || '0'}
                      disabled={!canManage}
                      onChange={(event) =>
                        setPolicyTypes((current) => ({
                          ...current,
                          [type]: {
                            monthlyAllocation: current[type]?.monthlyAllocation || '0',
                            yearlyAllocation: event.target.value,
                            paid: current[type]?.paid ?? type !== 'UNPAID',
                          },
                        }))
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                    <label className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={policyTypes[type]?.paid ?? type !== 'UNPAID'}
                        disabled={!canManage}
                        onChange={(event) =>
                          setPolicyTypes((current) => ({
                            ...current,
                            [type]: {
                              monthlyAllocation: current[type]?.monthlyAllocation || '0',
                              yearlyAllocation: current[type]?.yearlyAllocation || '0',
                              paid: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-brand-red focus:ring-brand-red/20"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Policy notes</span>
              <textarea
                rows={4}
                value={policyNote}
                onChange={(event) => setPolicyNote(event.target.value)}
                disabled={!canManage}
                className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Optional notes for carry-forward, paid vs unpaid, or exception handling rules."
              />
            </label>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => void handleSavePolicy()}
                disabled={!canManage || savingPolicy}
                className={`inline-flex items-center gap-2 rounded-[20px] px-5 py-3 text-sm font-semibold text-white transition ${
                  !canManage || savingPolicy ? 'cursor-not-allowed bg-slate-300' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                <Shield size={16} />
                Save policy
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <Gift size={18} />
              <h4 className="text-lg font-semibold">Manual leave adjustment</h4>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Employee</span>
                <FilterDropdown
                  value={adjustmentEmployeeEmpId}
                  selectedLabel={selectedAdjustmentEmployeeLabel}
                  options={employeeDropdownOptions}
                  open={adjustmentEmployeeDropdownOpen}
                  onToggle={() => {
                    if (!canManage) return;
                    setAdjustmentEmployeeDropdownOpen((prev) => !prev);
                    setScopeDropdownOpen(false);
                    setRoleDropdownOpen(false);
                    setAdjustmentTypeDropdownOpen(false);
                    setAdjustmentOperationDropdownOpen(false);
                  }}
                  onSelect={(value) => {
                    setAdjustmentEmployeeEmpId(value);
                    setAdjustmentEmployeeDropdownOpen(false);
                  }}
                  containerRef={adjustmentEmployeeDropdownRef}
                  maxHeightClass="max-h-60"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.72fr)]">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Type</span>
                  <FilterDropdown
                    value={adjustmentType}
                    selectedLabel={selectedAdjustmentTypeLabel}
                    options={leaveTypeDropdownOptions}
                    open={adjustmentTypeDropdownOpen}
                    onToggle={() => {
                      if (!canManage) return;
                      setAdjustmentTypeDropdownOpen((prev) => !prev);
                      setScopeDropdownOpen(false);
                      setRoleDropdownOpen(false);
                      setAdjustmentEmployeeDropdownOpen(false);
                      setAdjustmentOperationDropdownOpen(false);
                    }}
                    onSelect={(value) => {
                      setAdjustmentType(value);
                      setAdjustmentTypeDropdownOpen(false);
                    }}
                    containerRef={adjustmentTypeDropdownRef}
                    maxHeightClass="max-h-60"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Operation</span>
                  <FilterDropdown
                    value={adjustmentOperation}
                    selectedLabel={selectedAdjustmentOperationLabel}
                    options={adjustmentOperationDropdownOptions}
                    open={adjustmentOperationDropdownOpen}
                    onToggle={() => {
                      if (!canManage) return;
                      setAdjustmentOperationDropdownOpen((prev) => !prev);
                      setScopeDropdownOpen(false);
                      setRoleDropdownOpen(false);
                      setAdjustmentEmployeeDropdownOpen(false);
                      setAdjustmentTypeDropdownOpen(false);
                    }}
                    onSelect={(value) => {
                      setAdjustmentOperation(value as 'BONUS' | 'DEDUCTION' | 'CORRECTION');
                      setAdjustmentOperationDropdownOpen(false);
                    }}
                    containerRef={adjustmentOperationDropdownRef}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Days</span>
                  <input
                    type="number"
                    step="0.5"
                    value={adjustmentDays}
                    onChange={(event) => setAdjustmentDays(event.target.value)}
                    disabled={!canManage}
                    className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Effective date</span>
                  <input
                    type="date"
                    value={adjustmentDate}
                    onChange={(event) => setAdjustmentDate(event.target.value)}
                    disabled={!canManage}
                    className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Reason</span>
                  <input
                    value={adjustmentReason}
                    onChange={(event) => setAdjustmentReason(event.target.value)}
                    disabled={!canManage}
                    placeholder="Bonus leave for release delivery"
                    className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={onExport}
                  disabled={exportLoading}
                  className={`inline-flex items-center gap-2 rounded-[20px] border border-slate-200 px-4 py-3 text-sm font-semibold transition ${
                    exportLoading ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950'
                  }`}
                >
                  <ScrollText size={16} />
                  Export report
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateAdjustment()}
                  disabled={!canManage || savingAdjustment}
                  className={`inline-flex items-center gap-2 rounded-[20px] px-4 py-3 text-sm font-semibold text-white transition ${
                    !canManage || savingAdjustment ? 'cursor-not-allowed bg-slate-300' : 'bg-brand-red hover:bg-red-600'
                  }`}
                >
                  <Gift size={16} />
                  Apply adjustment
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <Users size={18} />
              <h4 className="text-lg font-semibold">Recent admin activity</h4>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              A running audit trail of policy edits, balance adjustments, and administrative leave changes.
            </p>

            <div
              className="mt-5 space-y-3 overflow-y-auto pr-1"
              style={{ maxHeight: 'calc((7 * 104px) + (6 * 12px))' }}
            >
              {recentActivity.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No admin leave activity has been recorded yet.
                </div>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.summary}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.actorName || item.actorEmpId || 'System'} • {item.actorRole || 'Admin workflow'}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {item.targetEmpId ? (
                      <p className="mt-3 text-xs font-medium text-slate-500">
                        Target employee: <span className="text-slate-700">{item.targetEmpId}</span>
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LeaveAdminPolicySection;
