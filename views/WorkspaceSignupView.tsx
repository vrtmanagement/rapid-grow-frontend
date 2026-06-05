import React, { useMemo, useState } from 'react';
import { ArrowLeft, Building2, Check, Eye, EyeOff } from 'lucide-react';
import { API_BASE, AUTH_STORAGE_KEY } from '../config/api';
import { PUBLIC_PLANS, type PublicPlanId } from '../config/landingPageConstants';
import { getReadableError, parseApiResponse } from '../services/apiClient';
import ErrorAlert from '../components/ui/ErrorAlert';

interface WorkspaceSignupViewProps {
  onSignupSuccess: (token: string, employee: any) => void;
}

function getSignupPlanFromHash(): PublicPlanId {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const queryIndex = hash.indexOf('?');
  if (queryIndex === -1) return 'free';
  const params = new URLSearchParams(hash.slice(queryIndex + 1));
  const plan = params.get('plan');
  if (plan === 'gold' || plan === 'platinum' || plan === 'free') return plan;
  return 'free';
}

const WorkspaceSignupView: React.FC<WorkspaceSignupViewProps> = ({ onSignupSuccess }) => {
  const initialPlan = useMemo(() => getSignupPlanFromHash(), []);
  const [selectedPlan, setSelectedPlan] = useState<PublicPlanId>(initialPlan);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlanDetails = PUBLIC_PLANS.find((plan) => plan.id === selectedPlan) || PUBLIC_PLANS[0];

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
          plan: selectedPlan,
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
    <div className="fixed inset-0 overflow-y-auto bg-[#f1f5f9] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center py-6">
        <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.85fr_1.15fr]">
          <section className="bg-slate-900 p-8 text-white sm:p-10">
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/';
              }}
              className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to home
            </button>

            <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-red">
              <Building2 size={24} />
            </div>
            <h1 className="mt-8 text-3xl font-bold tracking-tight">Create your workspace</h1>
            <p className="mt-4 text-sm leading-6 text-white/70">
              Register your organization and get a private workspace. Your data stays separate from every other company on the platform.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Selected plan</p>
              <p className="mt-2 text-2xl font-bold">{selectedPlanDetails.name}</p>
              <p className="mt-1 text-sm text-white/70">
                {selectedPlanDetails.price}
                {selectedPlanDetails.period ? ` ${selectedPlanDetails.period}` : ''}
              </p>
              <ul className="mt-4 space-y-2">
                {selectedPlanDetails.features.slice(0, 3).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/75">
                    <Check size={14} className="text-brand-cyan" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/login';
              }}
              className="mt-8 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Already registered? Sign in
            </button>
          </section>

          <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-10">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Organization details</h2>
              <p className="mt-1 text-sm text-slate-500">Choose your plan and set up the owner account.</p>
            </div>

            <ErrorAlert message={error} />

            <div className="grid gap-3 sm:grid-cols-3">
              {PUBLIC_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    selectedPlan === plan.id
                      ? 'border-brand-red bg-brand-red/5 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900">{plan.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {plan.price}
                    {plan.period ? ` ${plan.period}` : ''}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Company name</span>
                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder="Acme Corporation"
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
              {loading ? 'Creating workspace...' : `Create ${selectedPlanDetails.name} workspace`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSignupView;
