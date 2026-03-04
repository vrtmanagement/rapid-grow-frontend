import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, UserPlus, Check } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { PlanningState } from '../types';

const BACKEND_ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TEAM_LEAD', label: 'Team Lead' },
  { value: 'EMPLOYEE', label: 'Employee' },
] as const;

function getAllowedRoles(currentUser: PlanningState['currentUser']): { value: string; label: string }[] {
  const isSuperAdmin = currentUser.role === 'Admin' && currentUser.powers?.includes('PROJECT_DELETE');
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
  });

  React.useEffect(() => {
    const valid = allowedRoles.some((r) => r.value === form.role);
    if (!valid && allowedRoles.length > 0) {
      setForm((prev) => ({ ...prev, role: allowedRoles[0].value }));
    }
  }, [allowedRoles, form.role]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Failed to add employee');
      }

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
      });
    } catch (err: any) {
      setError(err.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="bg-white p-12 rounded-3xl shadow-2xl border border-slate-200 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-green-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-900">Employee Added Successfully</h3>
          <p className="text-slate-600 mt-2">The employee can now log in to the user portal with their credentials.</p>
          <div className="mt-10 flex gap-4 justify-center">
            <Link
              to="/employees/add"
              onClick={() => setSuccess(false)}
              className="px-6 py-3 bg-brand-red text-white rounded-full font-bold hover:bg-brand-navy transition-colors"
            >
              Add Another Employee
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
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              placeholder="Min 6 characters"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              placeholder="Re-enter password"
            />
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

        <div className="pt-4 flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-brand-red text-white text-[15px] font-black shadow-lg hover:bg-brand-navy transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <UserPlus size={18} />
            {loading ? 'Adding...' : 'Add Employee'}
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
