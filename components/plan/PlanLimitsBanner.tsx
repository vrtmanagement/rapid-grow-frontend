import React, { useEffect, useState } from 'react';
import { fetchPlanUsage } from '../../services/p4Api';
import { useI18n } from '../../context/I18nContext';

function UsageBar({ label, value, detail }: { label: string; value: number; detail: string }) {
  return React.createElement(
    'section',
    { className: 'text-xs' },
    React.createElement(
      'p',
      { className: 'flex justify-between mb-1' },
      React.createElement('span', null, label),
      React.createElement('span', null, detail)
    ),
    React.createElement(
      'p',
      { className: 'h-2 rounded-full bg-amber-200/80 dark:bg-amber-900/50 overflow-hidden' },
      React.createElement('span', {
        className: `block h-full rounded-full ${value >= 90 ? 'bg-red-500' : 'bg-amber-500'}`,
        style: { width: `${value}%` },
      })
    )
  );
}

const PlanLimitsBanner: React.FC = () => {
  const { t } = useI18n();
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    fetchPlanUsage()
      .then(setUsage)
      .catch(() => undefined);
  }, []);

  if (!usage?.limits) return null;

  const blocked = usage.blockedActions || [];
  const userPct = Math.min(
    100,
    Math.round((usage.usage.activeUsers / usage.limits.maxUsers) * 100)
  );
  const aiPct = Math.min(
    100,
    Math.round((usage.usage.aiCallsThisMonth / usage.limits.maxAiCallsPerMonth) * 100)
  );

  return React.createElement(
    'section',
    {
      className:
        'rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
    },
    React.createElement(
      'header',
      { className: 'flex flex-wrap items-center justify-between gap-2' },
      React.createElement(
        'span',
        { className: 'font-semibold' },
        `${t('planUsage')}: ${usage.plan} (${usage.status})`
      ),
      blocked.length > 0
        ? React.createElement(
            'span',
            { className: 'text-xs font-medium text-red-700 dark:text-red-300' },
            `Limits reached — ${blocked.join(', ')}. ${t('upgradePlan')}.`
          )
        : null
    ),
    React.createElement(
      'section',
      { className: 'mt-2 grid gap-2 sm:grid-cols-2' },
      React.createElement(UsageBar, {
        label: 'Users',
        value: userPct,
        detail: `${usage.usage.activeUsers}/${usage.limits.maxUsers}`,
      }),
      React.createElement(UsageBar, {
        label: 'AI calls',
        value: aiPct,
        detail: `${usage.usage.aiCallsThisMonth}/${usage.limits.maxAiCallsPerMonth}`,
      })
    )
  );
};

export default PlanLimitsBanner;
