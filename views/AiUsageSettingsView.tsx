import React, { useState } from 'react';
import AiSettingsView from './AiSettingsView';
import AiUsageDashboardView from './AiUsageDashboardView';

import PageSectionSubnav from '../components/layout/PageSectionSubnav';

type AiUsagePanel = 'usage' | 'settings';

type AiUsageSettingsViewProps = {
  embedded?: boolean;
  activePanel?: AiUsagePanel;
  hideSubnav?: boolean;
};

const AiUsageSettingsView: React.FC<AiUsageSettingsViewProps> = ({
  embedded = false,
  activePanel: controlledPanel,
  hideSubnav = false,
}) => {
  const [internalPanel, setInternalPanel] = useState<AiUsagePanel>('usage');
  const activePanel = controlledPanel ?? internalPanel;

  const subnavTabClass = (panel: AiUsagePanel) =>
    `border-b-2 px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors sm:text-[12px] ${
      activePanel === panel
        ? 'border-brand-red text-slate-900'
        : 'border-transparent text-slate-500 hover:text-slate-900'
    }`;

  return (
    <div className={embedded ? 'space-y-6' : 'mx-auto max-w-6xl space-y-8 animate-in fade-in duration-700'}>
      {!embedded && !hideSubnav ? (
        <PageSectionSubnav
          flushWithinContentPadding
          leading={
            <>
              <span className="h-1.5 w-8 shrink-0 rounded-full bg-brand-red" />
              <span className="truncate text-sm font-medium text-slate-600 sm:text-[15px]">AI usage &amp; settings</span>
            </>
          }
          center={
            <>
              <button type="button" onClick={() => setInternalPanel('usage')} className={subnavTabClass('usage')}>
                Usage
              </button>
              <button type="button" onClick={() => setInternalPanel('settings')} className={subnavTabClass('settings')}>
                Settings
              </button>
            </>
          }
        />
      ) : null}

      {activePanel === 'usage' ? <AiUsageDashboardView embedded /> : <AiSettingsView embedded />}
    </div>
  );
};

export default AiUsageSettingsView;
