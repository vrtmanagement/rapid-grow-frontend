import React from 'react';
import PageSectionSubnav from '../layout/PageSectionSubnav';
import type { SpacesMode } from '../../types/spaces';
import SpacesCreateTaskButton from './SpacesCreateTaskButton';

type SpacesHeaderProps = {
  mode: SpacesMode;
  onCreateTask: () => void;
  onNavigateAiAgent: () => void;
};

const SpacesHeader: React.FC<SpacesHeaderProps> = ({ mode, onCreateTask, onNavigateAiAgent }) => (
  <PageSectionSubnav
    outerClassName="px-6 sm:px-10 lg:px-14"
    innerClassName="gap-2 py-1.5 lg:min-h-[50px] lg:gap-3.5"
    leading={
      <>
        <div className="h-1.5 w-8 rounded-full bg-brand-red" />
        <span className="text-[14px] font-medium text-slate-900">Task Hub</span>
      </>
    }
    center={
      mode === 'manager' ? (
        <>
          <button
            type="button"
            className="border-b-2 border-brand-red px-1 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-900"
          >
            Overview
          </button>
          <button
            type="button"
            onClick={onNavigateAiAgent}
            className="border-b-2 border-transparent px-1 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 transition-colors hover:text-slate-900"
          >
            AI Agent
          </button>
        </>
      ) : undefined
    }
    trailing={<SpacesCreateTaskButton onClick={onCreateTask} />}
  />
);

export default SpacesHeader;
