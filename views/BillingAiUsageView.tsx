import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageSectionSubnav from '../components/layout/PageSectionSubnav';
import AiUsageSettingsView from './AiUsageSettingsView';
import BillingSettingsView from './BillingSettingsView';

export type BillingAiPanel = 'billing' | 'ai-usage';
export type AiUsagePanel = 'usage' | 'settings';

const resolvePanel = (search: string): BillingAiPanel => {
  const raw = String(new URLSearchParams(search).get('panel') || '').trim().toLowerCase();
  if (raw === 'ai-usage' || raw === 'ai') return 'ai-usage';
  return 'billing';
};

const resolveAiPanel = (search: string): AiUsagePanel => {
  const raw = String(new URLSearchParams(search).get('aiPanel') || '').trim().toLowerCase();
  return raw === 'settings' ? 'settings' : 'usage';
};

const BillingAiUsageView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<BillingAiPanel>(() => resolvePanel(location.search));
  const [activeAiPanel, setActiveAiPanel] = useState<AiUsagePanel>(() => resolveAiPanel(location.search));

  useEffect(() => {
    setActivePanel(resolvePanel(location.search));
    setActiveAiPanel(resolveAiPanel(location.search));
  }, [location.search]);

  const subnavTabClass = (isActive: boolean) =>
    `border-b-2 px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors sm:text-[12px] ${
      isActive ? 'border-brand-red text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'
    }`;

  const updateSearch = useCallback(
    (panel: BillingAiPanel, aiPanel: AiUsagePanel) => {
      const params = new URLSearchParams(location.search || '');
      params.set('panel', panel);
      if (panel === 'ai-usage') {
        params.set('aiPanel', aiPanel);
      } else {
        params.delete('aiPanel');
      }
      navigate(
        {
          pathname: location.pathname,
          search: `?${params.toString()}`,
        },
        { replace: true },
      );
    },
    [location.pathname, location.search, navigate],
  );

  const handlePanelChange = useCallback(
    (panel: BillingAiPanel) => {
      setActivePanel(panel);
      updateSearch(panel, activeAiPanel);
    },
    [activeAiPanel, updateSearch],
  );

  const handleAiPanelChange = useCallback(
    (aiPanel: AiUsagePanel) => {
      setActiveAiPanel(aiPanel);
      updateSearch('ai-usage', aiPanel);
    },
    [updateSearch],
  );

  return (
    <div className="w-full animate-in fade-in duration-700">
      <PageSectionSubnav
        outerClassName="mb-0 px-0 sm:px-0 lg:px-0"
        innerClassName="px-6 sm:px-8 lg:px-10"
        leadingClassName="hidden"
        trailingClassName="hidden"
        centerClassName="w-full justify-center"
        center={
          <>
            <button type="button" onClick={() => handlePanelChange('billing')} className={subnavTabClass(activePanel === 'billing')}>
              Billing
            </button>
            <button
              type="button"
              onClick={() => handlePanelChange('ai-usage')}
              className={subnavTabClass(activePanel === 'ai-usage')}
            >
              AI usage
            </button>
          </>
        }
      />

      <div className="space-y-6 px-6 pb-8 pt-6 sm:px-8 lg:px-10">
        {activePanel === 'billing' ? (
          <BillingSettingsView embedded />
        ) : (
          <>
            <div
              className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
              role="tablist"
              aria-label="AI usage sections"
            >
              {(['usage', 'settings'] as const).map((panel) => (
                <button
                  key={panel}
                  type="button"
                  role="tab"
                  aria-selected={activeAiPanel === panel}
                  onClick={() => handleAiPanelChange(panel)}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                    activeAiPanel === panel
                      ? 'bg-brand-red text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {panel === 'usage' ? 'Usage' : 'Settings'}
                </button>
              ))}
            </div>
            <AiUsageSettingsView embedded activePanel={activeAiPanel} hideSubnav />
          </>
        )}
      </div>
    </div>
  );
};

export default BillingAiUsageView;
