import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Badge,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Shield,
  User,
  UserPlus,
} from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { PlanningState } from '../types';
import Toast from '../components/ui/Toast';

const BACKEND_ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TEAM_LEAD', label: 'Team Lead' },
  { value: 'EMPLOYEE', label: 'Employee' },
] as const;

const DEPARTMENT_OPTIONS = [
  'IT DEPARTMENT',
  'Product Management',
  'Design',
  'Human Resources',
  'Finance',
  'Sales',
  'Marketing',
  'Operations',
  'Customer Success',
  'Business Development',
] as const;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

const labelClassName = 'mb-2 block text-[14px] font-semibold text-slate-800';
const fieldClassName =
  'h-[42px] w-full rounded-[10px] border border-slate-200 bg-white px-4 text-[15px] text-slate-700 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/15';
const iconClassName = 'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400';
const leftIconFieldClassName = `${fieldClassName} pl-11`;
const rightIconFieldClassName = `${leftIconFieldClassName} pr-11`;

function getAllowedRoles(currentUser: PlanningState['currentUser']): { value: string; label: string }[] {
  const isSuperAdmin = currentUser.email === 'superadmin@example.com';
  if (isSuperAdmin) return [...BACKEND_ROLES];
  if (currentUser.role === 'Admin') return BACKEND_ROLES.filter((r) => r.value !== 'ADMIN');
  if (currentUser.role === 'Leader') return BACKEND_ROLES.filter((r) => r.value === 'EMPLOYEE');
  return [];
}

interface AddEmployeeViewProps {
  state: PlanningState;
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AddEmployeeView: React.FC<AddEmployeeViewProps> = ({
  state,
  embedded = false,
  onSuccess,
  onCancel,
}) => {
  const allowedRoles = useMemo(() => getAllowedRoles(state.currentUser), [state.currentUser]);
  const isSuperAdmin =
    state.currentUser.email === 'superadmin@example.com';
  const defaultRole = allowedRoles[0]?.value ?? 'EMPLOYEE';

  const [form, setForm] = useState<{
    empId: string;
    empName: string;
    designation: string;
    department: string;
    password: string;
    confirmPassword: string;
    email: string;
    phone: string;
    status: string;
    role: string;
    parentAdminEmpId: string;
  }>({
    empId: '',
    empName: '',
    designation: '',
    department: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    status: 'active',
    role: defaultRole,
    parentAdminEmpId: '',
  });

  React.useEffect(() => {
    const valid = allowedRoles.some((r) => r.value === form.role);
    if (!valid && allowedRoles.length > 0) {
      setForm((prev) => ({ ...prev, role: allowedRoles[0].value }));
    }
  }, [allowedRoles, form.role]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [adminOptions, setAdminOptions] = useState<{ empId: string; empName: string }[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [departmentDirection, setDepartmentDirection] = useState<'down' | 'up'>('down');
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleDirection, setRoleDirection] = useState<'down' | 'up'>('down');
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusDirection, setStatusDirection] = useState<'down' | 'up'>('down');
  const departmentDropdownRef = useRef<HTMLDivElement | null>(null);
  const departmentTriggerRef = useRef<HTMLButtonElement | null>(null);
  const roleDropdownRef = useRef<HTMLDivElement | null>(null);
  const roleTriggerRef = useRef<HTMLButtonElement | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);
  const statusTriggerRef = useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const getDropdownDirection = React.useCallback((trigger: HTMLButtonElement | null, optionCount: number) => {
    if (!trigger) return 'down' as const;
    const rect = trigger.getBoundingClientRect();
    const estimatedMenuHeight = Math.min(optionCount * 44 + 16, 240);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    return spaceBelow >= estimatedMenuHeight || spaceBelow >= spaceAbove ? 'down' as const : 'up' as const;
  }, []);

  const updateDepartmentDirection = React.useCallback(() => {
    setDepartmentDirection(getDropdownDirection(departmentTriggerRef.current, DEPARTMENT_OPTIONS.length));
  }, [getDropdownDirection]);

  const updateRoleDirection = React.useCallback(() => {
    setRoleDirection(getDropdownDirection(roleTriggerRef.current, allowedRoles.length));
  }, [allowedRoles.length, getDropdownDirection]);

  const updateStatusDirection = React.useCallback(() => {
    setStatusDirection(getDropdownDirection(statusTriggerRef.current, STATUS_OPTIONS.length));
  }, [getDropdownDirection]);

