import type { AttendancePortalMode } from './attendanceViewTypes';
import { useAttendanceViewState } from './useAttendanceViewState';
import { useAttendanceViewLoaders } from './useAttendanceViewLoaders';
import { useAttendanceViewActions } from './useAttendanceViewActions';
import { useAttendanceViewDerived } from './useAttendanceViewDerived';

export function useAttendanceViewController(mode: AttendancePortalMode = 'manager') {
  const state = useAttendanceViewState(mode);
  const loaders = useAttendanceViewLoaders(state);
  const actions = useAttendanceViewActions(state, loaders);
  const derived = useAttendanceViewDerived(state, loaders, actions);

  return {
    ...state,
    ...loaders,
    ...actions,
    ...derived,
  };
}

export type AttendanceViewController = ReturnType<typeof useAttendanceViewController>;
