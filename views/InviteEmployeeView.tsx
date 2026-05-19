import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorAlert from '../components/ui/ErrorAlert';
import { sendEmployeeInvite } from '../services/platformApi';

const InviteEmployeeView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [empId, setEmpId] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('IT DEPARTMENT');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setInviteUrl('');
    setLoading(true);
    try {
      const res = await sendEmployeeInvite({
        email: email.trim(),
        role,
        empId: empId.trim() || undefined,
        designation: designation.trim() || undefined,
        department: department.trim() || undefined,
      });
      setMessage(res.message || 'Invite sent.');
      if (res.invite?.inviteUrl) setInviteUrl(res.invite.inviteUrl);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Invite employee</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Sends an email with a link to accept the invite and set a password. Email must not already exist in Staff.
        </p>
      </header>

      <ErrorAlert message={error} />
      {message && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">{message}</p>
      )}
      {inviteUrl && (
        <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-3 break-all">
          Dev / fallback link: <a href={inviteUrl} className="underline">{inviteUrl}</a>
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:bg-slate-900 dark:border-slate-700">
        <label className="block text-sm">
          <span className="font-semibold">Email</span>
          <input
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:bg-slate-800"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Role</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:bg-slate-800"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="TEAM_LEAD">Team Lead</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Employee ID (optional)</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:bg-slate-800"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Designation</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:bg-slate-800"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Department</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:bg-slate-800"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-red py-3 text-white font-semibold disabled:opacity-60"
        >
          {loading ? 'Sending…' : 'Send invite email'}
        </button>
      </form>

      <p className="text-sm text-slate-500">
        Or <Link to="/employees/add" className="text-brand-red font-medium">add employee with password</Link> directly.
      </p>
    </section>
  );
};

export default InviteEmployeeView;
