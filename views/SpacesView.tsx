import React, { useEffect } from 'react';
import SpacesErrorBanner from '../components/spaces/SpacesErrorBanner';
import SpacesHeader from '../components/spaces/SpacesHeader';
import SpacesAiAssignPanel from '../components/spaces/SpacesAiAssignPanel';
import SpacesMainSections from '../components/spaces/SpacesMainSections';
import { useSpacesViewController } from '../hooks/spaces/useSpacesViewController';
import type { SpacesViewProps } from '../types/spaces';
import { prefetchSpacesTaskDetailView } from '../utils/spaces/taskNavigation';

const SpacesView: React.FC<SpacesViewProps> = ({ mode, state, updateState }) => {
  const controller = useSpacesViewController({ mode, state, updateState });

  useEffect(() => {
    prefetchSpacesTaskDetailView();
  }, []);

  return (
    <div
      ref={controller.taskHubRootRef}
      className="spaces-page -mx-4 -mb-4 min-h-full space-y-6 bg-slate-50/60 px-4 pb-8 pt-0 sm:-mx-8 sm:-mb-8 sm:px-6 lg:-mx-16 lg:-mb-16 lg:px-8"
    >
      <SpacesHeader
        mode={controller.mode}
        onCreateTask={controller.openTaskCreateModal}
        onNavigateAiAgent={() => controller.navigate('/spaces/ai-agent')}
        aiAssign={
          <SpacesAiAssignPanel
            mode={controller.mode}
            aiAssigning={controller.aiAssigning}
            aiAssignFileName={controller.aiAssignFileName}
            aiAssignCreatedCount={controller.aiAssignCreatedCount}
            aiAssignTotalCount={controller.aiAssignTotalCount}
            handleAiAssignPdfUpload={controller.handleAiAssignPdfUpload}
          />
        }
      />
      {controller.error ? <SpacesErrorBanner message={controller.error} /> : null}
      <SpacesMainSections {...controller} />
    </div>
  );
};

export default SpacesView;
