import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Shield,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import {
  LANDING_FEATURES,
  LANDING_HERO_IMAGE,
  LANDING_TAGLINE,
  PUBLIC_PLANS,
  type PublicPlanId,
} from '../config/landingPageConstants';

import { navigateApp } from '../utils/appNavigation';

const LandingPageView: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const startRegistration = (plan: PublicPlanId = 'free') => {
    navigateApp(`/signup?plan=${plan}`);
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-red/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-brand-navy/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-brand-cyan/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient shadow-lg shadow-brand-red/20">
              <span className="text-lg font-bold">RG</span>
            </div>
            <div className="text-left">
              <p className="text-lg font-bold tracking-tight">Rapid Grow</p>
              <p className="text-xs text-white/60">Performance Hub</p>
            </div>
          </button>

          <nav className="hidden items-center gap-8 md:flex">
            <button type="button" onClick={() => scrollTo('features')} className="text-sm text-white/70 transition hover:text-white">
              Features
            </button>
            <button type="button" onClick={() => scrollTo('pricing')} className="text-sm text-white/70 transition hover:text-white">
              Pricing
            </button>
            <button
              type="button"
              onClick={() => navigateApp('/login')}
              className="text-sm font-medium text-white/80 transition hover:text-white"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => startRegistration('free')}
              className="rounded-full bg-brand-red px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-red/30 transition hover:bg-brand-navy"
            >
              Get started free
            </button>
          </nav>

          <button
            type="button"
            className="rounded-xl border border-white/10 p-2 md:hidden"
            onClick={() => setMobileMenuOpen((value) => !value)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => scrollTo('features')} className="rounded-xl px-3 py-2 text-left text-sm text-white/80">
                Features
              </button>
              <button type="button" onClick={() => scrollTo('pricing')} className="rounded-xl px-3 py-2 text-left text-sm text-white/80">
                Pricing
              </button>
              <button type="button" onClick={() => navigateApp('/login')} className="rounded-xl px-3 py-2 text-left text-sm text-white/80">
                Sign in
              </button>
              <button
                type="button"
                onClick={() => startRegistration('free')}
                className="rounded-xl bg-brand-red px-3 py-3 text-sm font-semibold"
              >
                Get started free
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
              <Sparkles size={16} className="text-brand-cyan" />
              Enterprise Mission Control & Execution Hub
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Run your entire
              <span className="block bg-brand-gradient bg-clip-text text-transparent">organization from one place</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">{LANDING_TAGLINE}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => startRegistration('free')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-red px-6 py-4 text-base font-bold shadow-xl shadow-brand-red/25 transition hover:bg-brand-navy"
              >
                Create your workspace
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => scrollTo('features')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-base font-semibold text-white/90 transition hover:bg-white/10"
              >
                Explore features
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 text-center sm:max-w-lg sm:text-left">
              <div>
                <p className="text-2xl font-bold">12+</p>
                <p className="text-xs text-white/60">Integrated modules</p>
              </div>
              <div>
                <p className="text-2xl font-bold">AI</p>
                <p className="text-xs text-white/60">Powered workflows</p>
              </div>
              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-xs text-white/60">Isolated workspaces</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient opacity-20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl">
              <img src={LANDING_HERO_IMAGE} alt="Team collaborating on performance dashboards" className="h-[22rem] w-full object-cover sm:h-[28rem]" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/20 text-brand-red">
                      <LayoutDashboard size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Command Matrix</p>
                      <p className="text-xs text-white/60">Live execution overview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-white/10 bg-slate-950/50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-cyan">Everything included</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">One platform for your entire performance stack</h2>
              <p className="mt-4 text-lg text-white/65">
                Dashboard, TaskHub, attendance, goals, CRM, communication, AI agent, and more — all in a single professional workspace.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {LANDING_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                      <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-red text-white shadow-lg">
                        <Icon size={20} />
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/65">{feature.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <Shield className="text-brand-cyan" size={28} />
                <h3 className="mt-5 text-xl font-bold">Private workspace per organization</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Every registration creates a separate Org 1, Org 2, Org 3 workspace. Your team data stays isolated and never mixes with other companies.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <Zap className="text-brand-orange" size={28} />
                <h3 className="mt-5 text-xl font-bold">Start in minutes</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Pick a plan, register your company, and land directly in your own workspace with full access to every module.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <Sparkles className="text-brand-red" size={28} />
                <h3 className="mt-5 text-xl font-bold">Built for modern teams</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Professional UI, real-time communication, AI-assisted task planning, and enterprise-grade attendance and goal tracking.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-white/10 bg-slate-950/50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-cyan">Simple pricing</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Choose Free, Gold, or Platinum</h2>
              <p className="mt-4 text-lg text-white/65">
                Select the plan that fits your team. Upgrade anytime as you grow.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {PUBLIC_PLANS.map((plan) => (
                <article
                  key={plan.id}
                  className={`relative flex flex-col rounded-3xl border p-8 ${
                    plan.highlight
                      ? 'border-brand-red/50 bg-brand-red/10 shadow-2xl shadow-brand-red/10'
                      : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-red px-4 py-1 text-xs font-bold uppercase tracking-wide">
                      Most popular
                    </span>
                  )}
                  <p className="text-sm font-semibold uppercase tracking-wide text-white/60">{plan.name}</p>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="pb-2 text-sm text-white/60">{plan.period}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/65">{plan.description}</p>
                  <ul className="mt-8 flex-1 space-y-3">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                        <span className="mt-1 h-2 w-2 rounded-full bg-brand-red" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => startRegistration(plan.id)}
                    className={`mt-8 w-full rounded-2xl px-4 py-4 text-sm font-bold transition ${
                      plan.highlight
                        ? 'bg-brand-red text-white hover:bg-brand-navy'
                        : 'border border-white/15 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    Register with {plan.name}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-20">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-brand-gradient px-6 py-14 text-center shadow-2xl sm:px-10">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to launch your workspace?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">
              Register your organization, invite your team, and start using Command Matrix, TaskHub, Attendance, and every other module today.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => startRegistration('free')}
                className="rounded-2xl bg-white px-6 py-4 text-base font-bold text-brand-navy transition hover:bg-slate-100"
              >
                Create free workspace
              </button>
              <button
                type="button"
                onClick={() => navigateApp('/login')}
                className="rounded-2xl border border-white/30 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                I already have an account
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-white/50">© {new Date().getFullYear()} Rapid Grow. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-white/60">
            <button type="button" onClick={() => scrollTo('features')} className="hover:text-white">
              Features
            </button>
            <button type="button" onClick={() => scrollTo('pricing')} className="hover:text-white">
              Pricing
            </button>
            <button type="button" onClick={() => navigateApp('/login')} className="hover:text-white">
              Sign in
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPageView;
