import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import ErrorAlert from '../components/ui/ErrorAlert';
import { apiGetJson } from '../config/api';
import { sendEmployeeInvite } from '../services/platformApi';

interface InviteEmployeeViewProps {
  embedded?: boolean;
  onSuccess?: () => void;
}

const ROLE_OPTIONS = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'TEAM_LEAD', label: 'Team Lead' },
  { value: 'ADMIN', label: 'Admin' },
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

const labelClassName = 'mb-2 block text-[14px] font-semibold text-slate-800';
const fieldClassName =
  'h-[46px] w-full rounded-[12px] border border-slate-200 bg-white px-4 text-[15px] text-slate-700 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/15';

const InviteEmployeeView: React.FC<InviteEmployeeViewProps> = ({
  embedded = false,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [empId, setEmpId] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('IT DEPARTMENT');
  const [error, setError] = useState('');
  const [empIdError, setEmpIdError] = useState('');
  const [existingEmpIds, setExistingEmpIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [roleDirection, setRoleDirection] = useState<'down' | 'up'>('down');
  const [departmentDirection, setDepartmentDirection] = useState<'down' | 'up'>('down');
  const roleDropdownRef = useRef<HTMLDivElement | null>(null);
  const roleTriggerRef = useRef<HTMLButtonElement | null>(null);
  const departmentDropdownRef = useRef<HTMLDivElement | null>(null);
  const departmentTriggerRef = useRef<HTMLButtonElement | null>(null);

  const getDropdownDirection = React.useCallback((trigger: HTMLButtonElement | null, optionCount: number) => {
    if (!trigger) return 'down' as const;
    const rect = trigger.getBoundingClientRect();
    const estimatedMenuHeight = Math.min(optionCount * 44 + 16, 240);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    return spaceBelow >= estimatedMenuHeight || spaceBelow >= spaceAbove ? 'down' as const : 'up' as const;
  }, []);

  const updateRoleDirection = React.useCallback(() => {
    setRoleDirection(getDropdownDirection(roleTriggerRef.current, ROLE_OPTIONS.length));
  }, [getDropdownDirection]);

  const updateDepartmentDirection = React.useCallback(() => {
    setDepartmentDirection(getDropdownDirection(departmentTriggerRef.current, DEPARTMENT_OPTIONS.length));
  }, [getDropdownDirection]);

  const normalizedExistingEmpIds = useMemo(
    () => new Set(existingEmpIds.map((id) => id.trim().toLowerCase()).filter(Boolean)),
    [existingEmpIds],
  );

  const validateEmpId = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Employee ID is required.';
    }
    if (normalizedExistingEmpIds.has(trimmed.toLowerCase())) {
      return 'This employee ID already exists.';
    }
    return '';
  };

  useEffect(() => {
    let active = true;

    apiGetJson<Array<{ empId?: string }>>('/employees')
      .then((employees) => {
        if (!active) return;
        setExistingEmpIds(
          (Array.isArray(employees) ? employees : [])
            .map((employee) => String(employee.empId || '').trim())
            .filter(Boolean),
        );
      })
      .catch(() => {
        if (!active) return;
        setExistingEmpIds([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!roleOpen && !departmentOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!roleDropdownRef.current?.contains(event.target as Node)) {
        setRoleOpen(false);
      }
      if (!departmentDropdownRef.current?.contains(event.target as Node)) {
        setDepartmentOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRoleOpen(false);
        setDepartmentOpen(false);
      }
    };

    const handleViewportChange = () => {
      if (roleOpen) updateRoleDirection();
      if (departmentOpen) updateDepartmentDirection();
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
  }, [departmentOpen, roleOpen, updateDepartmentDirection, updateRoleDirection]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setInviteUrl('');

    const nextEmpIdError = validateEmpId(empId);
    setEmpIdError(nextEmpIdError);
    if (nextEmpIdError) return;

    setLoading(true);
    try {
      const res = await sendEmployeeInvite({
        email: email.trim(),
        role,
        empId: empId.trim(),
        designation: designation.trim() || undefined,
        department: department.trim() || undefined,
      });
      setEmail('');
      setEmpId('');
      setEmpIdError('');
      setRole('EMPLOYEE');
      setDesignation('');
      setDepartment('IT DEPARTMENT');
      setRoleOpen(false);
      setDepartmentOpen(false);
      setExistingEmpIds((prev) => [...prev, empId.trim()]);
      setMessage(res.message || 'Invite sent.');
      if (res.invite?.inviteUrl) setInviteUrl(res.invite.inviteUrl);
      onSuccess?.();
    } catch (err: any) {
      const message = String(err?.message || 'Failed to send invite');
      const normalized = message.toLowerCase();
      if (normalized.includes('employee id') || normalized.includes('empid') || normalized.includes('already exists')) {
        setEmpIdError(
          normalized.includes('email')
            ? ''
            : 'This employee ID already exists.',
        );
        if (normalized.includes('email')) {
          setError(message);
        }
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={embedded ? 'space-y-5' : 'max-w-[48rem] space-y-6'}>
      <header>
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-slate-900">Invite employee</h1>
        <p className="mt-2 max-w-[48rem] text-[14px] leading-7 text-slate-600">
          Sends an email with a link to accept the invite and set a password. Email must not already
          exist in Staff.
        </p>
      </header>

      <ErrorAlert message={error} />
      {message ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {inviteUrl ? (
        <p className="break-all rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Dev / fallback link:{' '}
          <a href={inviteUrl} className="underline">
            {inviteUrl}
          </a>
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="w-full space-y-5 rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className={labelClassName}>Email</label>
            <input
              type="email"
              required
              className={fieldClassName}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div ref={roleDropdownRef} className="relative">
            <label className={labelClassName}>Role</label>
            <button
              ref={roleTriggerRef}
              type="button"
              onClick={() => {
                setRoleOpen((prev) => !prev);
                setDepartmentOpen(false);
                updateRoleDirection();
              }}
              className={`flex h-[46px] w-full items-center justify-between rounded-[12px] border bg-white px-4 text-left text-[15px] text-slate-700 transition ${
                roleOpen
                  ? 'border-brand-red shadow-[0_0_0_3px_rgba(239,68,68,0.10)]'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{ROLE_OPTIONS.find((option) => option.value === role)?.label || 'Employee'}</span>
              <ChevronDown size={18} className={`text-slate-500 transition ${roleOpen ? 'rotate-180' : ''}`} />
            </button>

            {roleOpen ? (
              <div
                className={`absolute left-0 z-20 w-full overflow-hidden rounded-[12px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.14)] ${
                  roleDirection === 'up' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'
                }`}
              >
                {ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setRole(option.value);
                      setRoleOpen(false);
                    }}
                    className={`flex w-full items-center rounded-[8px] px-3 py-2 text-left text-[13px] transition ${
                      role === option.value
                        ? 'bg-brand-red text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <label className={labelClassName}>Employee ID *</label>
            <input
              required
              className={`${fieldClassName} ${empIdError ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
              value={empId}
              onChange={(event) => {
                const nextValue = event.target.value;
                setEmpId(nextValue);
                if (empIdError) {
                  setEmpIdError(validateEmpId(nextValue));
                }
              }}
              onBlur={() => setEmpIdError(validateEmpId(empId))}
              placeholder="e.g. EMP001"
            />
            {empIdError ? (
              <p className="mt-2 text-[13px] font-medium text-red-600">{empIdError}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClassName}>Designation</label>
            <input
              className={fieldClassName}
              value={designation}
              onChange={(event) => setDesignation(event.target.value)}
            />
          </div>

          <div className="relative md:col-span-2">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
              <div ref={departmentDropdownRef} className="relative">
                <label className={labelClassName}>Department</label>
                <button
                  ref={departmentTriggerRef}
                  type="button"
                  onClick={() => {
                    setDepartmentOpen((prev) => !prev);
                    setRoleOpen(false);
                    updateDepartmentDirection();
                  }}
                  className={`flex h-[46px] w-full items-center justify-between rounded-[12px] border bg-white px-4 text-left text-[15px] text-slate-700 transition ${
                    departmentOpen
                      ? 'border-brand-red shadow-[0_0_0_3px_rgba(239,68,68,0.10)]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{department}</span>
                  <ChevronDown
                    size={18}
                    className={`text-slate-500 transition ${departmentOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {departmentOpen ? (
                  <div
                    className={`absolute left-0 z-20 max-h-60 w-full overflow-y-auto rounded-[12px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.14)] ${
                      departmentDirection === 'up' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'
                    }`}
                  >
                    {DEPARTMENT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setDepartment(option);
                          setDepartmentOpen(false);
                        }}
                        className={`flex w-full items-center rounded-[8px] px-3 py-2 text-left text-[13px] transition ${
                          department === option
                            ? 'bg-brand-red text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-[12px] bg-brand-red px-5 text-[15px] font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                ) : (
                  <Send size={16} />
                )}
                {loading ? 'Sending...' : 'Send invite email'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {!embedded ? (
        <p className="text-sm text-slate-500">
          Or{' '}
          <Link to="/employees/add" className="font-medium text-brand-red">
            add employee with password
          </Link>{' '}
          directly.
        </p>
      ) : null}
    </section>
  );
};

export default InviteEmployeeView;
