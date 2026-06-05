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
    leadingClassName="pl-3 sm:pl-4"
    trailingClassName="pr-3 sm:pr-4 lg:pr-5"
    leading={
      <>
        <div className="h-1.5 w-8 rounded-full bg-brand-red" />
        <span className="truncate text-sm font-medium text-slate-600 sm:text-[15px]">Task Hub</span>
      </>
    }
    center={
      mode === 'manager' ? (
        <>
          <button
            type="button"
            className="border-b-2 border-brand-red px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-900 sm:text-[12px]"
          >
            Overview
          </button>
          <button
            type="button"
            onClick={onNavigateAiAgent}
            className="border-b-2 border-transparent px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 transition-colors hover:text-slate-900 sm:text-[12px]"
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
