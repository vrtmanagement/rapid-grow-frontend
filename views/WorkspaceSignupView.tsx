import React, { useState } from 'react';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { API_BASE, AUTH_STORAGE_KEY } from '../config/api';
import { getReadableError, parseApiResponse } from '../services/apiClient';
import ErrorAlert from '../components/ui/ErrorAlert';

interface WorkspaceSignupViewProps {
  onSignupSuccess: (token: string, employee: any) => void;
}

const WorkspaceSignupView: React.FC<WorkspaceSignupViewProps> = ({ onSignupSuccess }) => {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/workspaces/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          industry: industry.trim(),
          size: size.trim(),
          ownerName: ownerName.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await parseApiResponse<any>(response);
      if (!data.success || !data.token || !data.employee) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          token: data.token,
          employee: data.employee,
          company: data.company,
        }),
      );
      onSignupSuccess(data.token, data.employee);
    } catch (err) {
      setError(getReadableError(err, 'Workspace signup failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.9fr_1.1fr]">
          <section className="bg-brand-charcoal p-8 text-white sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-red">
              <Building2 size={24} />
            </div>
            <h1 className="mt-8 text-3xl font-bold tracking-tight">Create your workspace</h1>
            <p className="mt-4 text-sm leading-6 text-white/70">
              Set up the company account, create the owner admin, and start from a clean workspace.
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/login';
              }}
              className="mt-8 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to sign in
            </button>
          </section>

          <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-10">
            <ErrorAlert message={error} />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Company name</span>
                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder="Rapid Grow"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Industry</span>
                <input
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder="IT services"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Company size</span>
                <input
                  value={size}
                  onChange={(event) => setSize(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder="10-50"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Owner name</span>
                <input
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder="Kabir Khan"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Owner email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder="owner@company.com"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-[15px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder="Strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Use 8+ characters with uppercase, lowercase, number, and special character.
              </p>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-red px-4 py-4 text-[15px] font-bold text-white transition-colors hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating workspace...' : 'Create workspace'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSignupView;
