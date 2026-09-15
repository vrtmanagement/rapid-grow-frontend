import React from 'react';
import { ThemedSelect } from './SpacesFormControls';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';

type SpacesTaskToolbarProps = Pick<
  SpacesViewController,
  'setTaskFilterMode' | 'taskFilterMode' | 'taskStatusFilter' | 'taskStatusFilterOptions' | 'setTaskStatusFilter' | 'taskSearch' | 'setTaskSearch'
> & { viewSwitcher?: React.ReactNode };

const SpacesTaskToolbar: React.FC<SpacesTaskToolbarProps> = ({
  setTaskFilterMode,
  taskFilterMode,
  taskStatusFilter,
  taskStatusFilterOptions,
  setTaskStatusFilter,
  taskSearch,
  setTaskSearch,
  viewSwitcher,
}) => (
  <div className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white p-5">
    <div className="min-w-0 pl-0.5">
      <h4 className="text-lg font-semibold tracking-tight text-slate-900">Unified Task Table</h4>
      <p className="mt-1 text-[13px] leading-5 text-slate-600">
        Search, filter, and manage all tasks from the same system, including planned weekly work.
      </p>
    </div>
    <div className="flex min-w-0 items-center gap-3">
      <div className="inline-flex h-10 shrink-0 items-center rounded-lg border border-slate-300 bg-slate-100 p-1">
        {(['all', 'me', 'assigned'] as const).map((filterMode) => (
          <button
            key={filterMode}
            type="button"
            onClick={() => setTaskFilterMode(filterMode)}
            className={`rounded-md px-4 py-2 text-[13px] font-semibold leading-none transition ${
              taskFilterMode === filterMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700 hover:bg-white hover:text-slate-900'
            }`}
          >
            {filterMode === 'all' ? 'All' : filterMode === 'me' ? 'Me' : 'Assigned'}
          </button>
        ))}
      </div>
      <div className="shrink-0">
        <ThemedSelect
          value={taskStatusFilter}
          onChange={setTaskStatusFilter}
          options={taskStatusFilterOptions}
          toolbarInline
          denseMenu
        />
      </div>
      {taskFilterMode === 'me' ? <div className="shrink-0">{viewSwitcher}</div> : null}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <input
          value={taskSearch}
          onChange={(event) => setTaskSearch(event.target.value)}
          placeholder="Search tasks, people, or IDs..."
          className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/80"
        />
        {taskSearch.trim() ? (
          <button
            type="button"
            onClick={() => setTaskSearch('')}
            className="shrink-0 text-[11px] font-medium text-slate-600 hover:text-slate-900"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  </div>
);

export default SpacesTaskToolbar;
