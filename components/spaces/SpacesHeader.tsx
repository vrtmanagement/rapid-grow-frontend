import React from 'react';
import PageSectionSubnav from '../layout/PageSectionSubnav';
import type { SpacesMode } from '../../types/spaces';
import SpacesCreateTaskButton from './SpacesCreateTaskButton';

type SpacesHeaderProps = {
  mode: SpacesMode;
  onCreateTask: () => void;
  onNavigateAiAgent: () => void;
  aiAssign?: React.ReactNode;
};

const SpacesHeader: React.FC<SpacesHeaderProps> = ({ mode, onCreateTask, onNavigateAiAgent, aiAssign }) => (
  <PageSectionSubnav
    outerClassName="!mx-0 !mb-0 !border-b-slate-200/80 !bg-white !px-0 !shadow-none"
    innerClassName="!gap-3 !py-5"
    leadingClassName="pl-1"
    trailingClassName="pr-1"
    centerClassName="!gap-2 !overflow-visible flex-wrap"
    leading={
      <>
        <div className="h-7 w-1 rounded-full bg-brand-red" />
        <span className="truncate text-2xl font-semibold tracking-tight text-slate-900">Task Hub</span>
      </>
    }
    center={
      mode === 'manager' ? (
        <>
          <button
            type="button"
            className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-brand-red"
          >
            Overview
          </button>
          <button
            type="button"
            onClick={onNavigateAiAgent}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            AI Agent
          </button>
          {aiAssign}
        </>
      ) : undefined
    }
    trailing={<SpacesCreateTaskButton onClick={onCreateTask} />}
  />
);

export default SpacesHeader;
