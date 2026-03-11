import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, UserPlus, Check, Eye, EyeOff } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { PlanningState } from '../types';

const BACKEND_ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TEAM_LEAD', label: 'Team Lead' },
  { value: 'EMPLOYEE', label: 'Employee' },
] as const;

function getAllowedRoles(currentUser: PlanningState['currentUser']): { value: string; label: string }[] {
  const isSuperAdmin =
    currentUser.role === 'Admin' && currentUser.powers?.includes('EDIT_STRATEGY');
  if (isSuperAdmin) return [...BACKEND_ROLES];
  if (currentUser.role === 'Admin') return BACKEND_ROLES.filter((r) => r.value !== 'ADMIN');
  if (currentUser.role === 'Leader') return BACKEND_ROLES.filter((r) => r.value === 'EMPLOYEE');
  return [];
}

interface AddEmployeeViewProps {
  state: PlanningState;
}

const AddEmployeeView: React.FC<AddEmployeeViewProps> = ({ state }) => {
  const allowedRoles = useMemo(() => getAllowedRoles(state.currentUser), [state.currentUser]);
  const isSuperAdmin =
    state.currentUser.role === 'Admin' &&
    Array.isArray(state.currentUser.powers) &&
    state.currentUser.powers.includes('EDIT_STRATEGY');
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
  const [success, setSuccess] = useState(false);
  const [createdRole, setCreatedRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [adminOptions, setAdminOptions] = useState<{ empId: string; empName: string }[]>([]);

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
    setForm(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
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

      setCreatedRole(form.role);
      setSuccess(true);
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
    } catch (_err: any) {
      const roleLabel =
        form.role === 'ADMIN'
          ? 'admin'
          : form.role === 'TEAM_LEAD'
          ? 'team lead'
          : 'employee';
      setError(`Failed to create ${roleLabel}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const createdLabel =
      createdRole === 'ADMIN'
        ? 'Admin'
        : createdRole === 'TEAM_LEAD'
        ? 'Team Lead'
        : 'Employee';
    const createdLower = createdLabel.toLowerCase();
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="bg-white p-12 rounded-3xl shadow-2xl border border-slate-200 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-green-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-900">{createdLabel} Added Successfully</h3>
          <p className="text-slate-600 mt-2">
            The {createdLower} can now log in to the user portal with their credentials.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <Link
              to="/employees/add"
              onClick={() => {
                setSuccess(false);
                setCreatedRole(null);
              }}
              className="px-6 py-3 bg-brand-red text-white rounded-full font-bold hover:bg-brand-navy transition-colors"
            >
              Add Another {createdLabel}
            </Link>
            <Link
              to="/"
              className="px-6 py-3 bg-slate-100 text-slate-800 rounded-full font-bold hover:bg-slate-200 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 rounded-full text-[15px] text-brand-grey hover:bg-slate-200 transition-all"
        >
          <RotateCcw size={14} /> Back to Dashboard
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1.5 w-8 bg-brand-red rounded-full"></div>
          <span className="text-[15px] text-slate-500">Personnel Management</span>
        </div>
        <h2 className="text-4xl text-slate-900 leading-none">Add Employee</h2>
        <p className="text-slate-500 text-lg mt-3">Create employee credentials for user portal access.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-3xl shadow-2xl border border-slate-200 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-[15px]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Employee ID *</label>
            <input
              name="empId"
              value={form.empId}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              placeholder="e.g. EMP001"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Employee Name *</label>
            <input
              name="empName"
              value={form.empName}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              placeholder="Full name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Designation *</label>
            <input
              name="designation"
              value={form.designation}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              placeholder="e.g. Software Engineer"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Department *</label>
            <input
              name="department"
              value={form.department}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              placeholder="e.g. Engineering"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Login Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-11 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                placeholder="Min 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Confirm Password *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-11 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                placeholder="Re-enter password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              placeholder="email@company.com"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              placeholder="+1 234 567 8900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
            >
              {allowedRoles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {isSuperAdmin && form.role !== 'ADMIN' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">
                Which Admin Team *
              </label>
              <select
                name="parentAdminEmpId"
                value={form.parentAdminEmpId}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
              >
                <option value="">Select admin</option>
                {adminOptions.map((a) => (
                  <option key={a.empId} value={a.empId}>
                    {a.empName} ({a.empId})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="pt-4 flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-brand-red text-white text-[15px] font-black shadow-lg hover:bg-brand-navy transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <UserPlus size={18} />
            {loading
              ? 'Adding...'
              : form.role === 'ADMIN'
              ? 'Add Admin'
              : form.role === 'TEAM_LEAD'
              ? 'Add Team Lead'
              : 'Add Employee'}
          </button>
          <Link
            to="/"
            className="px-6 py-3 rounded-full bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default AddEmployeeView;
