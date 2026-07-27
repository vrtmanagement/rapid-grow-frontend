import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { WorkspaceProject } from '../../types';
import ProjectDetails, { ProjectTaskDraft } from '../project-charter/ProjectDetails';
import { TaskAnalyticsPanel } from '../../views/TaskAnalyticsView';

export function ProjectDetailRoute(props: {
  projects: WorkspaceProject[];
  projectLoading: boolean;
  canManageProject: boolean;
  canDeleteProject: boolean;
  canCreateTask: boolean;
  onEditProject: (project: WorkspaceProject) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onFetchProject: (projectId: string) => Promise<void>;
  onCreateTask: (projectId: string, draft: ProjectTaskDraft) => Promise<void>;
}) {
  const { projectId } = useParams<{ projectId: string }>();
  const [detailLoading, setDetailLoading] = useState(false);

  const activeProject = useMemo(
    () => props.projects.find((project) => project.id === projectId),
    [props.projects, projectId],
  );

  useEffect(() => {
    if (!projectId || activeProject || props.projectLoading) return;

    let mounted = true;
    setDetailLoading(true);
    props
      .onFetchProject(projectId)
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setDetailLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeProject, projectId, props.onFetchProject, props.projectLoading]);

  return (
    <div className="space-y-8">
      <ProjectDetails
        project={activeProject}
        loading={props.projectLoading || detailLoading}
        canManageProject={props.canManageProject}
        canDeleteProject={props.canDeleteProject}
        canCreateTask={props.canCreateTask}
        onEditProject={() => activeProject && props.onEditProject(activeProject)}
        onDeleteProject={() => (activeProject ? props.onDeleteProject(activeProject.id) : Promise.resolve())}
        onCreateTask={(draft) => (activeProject ? props.onCreateTask(activeProject.id, draft) : Promise.resolve())}
      />
      {activeProject ? (
        <TaskAnalyticsPanel projectId={activeProject.id} label={activeProject.name} embedded />
      ) : null}
    </div>
  );
}
