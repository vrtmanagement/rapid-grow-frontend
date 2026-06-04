import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ErrorAlert from '../components/ui/ErrorAlert';
import { fetchBillingStatus, openBillingPortal, startBillingCheckout } from '../services/platformApi';

const PLANS = [
  { id: 'starter' as const, label: 'Starter', users: 10, ai: 200 },
  { id: 'growth' as const, label: 'Growth', users: 50, ai: 500 },
  { id: 'business' as const, label: 'Business', users: 200, ai: 10000 },
];

type BillingSettingsViewProps = {
  embedded?: boolean;
};

const BillingSettingsView: React.FC<BillingSettingsViewProps> = ({ embedded = false }) => {
  const [params] = useSearchParams();
  const [billing, setBilling] = useState<any>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const statusBanner = params.get('status');

  const load = () => {
    fetchBillingStatus()
      .then((res) => setBilling(res.billing))
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  const onCheckout = async (plan: 'starter' | 'growth' | 'business') => {
    setLoading(true);
    setError('');
    try {
      const res = await startBillingCheckout(plan);
      if (res.url) window.location.href = res.url;
      else setError('Stripe checkout URL not returned. Check Stripe keys in auth-service.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onPortal = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await openBillingPortal();
      if (res.url) window.location.href = res.url;
      else setError('Billing portal URL not returned.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`space-y-6 ${embedded ? 'max-w-none' : 'max-w-3xl'}`}>
      {!embedded ? (
        <header>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Billing & plan</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage subscription via Stripe. Your current data is not changed when you upgrade.
          </p>
        </header>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Manage subscription via Stripe. Your current data is not changed when you upgrade.
        </p>
      )}

      {statusBanner === 'success' && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
          Payment received. Plan may take a moment to update after webhook processing.
        </p>
      )}
      {statusBanner === 'cancel' && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-3">Checkout was cancelled.</p>
      )}

      <ErrorAlert message={error} />
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      {billing && (
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 dark:border-slate-700">
          <p className="text-sm">
            Current plan: <strong className="capitalize">{billing.plan || 'trial'}</strong>
          </p>
          {billing.stripeSubscriptionStatus && (
            <p className="text-xs text-slate-500 mt-1">Stripe status: {billing.stripeSubscriptionStatus}</p>
          )}
          {!billing.stripeConfigured && (
            <p className="text-xs text-amber-700 mt-2">
              Stripe is not configured on the server. Add STRIPE_SECRET_KEY in auth-service .env.
            </p>
          )}
          {billing.stripeCustomerId && billing.stripeConfigured && (
            <button
              type="button"
              disabled={loading}
              onClick={onPortal}
              className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
            >
              Manage subscription
            </button>
          )}
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 dark:border-slate-700"
          >
            <h2 className="font-semibold text-lg">{plan.label}</h2>
            <p className="text-xs text-slate-500 mt-2">Up to {plan.users} users</p>
            <p className="text-xs text-slate-500">{plan.ai} AI calls / month</p>
            <button
              type="button"
              disabled={loading || !billing?.stripeConfigured}
              onClick={() => onCheckout(plan.id)}
              className="mt-4 w-full rounded-lg bg-brand-red py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Upgrade
            </button>
          </article>
        ))}
      </section>
    </section>
  );
};

export default BillingSettingsView;
