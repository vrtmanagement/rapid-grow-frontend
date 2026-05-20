import React from 'react';
import { PlanningState } from '../types';
import EmployeeProfileView from './EmployeeProfileView';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const ProfileView: React.FC<Props> = ({ state, updateState }) => {
  return <EmployeeProfileView state={state} updateState={updateState} />;
};

export default ProfileView;