  React.useEffect(() => {
    if (!departmentOpen && !roleOpen && !statusOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!departmentDropdownRef.current?.contains(event.target as Node)) {
        setDepartmentOpen(false);
      }
      if (!roleDropdownRef.current?.contains(event.target as Node)) {
        setRoleOpen(false);
      }
      if (!statusDropdownRef.current?.contains(event.target as Node)) {
        setStatusOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDepartmentOpen(false);
        setRoleOpen(false);
        setStatusOpen(false);
      }
    };

    const handleViewportChange = () => {
      if (departmentOpen) updateDepartmentDirection();
      if (roleOpen) updateRoleDirection();
      if (statusOpen) updateStatusDirection();
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [departmentOpen, roleOpen, statusOpen, updateDepartmentDirection, updateRoleDirection, updateStatusDirection]);

  React.useEffect(() => {
    if (!isSuperAdmin) return;
    // Load admins list for "which admin team" selector
    fetch(`${API_BASE}/employees`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const admins = data
          .filter((e: any) => e.role === 'ADMIN')
          .map((e: any) => ({ empId: e.empId, empName: e.empName || e.empId }));
        setAdminOptions(admins);
      })
      .catch(() => {
        // silent failure – form still works, just without selector options
      });
  }, [isSuperAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!form.department.trim()) {
      setError('Please select a department');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (isSuperAdmin && form.role !== 'ADMIN' && !form.parentAdminEmpId) {
      setError('Please select which admin team this user belongs to');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/employees`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          empId: form.empId.trim(),
          empName: form.empName.trim(),
          designation: form.designation.trim(),
          department: form.department.trim(),
          password: form.password,
          role: form.role,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          status: form.status,
          parentAdminEmpId:
            isSuperAdmin && form.role !== 'ADMIN' ? form.parentAdminEmpId : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Failed to add employee');
      }

      setForm({
        empId: '',
        empName: '',
        designation: '',
        department: '',
        password: '',
        confirmPassword: '',
        email: '',
        phone: '',
        status: 'active',
        role: defaultRole,
        parentAdminEmpId: '',
      });
      setDepartmentOpen(false);
      setRoleOpen(false);
      setStatusOpen(false);
      setToast({
        type: 'success',
        message:
          form.role === 'ADMIN'
            ? 'Admin profile created successfully.'
            : form.role === 'TEAM_LEAD'
            ? 'Team lead profile created successfully.'
            : 'Employee profile created successfully.',
      });
      onSuccess?.();
    } catch (_err: any) {
      const message = _err?.message || 'Failed to add employee';
      const normalized = String(message).toLowerCase();

      if (normalized.includes('employee id already exists')) {
        setToast({
          type: 'error',
          message: normalized.includes('admin team')
            ? 'This employee ID is already in use in this admin team.'
            : 'This employee ID is already in use.',
        });
      } else if (normalized.includes('email') && normalized.includes('duplicate')) {
        setToast({
          type: 'error',
          message: 'This email address is already in use.',
        });
      } else if (normalized.includes('e11000') && normalized.includes('email')) {
        setToast({
          type: 'error',
          message: 'This email address is already in use.',
        });
      } else if (message && message !== 'Failed to add employee') {
        setToast({
          type: 'error',
          message,
        });
      } else {
        setToast({
          type: 'error',
          message:
            form.role === 'ADMIN'
              ? 'Admin profile could not be created.'
              : form.role === 'TEAM_LEAD'
              ? 'Team lead profile could not be created.'
              : 'Employee profile could not be created.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`mx-auto flex h-full w-full flex-col space-y-4 animate-in fade-in duration-700 ${
        embedded ? '' : 'max-w-[78rem]'
      }`}
    >
      {toast && <Toast type={toast.type} message={toast.message} />}
      {!embedded && (
        <div className="max-w-2xl">
          <h2 className="text-[2rem] font-semibold leading-tight tracking-tight text-slate-900">Add Employee</h2>
          <p className="mt-2 text-[14px] leading-6 text-slate-500">Create employee credentials for user portal access.</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={
          embedded
            ? 'bg-transparent px-0 py-0 shadow-none'
            : 'rounded-[12px] border border-slate-200 bg-white px-6 py-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.3)] lg:px-6 lg:py-5'
        }
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <div>
            <label className={labelClassName}>Employee ID *</label>
            <div className="relative">
              <Badge size={16} className={iconClassName} />
              <input
                name="empId"
                value={form.empId}
                onChange={handleChange}
                required
                className={leftIconFieldClassName}
                placeholder="e.g. EMP001"
              />
            </div>
          </div>
          <div>
            <label className={labelClassName}>Employee Name *</label>
            <div className="relative">
              <User size={16} className={iconClassName} />
              <input
                name="empName"
                value={form.empName}
                onChange={handleChange}
                required
                className={leftIconFieldClassName}
                placeholder="Full name"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <div>
            <label className={labelClassName}>Designation *</label>
            <div className="relative">
              <BriefcaseBusiness size={16} className={iconClassName} />
              <input
                name="designation"
                value={form.designation}
                onChange={handleChange}
                required
                className={leftIconFieldClassName}
                placeholder="e.g. Software Engineer"
              />
            </div>
          </div>
          <div>
            <label className={labelClassName}>Department *</label>
            <div ref={departmentDropdownRef} className="relative">
              <button
                ref={departmentTriggerRef}
                type="button"
                onClick={() => {
                  if (!departmentOpen) {
                    updateDepartmentDirection();
                  }
                  setDepartmentOpen((prev) => !prev);
                  setRoleOpen(false);
                  setStatusOpen(false);
                  setError(null);
                }}
                aria-haspopup="listbox"
                aria-expanded={departmentOpen}
                className={`flex h-[42px] w-full items-center justify-between rounded-[10px] border bg-white px-4 text-left text-[14px] outline-none transition-all duration-200 ${
                  departmentOpen
                    ? 'border-brand-red ring-2 ring-brand-red/15'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Building2 size={16} className="text-slate-400" />
                  <span className={form.department ? 'text-slate-700' : 'text-slate-400'}>
                    {form.department || 'Select department'}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-all duration-200 ${
                    departmentOpen ? 'rotate-180 text-brand-red' : 'text-slate-400'
                  }`}
                />
              </button>

              {departmentOpen && (
                <div
                  className={`absolute left-0 z-20 w-full overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_24px_48px_-28px_rgba(15,23,42,0.38)] ${
                    departmentDirection === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'
                  }`}
                >
                  <div className="max-h-40 overflow-y-auto py-1.5">
                    {DEPARTMENT_OPTIONS.map((department) => {
                      const isSelected = form.department === department;
                      return (
                        <button
                          key={department}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, department }));
                            setDepartmentOpen(false);
                            setError(null);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-[14px] transition-colors ${
                            isSelected
                              ? 'bg-brand-red/5 text-brand-red'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{department}</span>
                          <span
                            className={`h-2.5 w-2.5 rounded-full transition-colors ${
                              isSelected ? 'bg-brand-red' : 'bg-transparent'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <div>
            <label className={labelClassName}>Login Password *</label>
            <div className="relative">
              <Lock size={16} className={iconClassName} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className={rightIconFieldClassName}
                placeholder="Min 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClassName}>Confirm Password *</label>
            <div className="relative">
              <Lock size={16} className={iconClassName} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className={rightIconFieldClassName}
                placeholder="Re-enter password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <div>
            <label className={labelClassName}>Email</label>
            <div className="relative">
              <Mail size={16} className={iconClassName} />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={leftIconFieldClassName}
                placeholder="email@company.com"
              />
            </div>
          </div>
          <div>
            <label className={labelClassName}>Phone</label>
            <div className="relative">
              <Phone size={16} className={iconClassName} />
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={leftIconFieldClassName}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <div>
            <label className={labelClassName}>Role</label>
            <div ref={roleDropdownRef} className="relative">
              <button
                ref={roleTriggerRef}
                type="button"
                onClick={() => {
                  if (!roleOpen) {
                    updateRoleDirection();
                  }
                  setRoleOpen((prev) => !prev);
                  setDepartmentOpen(false);
                  setStatusOpen(false);
                  setError(null);
                }}
                aria-haspopup="listbox"
                aria-expanded={roleOpen}
                className={`flex h-[42px] w-full items-center justify-between rounded-[10px] border bg-white px-4 text-left text-[15px] outline-none transition-all duration-200 ${
                  roleOpen
                    ? 'border-brand-red ring-2 ring-brand-red/15'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Shield size={16} className="text-slate-400" />
                  <span className={form.role ? 'text-slate-700' : 'text-slate-400'}>
                    {allowedRoles.find((r) => r.value === form.role)?.label || 'Select role'}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-all duration-200 ${
                    roleOpen ? 'rotate-180 text-brand-red' : 'text-slate-400'
                  }`}
                />
              </button>

              {roleOpen && (
                <div
                  className={`absolute left-0 z-20 w-full overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_24px_48px_-28px_rgba(15,23,42,0.38)] ${
                    roleDirection === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'
                  }`}
                >
                  <div className="max-h-40 overflow-y-auto py-1.5">
                    {allowedRoles.map((role) => {
                      const isSelected = form.role === role.value;
                      return (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, role: role.value }));
                            setRoleOpen(false);
                            setError(null);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-[14px] transition-colors ${
                            isSelected
                              ? 'bg-brand-red/5 text-brand-red'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{role.label}</span>
                          <span
                            className={`h-2.5 w-2.5 rounded-full transition-colors ${
                              isSelected ? 'bg-brand-red' : 'bg-transparent'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className={labelClassName}>Status</label>
            <div ref={statusDropdownRef} className="relative">
              <button
                ref={statusTriggerRef}
                type="button"
                onClick={() => {
                  if (!statusOpen) {
                    updateStatusDirection();
                  }
                  setStatusOpen((prev) => !prev);
                  setDepartmentOpen(false);
                  setRoleOpen(false);
                  setError(null);
                }}
                aria-haspopup="listbox"
                aria-expanded={statusOpen}
                className={`flex h-[42px] w-full items-center justify-between rounded-[10px] border bg-white px-4 text-left text-[15px] outline-none transition-all duration-200 ${
                  statusOpen
                    ? 'border-brand-red ring-2 ring-brand-red/15'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Activity size={16} className="text-slate-400" />
                  <span className={form.status ? 'text-slate-700' : 'text-slate-400'}>
                    {STATUS_OPTIONS.find((status) => status.value === form.status)?.label || 'Select status'}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-all duration-200 ${
                    statusOpen ? 'rotate-180 text-brand-red' : 'text-slate-400'
                  }`}
                />
              </button>

              {statusOpen && (
                <div
                  className={`absolute left-0 z-20 w-full overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_24px_48px_-28px_rgba(15,23,42,0.38)] ${
                    statusDirection === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'
                  }`}
                >
                  <div className="max-h-40 overflow-y-auto py-1.5">
                    {STATUS_OPTIONS.map((status) => {
                      const isSelected = form.status === status.value;
                      return (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, status: status.value }));
                            setStatusOpen(false);
                            setError(null);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-[14px] transition-colors ${
                            isSelected
                              ? 'bg-brand-red/5 text-brand-red'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{status.label}</span>
                          <span
                            className={`h-2.5 w-2.5 rounded-full transition-colors ${
                              isSelected ? 'bg-brand-red' : 'bg-transparent'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isSuperAdmin && form.role !== 'ADMIN' && (
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <div>
              <label className={labelClassName}>
                Which Admin Team *
              </label>
              <div className="relative">
                <Shield size={16} className={iconClassName} />
                <select
                  name="parentAdminEmpId"
                  value={form.parentAdminEmpId}
                  onChange={handleChange}
                  className={`${leftIconFieldClassName} appearance-none pr-11`}
                >
                  <option value="">Select admin</option>
                  {adminOptions.map((a) => (
                    <option key={a.empId} value={a.empId}>
                      {a.empName} ({a.empId})
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-[8px] bg-brand-red px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_16px_28px_-18px_rgba(239,68,68,0.85)] transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="h-[15px] w-[15px] animate-spin rounded-full border-2 border-white/35 border-t-white" />
            ) : (
              <UserPlus size={15} />
            )}
            {loading
              ? 'Adding...'
              : form.role === 'ADMIN'
              ? 'Add Admin'
              : form.role === 'TEAM_LEAD'
              ? 'Add Team Lead'
              : 'Add Employee'}
          </button>
          {embedded ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[8px] bg-slate-100 px-5 py-2.5 text-[14px] font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              Cancel
            </button>
          ) : (
            <Link
              to="/"
              className="rounded-[8px] bg-slate-100 px-5 py-2.5 text-[14px] font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              Cancel
            </Link>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddEmployeeView;
