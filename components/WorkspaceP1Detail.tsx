import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlanningState, WorkspaceProject, ProjectPhases, WorkspaceTask, TaskStatus } from '../types';
import { RotateCcw, Trash2 } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../config/api';
import WorkspaceP1CharterSections from './workspace/WorkspaceP1CharterSections';
import WorkspaceP1TeamSection from './workspace/WorkspaceP1TeamSection';
import WorkspaceP1TasksSection from './workspace/WorkspaceP1TasksSection';
import WorkspaceP1DeleteModal from './workspace/WorkspaceP1DeleteModal';
import WorkspaceP1MessagesModal from './workspace/WorkspaceP1MessagesModal';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

export interface Employee {
  _id: string;
  empId: string;
  empName: string;
  designation: string;
  department: string;
  email?: string;
  phone?: string;
  role?: string;
}

const WorkspaceP1Detail: React.FC<Props> = ({ state, updateState }) => {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [phaseCount, setPhaseCount] = useState(1);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const { projectId } = useParams();
  const [messageTask, setMessageTask] = useState<WorkspaceTask | null>(null);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);
        }
      } catch (e) {
        console.error('Failed to load employees', e);
      }
    };
    loadEmployees();
  }, []);

  const employeeRoleMap = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach((e) => {
      const role = String((e as any).role || '').toUpperCase();
      if (e.empId) map[String(e.empId)] = role;
      if (e._id) map[String(e._id)] = role;
    });
    return map;
  }, [employees]);

  const isPrivilegedCreator = (createdBy: unknown, createdByRole: unknown) => {
    const direct = createdByRole ? String(createdByRole).toUpperCase() : '';
    if (direct === 'SUPER_ADMIN' || direct === 'ADMIN' || direct === 'TEAM_LEAD' || direct === 'LEADER') {
      return true;
    }
    const key = createdBy ? String(createdBy) : '';
    const role = employeeRoleMap[key] || '';
    return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'TEAM_LEAD';
  };

  // If project is opened directly by URL, fetch its data from backend
  useEffect(() => {
    if (!projectId) return;

    const exists = state.workspaces.flatMap(w => w.projects).some(p => p.id === projectId);
    if (exists) return;

    const loadProject = async () => {
      try {
        const res = await fetch(`${API_BASE}/project-charters/${projectId}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const item = await res.json();

        const mapped: WorkspaceProject = {
          id: item.clientProjectId,
          name: item.name,
          status: item.status || 'draft',
          dateCreated:
            item.dateCreated ||
            (item.createdAt
              ? String(item.createdAt).split('T')[0]
              : new Date().toISOString().split('T')[0]),
          businessCase: item.businessCase || '',
          problemStatement: item.problemStatement || '',
          goalStatement: item.goalStatement || '',
          inScope: item.inScope || '',
          outOfScope: item.outOfScope || '',
          benefits: item.benefits || '',
          champion: item.champion || '',
          championRole: item.championRole || 'Executive Sponsor',
          lead: item.lead || '',
          leadRole: item.leadRole || 'Project Manager',
          smeList: item.smeList || [],
          projectTeam: item.projectTeam || [],
          phases: item.phases || {},
          tasks: item.tasks || [],
        };

        updateState(prev => ({
          ...prev,
          workspaces: prev.workspaces.map((ws, i) =>
            i === 0
              ? {
                  ...ws,
                  projects: [
                    ...ws.projects.filter(p => p.id !== mapped.id),
                    mapped,
                  ],
                }
              : ws
          ),
        }));
      } catch (e) {
        console.error('Failed to load project charter', e);
      }
    };

    loadProject();
  }, [projectId, state.workspaces, updateState]);

  // Always sync latest tasks (including status) from backend so admin view reflects employee updates
  useEffect(() => {
    if (!projectId) return;

    const syncTasksFromBackend = async () => {
      try {
        const res = await fetch(`${API_BASE}/project-charters/${projectId}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const item = await res.json();
        const backendTasks: WorkspaceTask[] = item.tasks || [];

        updateState(prev => ({
          ...prev,
          workspaces: prev.workspaces.map(ws => ({
            ...ws,
            projects: ws.projects.map(p =>
              p.id === projectId
                ? {
                    ...p,
                    tasks: backendTasks,
                  }
                : p
            ),
          })),
        }));
      } catch (e) {
        console.error('Failed to sync project tasks', e);
      }
    };

    syncTasksFromBackend();
  }, [projectId, updateState]);

  const activeProject = useMemo(
    () => state.workspaces.flatMap(w => w.projects).find(p => p.id === projectId),
    [state.workspaces, projectId]
  );

  const updateProject = (updates: Partial<WorkspaceProject>) => {
    updateState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(ws => ({
        ...ws,
        projects: ws.projects.map(p => (p.id === projectId ? { ...p, ...updates } : p)),
      })),
    }));
  };

  const persistProject = async (project: WorkspaceProject) => {
    try {
      await fetch(`${API_BASE}/project-charters`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(project),
      });
    } catch (e) {
      console.error('Failed to persist project updates', e);
    }
  };

  const updatePhase = (key: keyof ProjectPhases, val: string) => {
    updateProject({ phases: { ...activeProject.phases, [key]: val } });
  };

  const removePhase = (num: number) => {
    if (!activeProject?.phases) return;
    const entries = Object.entries(activeProject.phases).filter(([k, v]) => v);
    const sorted = entries.sort((a, b) => {
      const ma = a[0].match(/phase(\d+)/);
      const mb = b[0].match(/phase(\d+)/);
      const na = ma ? parseInt(ma[1], 10) : Number.MAX_SAFE_INTEGER;
      const nb = mb ? parseInt(mb[1], 10) : Number.MAX_SAFE_INTEGER;
      return na - nb;
    });
    const kept = sorted.filter(([, ,], idx) => idx + 1 !== num);
    const compacted: ProjectPhases = {};
    kept.forEach(([, value], idx) => {
      (compacted as any)[`phase${idx + 1}`] = value;
    });
    updateProject({ phases: compacted });
    persistProject({ ...activeProject, phases: compacted });
    setPhaseCount(c => Math.max(kept.length, 1));
  };

  const removeTask = (taskId: string) => {
    const newTasks = (activeProject.tasks || []).filter(t => t.id !== taskId);
    updateProject({
      tasks: newTasks,
    });
    persistProject({ ...activeProject, tasks: newTasks });
  };

  // Initialize phase count based on existing phases (at least 1)
  useEffect(() => {
    if (!activeProject || !activeProject.phases) {
      setPhaseCount(1);
      return;
    }
    const phaseKeys = Object.keys(activeProject.phases)
      .map(k => {
        const m = k.match(/^phase(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => n > 0);
    const maxExisting = phaseKeys.length ? Math.max(...phaseKeys) : 1;
    setPhaseCount(maxExisting);
  }, [activeProject]);

  if (!activeProject) {
    return <div className="p-12 text-center text-slate-800">Project Brief Not Found.</div>;
  }

  const generateId = () =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto.randomUUID() as string)
      : Math.random().toString(36).slice(2));

  const handleAddSimpleTask = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const taskId = `t-${generateId()}`;
    const task: WorkspaceTask = {
      id: taskId,
      title,
      description: '',
      status: 'todo',
      priority: newTaskPriority,
      assigneeId: newTaskAssignee || undefined,
      dueDate: newTaskDueDate || undefined,
      createdBy: state.currentUser.id,
      createdByRole: state.currentUser.role,
      createdAt: now,
      updatedAt: now,
    };
    updateProject({ tasks: [...(activeProject.tasks || []), task] });
    try {
      await fetch(`${API_BASE}/spaces/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          projectId: activeProject.id,
          projectTaskId: taskId,
          assigneeId: newTaskAssignee || undefined,
          dueDate: newTaskDueDate || undefined,
          priority: newTaskPriority,
          status: 'todo',
        }),
      });
    } catch (e) {
      // If Spaces sync fails, we still keep the project task; optional: log in console.
      console.error('Failed to sync task to Spaces', e);
    }
    setNewTaskTitle('');
    setNewTaskAssignee('');
    setNewTaskDueDate('');
    setNewTaskPriority('medium');
    setIsAddingTask(false);
  };

  return (
    <div className="min-h-full flex flex-col -m-16 bg-white overflow-hidden relative">
      <div className="absolute top-6 left-6 z-50 flex gap-4">
        <Link
          to="/workspaces"
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100/80 backdrop-blur-md rounded-full text-[15px] text-brand-grey hover:bg-slate-200 transition-all"
        >
          <RotateCcw size={14} /> System Back
        </Link>
      </div>

      <div className="absolute top-6 right-6 z-50 flex gap-2">
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="p-3 bg-red-50 text-brand-red rounded-full hover:bg-brand-red hover:text-white transition-all shadow-sm"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="flex-1 bg-white p-12 md:p-24 flex flex-col min-h-screen overflow-auto">
        <WorkspaceP1DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={() => {
            updateState(prev => ({
              ...prev,
              workspaces: prev.workspaces.map(ws => ({
                ...ws,
                projects: ws.projects.filter(p => p.id !== projectId),
              })),
            }));
            setIsDeleteModalOpen(false);
            navigate('/workspaces');
          }}
        />

        <div className="flex flex-col md:flex-row justify-between items-start mb-12 border-b border-slate-100 pb-10">
          <div className="flex flex-col gap-2">
            <span className="text-[15px] text-brand-red">Project Brief</span>
            <h1 className="text-4xl md:text-5xl text-brand-navy leading-tight max-w-2xl">
              {activeProject.name}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <WorkspaceP1CharterSections activeProject={activeProject} updateProject={updateProject} />

          <WorkspaceP1TeamSection
            activeProject={activeProject}
            employees={employees}
            updateProject={updateProject}
            phaseCount={phaseCount}
            setPhaseCount={setPhaseCount}
            updatePhase={updatePhase}
            removePhase={removePhase}
          />
        </div>

        <div className="mt-10 flex flex-col gap-8">
          <div className="flex justify-end">
            <button
              onClick={async () => {
                // Persist the active project to backend before navigating back
                try {
                  await fetch(`${API_BASE}/project-charters`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(activeProject),
                  });
                } catch (e) {
                  // For now we just log; you can replace with toast/snackbar
                  console.error('Failed to save project charter', e);
                }
                navigate('/workspaces');
              }}
              className="inline-flex items-center gap-3 px-8 py-3 rounded-full bg-brand-red text-white text-[15px] font-black tracking-[0.15em] shadow-lg shadow-brand-red/30 hover:bg-brand-navy transition-colors uppercase"
            >
              Submit / Add Project
            </button>
          </div>

          <WorkspaceP1TasksSection
            activeProject={activeProject}
            employees={employees}
            isAddingTask={isAddingTask}
            setIsAddingTask={setIsAddingTask}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            newTaskAssignee={newTaskAssignee}
            setNewTaskAssignee={setNewTaskAssignee}
            newTaskDueDate={newTaskDueDate}
            setNewTaskDueDate={setNewTaskDueDate}
            newTaskPriority={newTaskPriority}
            setNewTaskPriority={setNewTaskPriority}
            handleAddSimpleTask={handleAddSimpleTask}
            removeTask={removeTask}
            isPrivilegedCreator={isPrivilegedCreator}
            onViewMessages={setMessageTask}
          />
        </div>
      </div>
      <WorkspaceP1MessagesModal messageTask={messageTask} onClose={() => setMessageTask(null)} />
    </div>
  );
};

export default WorkspaceP1Detail;
