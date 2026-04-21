import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

const EmployeeProjectDetailView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return <Navigate to="/workspaces" replace />;
  }

  return <Navigate to={`/workspaces/${projectId}`} replace />;
};

export default EmployeeProjectDetailView;
