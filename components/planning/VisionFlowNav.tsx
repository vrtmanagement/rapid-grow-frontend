import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Target, BarChart3, Calendar, CheckSquare, Sun, Database, ChevronRight } from 'lucide-react';
import { usePermissions } from '../../context/usePermissions';

const STEPS = [
  { power: 'YEARLY_VIEW' as const, to: '/yearly', short: 'Year', Icon: Target },
  { power: 'QUARTERLY_VIEW' as const, to: '/quarterly', short: 'Quarter', Icon: BarChart3 },
  { power: 'MONTHLY_VIEW' as const, to: '/monthly', short: 'Month', Icon: Calendar },
  { power: 'WEEKLY_VIEW' as const, to: '/weekly', short: 'Week', Icon: CheckSquare },
  { power: 'DAILY_VIEW' as const, to: '/daily', short: 'Day', Icon: Sun },
];

interface VisionFlowNavProps {
  /** One line under the stepper (from `uiConfig.*Sub`). */
  subtitle?: string;
}

const VisionFlowNav: React.FC<VisionFlowNavProps> = ({ subtitle }) => {
  const { pathname } = useLocation();
  const { hasPermission } = usePermissions();

  const visible = STEPS.filter((s) => hasPermission(s.power));

  return (
    <div className="mb-8 space-y-4">
      <div className="rounded-[1.25rem] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-slate-100/40 p-2 shadow-[0_8px_30px_rgb(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4 px-2 py-1">
          <div className="flex flex-1 flex-wrap items-center gap-1 sm:gap-1.5">
            {visible.map((step, index) => {
              const active = pathname === step.to || pathname.startsWith(`${step.to}/`);
              const Icon = step.Icon;
              return (
                <React.Fragment key={step.to}>
                  {index > 0 && (
                    <ChevronRight
                      size={14}
                      className="hidden shrink-0 text-slate-300 sm:block"
                      aria-hidden
                    />
                  )}
                  <Link
                    to={step.to}
                    className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all sm:px-3.5 ${
                      active
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-brand-red' : 'text-slate-400'} strokeWidth={active ? 2.25 : 2} />
                    <span className="truncate">{step.short}</span>
                  </Link>
                </React.Fragment>
              );
            })}
          </div>
          {hasPermission('SPACES_VIEW') && (
            <Link
              to="/spaces"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand-red/30 hover:text-slate-900"
            >
              <Database size={16} className="text-brand-red" />
              TaskHub
            </Link>
          )}
        </div>
      </div>
      {subtitle ? <p className="text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
    </div>
  );
};

export default VisionFlowNav;
