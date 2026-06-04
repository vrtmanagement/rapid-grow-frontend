import React from 'react';
import { ThemedSelect } from './SpacesFormControls';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';

type SpacesTaskToolbarProps = Pick<
  SpacesViewController,
  'setTaskFilterMode' | 'taskFilterMode' | 'taskStatusFilter' | 'taskStatusFilterOptions' | 'setTaskStatusFilter' | 'taskSearch' | 'setTaskSearch'
>;

const SpacesTaskToolbar: React.FC<SpacesTaskToolbarProps> = ({
  setTaskFilterMode,
  taskFilterMode,
  taskStatusFilter,
  taskStatusFilterOptions,
  setTaskStatusFilter,
  taskSearch,
  setTaskSearch,
}) => (
  <div className="flex flex-col gap-3 pl-1 pr-4 sm:pl-2 sm:pr-5 lg:flex-row lg:items-center lg:justify-between lg:gap-5 lg:pl-3 lg:pr-6">
    <div className="min-w-0 pl-0.5">
      <h4 className="text-lg font-semibold text-slate-900">Unified Task Table</h4>
      <p className="mt-0.5 text-[12px] text-slate-500">
        Search, filter, and manage all tasks from the same system, including planned weekly work.
      </p>
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-2.5 lg:shrink-0 lg:justify-end">
      <div className="inline-flex h-[34px] shrink-0 items-center rounded-full border border-slate-200 bg-white p-1">
        {(['all', 'me', 'assigned'] as const).map((filterMode) => (
          <button
            key={filterMode}
            type="button"
            onClick={() => setTaskFilterMode(filterMode)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-none ${
              taskFilterMode === filterMode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {filterMode === 'all' ? 'All' : filterMode === 'me' ? 'Me' : 'Assigned'}
          </button>
        ))}
      </div>
      <ThemedSelect
        value={taskStatusFilter}
        onChange={setTaskStatusFilter}
        options={taskStatusFilterOptions}
        toolbarInline
        denseMenu
      />
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
        <input
          value={taskSearch}
          onChange={(event) => setTaskSearch(event.target.value)}
          placeholder="Search tasks, people, or IDs..."
          className="min-h-[34px] min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 sm:w-[240px] lg:w-[300px] lg:flex-none"
        />
        {taskSearch.trim() ? (
          <button
            type="button"
            onClick={() => setTaskSearch('')}
            className="shrink-0 text-[11px] text-slate-500 hover:text-brand-red"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  </div>
);

export default SpacesTaskToolbar;
