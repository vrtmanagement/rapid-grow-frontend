import React from 'react';
import SpacesErrorBanner from '../components/spaces/SpacesErrorBanner';
import SpacesHeader from '../components/spaces/SpacesHeader';
import SpacesMainSections from '../components/spaces/SpacesMainSections';
import { useSpacesViewController } from '../hooks/spaces/useSpacesViewController';
import type { SpacesViewProps } from '../types/spaces';

const SpacesView: React.FC<SpacesViewProps> = ({ mode, state, updateState }) => {
  const controller = useSpacesViewController({ mode, state, updateState });

  return (
    <div
      ref={controller.taskHubRootRef}
      className="-mx-16 -mb-16 mt-0 min-h-full overflow-x-hidden space-y-6 px-6 pb-8 pt-0 animate-in fade-in duration-700"
    >
      <SpacesHeader
        mode={controller.mode}
        onCreateTask={controller.openTaskCreateModal}
        onNavigateAiAgent={() => controller.navigate('/spaces/ai-agent')}
      />
      {controller.error ? <SpacesErrorBanner message={controller.error} /> : null}
      <SpacesMainSections {...controller} />
    </div>
  );
};

export default SpacesView;
