import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  PlanningState,
  WorkspaceProject,
  ProjectPhases,
  WorkspaceTask,
  TaskStatus,
} from '../types';
import { RotateCcw, Trash2, Award } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { PROJECT_ROLES } from '../constants';
import { API_BASE, getAuthHeaders } from '../config/api';
import { ProjectCharterTeamSection } from './project-charter/ProjectCharterTeamSection';
import { ProjectCharterTasksSection } from './project-charter/ProjectCharterTasksSection';
import { ProjectCharterDetailModals } from './project-charter/ProjectCharterDetailModals';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const ProjectCharterDetail: React.FC<Props> = ({ state, updateState }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAiConfigModalOpen, setIsAiConfigModalOpen] = useState(false);
  const [aiTaskCount, setAiTaskCount] = useState('5');
  const [aiStatus, setAiStatus] = useState<TaskStatus>('todo');
  const [employeeRoleMap, setEmployeeRoleMap] = useState<Record<string, string>>({});

  const activeProject = useMemo(
    () => state.workspaces.flatMap(w => w.projects).find(p => p.id === projectId),
    [state.workspaces, projectId]
  );

  useEffect(() => {
    const loadEmployeeRoles = async () => {
      try {
        const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];
        const map: Record<string, string> = {};
        list.forEach((e: any) => {
          const role = String(e.role || '').toUpperCase();
          if (e.empId) map[String(e.empId)] = role;
          if (e._id) map[String(e._id)] = role;
        });
        setEmployeeRoleMap(map);
      } catch (e) {
        console.error('Failed to load employee roles', e);
      }
    };
    loadEmployeeRoles();
  }, []);

  const isPrivilegedCreator = (createdBy: unknown, createdByRole: unknown) => {
    const direct = createdByRole ? String(createdByRole).toUpperCase() : '';
    if (direct === 'SUPER_ADMIN' || direct === 'ADMIN' || direct === 'TEAM_LEAD' || direct === 'LEADER') {
      return true;
    }
    const key = createdBy ? String(createdBy) : '';
    const role = employeeRoleMap[key] || '';
    return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'TEAM_LEAD';
  };

  const isEmployeeViewer =
    String(state.currentUser.role || '').toUpperCase() === 'EMPLOYEE';

  const sortedTasks = useMemo(() => {
    if (!activeProject) return [] as WorkspaceTask[];
    if (!isEmployeeViewer) return activeProject.tasks;
    const tasks = activeProject.tasks || [];
    if (!tasks.length) return tasks;
    return [...tasks].sort((a, b) => {
      const aPriv = isPrivilegedCreator((a as any).createdBy, (a as any).createdByRole);
      const bPriv = isPrivilegedCreator((b as any).createdBy, (b as any).createdByRole);
      if (aPriv === bPriv) return 0;
      return aPriv ? -1 : 1;
    });
  }, [activeProject, isEmployeeViewer, employeeRoleMap]);

  if (!activeProject) {
    return <div className="p-12 text-center text-slate-800">Charter Frame Not Found.</div>;
  }

  const updateProject = (updates: Partial<WorkspaceProject>) => {
    updateState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(ws => ({
        ...ws,
        projects: ws.projects.map(p => (p.id === projectId ? { ...p, ...updates } : p)),
      })),
    }));
  };

  const updatePhase = (key: keyof ProjectPhases, val: string) => {
    updateProject({ phases: { ...activeProject.phases, [key]: val } });
  };

  const generateId = () =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto.randomUUID() as string)
      : Math.random().toString(36).slice(2));

  const handleAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    const newTask: WorkspaceTask = {
      id: `t-${generateId()}`,
      title,
      status: 'todo',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: state.currentUser.id,
      createdByRole: state.currentUser.role,
      assigneeId: state.currentUser.id,
    };
    updateProject({ tasks: [...activeProject.tasks, newTask] });
    setIsAddTaskModalOpen(false);
    setNewTaskTitle('');
  };

  const handleAiSuggest = async () => {
    const count = parseInt(aiTaskCount || '0', 10);
    if (!count || count <= 0) return;

    const status = (['todo', 'doing', 'review', 'done'].includes(aiStatus || '')
      ? aiStatus
      : 'todo') as TaskStatus;

    setIsGenerating(true);
    try {
      const description = `Business Case: ${activeProject.businessCase}\nProblem Statement: ${activeProject.problemStatement}\nGoals: ${activeProject.goalStatement}`;
      const suggestedTasks = await GeminiService.generateProjectTasks(
        activeProject.name,
        description,
        count,
        status
      );

      const newTasks: WorkspaceTask[] = suggestedTasks.map((t: any) => ({
        id: `t-${generateId()}`,
        title: t.title,
        description: t.description,
        status: t.status || status,
        priority: t.priority || 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'ai-architect',
        assigneeId: state.currentUser.id,
      }));

      updateProject({ tasks: [...activeProject.tasks, ...newTasks] });
    } catch (error) {
      console.error(error);
      setAiErrorMessage('AI task generation encountered a protocol error.');
    } finally {
      setIsGenerating(false);
      setIsAiConfigModalOpen(false);
    }
  };

  const removeTask = (taskId: string) => {
    updateProject({ tasks: activeProject.tasks.filter(t => t.id !== taskId) });
  };

  const toggleTaskStatus = (taskId: string) => {
    updateProject({
      tasks: activeProject.tasks.map(t => {
        if (t.id === taskId) {
          const nextStatus: TaskStatus = t.status === 'done' ? 'todo' : 'done';
          return { ...t, status: nextStatus, updatedAt: new Date().toISOString() };
        }
        return t;
      }),
    });
  };

  const handleAssignTask = (taskId: string, assigneeId: string) => {
    updateProject({
      tasks: activeProject.tasks.map(t =>
        t.id === taskId ? { ...t, assigneeId, updatedAt: new Date().toISOString() } : t
      ),
    });
  };

  const handleDeleteProject = () => {
    updateState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(ws => ({
        ...ws,
        projects: ws.projects.filter(p => p.id !== projectId),
      })),
    }));
    setIsDeleteModalOpen(false);
    navigate('/workspaces');
  };

  return (
    <div className="min-h-full flex flex-col -m-16 bg-white overflow-hidden relative print:m-0 print:p-0">
      <datalist id="project-roles">
        {PROJECT_ROLES.map(role => (
          <option key={role} value={role} />
        ))}
      </datalist>

      <div className="absolute top-6 left-6 z-50 flex gap-4 print:hidden">
        <Link
          to="/workspaces"
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100/80 backdrop-blur-md rounded-full text-[15px] text-brand-grey hover:bg-slate-200 transition-all"
        >
          <RotateCcw size={14} /> System Back
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-red text-white rounded-full text-[15px] shadow-xl shadow-brand-red/20 hover:scale-105 active:scale-95 transition-all"
        >
          Generate PDF / Print
        </button>
      </div>

      <div className="absolute top-6 right-6 z-50 flex gap-2 print:hidden">
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="p-3 bg-red-50 text-brand-red rounded-full hover:bg-brand-red hover:text-white transition-all shadow-sm"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="flex-1 bg-white p-12 md:p-24 flex flex-col min-h-screen relative overflow-auto no-scrollbar">
        <div className="flex flex-col md:flex-row justify-between items-start mb-20 border-b-2 border-slate-50 pb-12">
          <div className="flex flex-col gap-2">
            <span className="text-[15px] text-brand-red">Strategic Architecture Frame</span>
            <h1 className="text-6xl text-brand-navy leading-none max-w-2xl">
              Project Charter: {activeProject.name}
            </h1>
          </div>
          <div className="text-right flex flex-col items-end pt-4">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-5xl text-slate-800 leading-none">RG</span>
              <div className="w-12 h-12 bg-brand-red rounded-xl flex items-center justify-center p-2.5 shadow-lg rotate-3 group">
                <Award
                  size={32}
                  className="text-white group-hover:scale-110 transition-transform"
                />
              </div>
            </div>
            <div className="text-[12px] text-brand-grey leading-tight">Rapid Grow Management Group</div>
            <div className="text-[15px] text-brand-red mt-2">Vision • Protocol • Velocity</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-y-16 mb-24">
          <div className="space-y-12">
            <section className="group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-6 bg-brand-red rounded-full" />
                <h2 className="text-2xl text-brand-navy">Business Case</h2>
              </div>
              <div className="bg-slate-50/50 p-8 rounded-4xl border border-slate-100 group-focus-within:border-brand-red transition-all">
                <textarea
                  value={activeProject.businessCase}
                  onChange={e => updateProject({ businessCase: e.target.value })}
                  className="w-full bg-transparent border-none p-0 text-brand-grey text-lg leading-relaxed outline-none resize-none min-h-[100px] focus:ring-0"
                  placeholder="Identify the strategic necessity and ROI potential..."
                />
              </div>
            </section>

            <section className="relative group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-6 bg-brand-red rounded-full" />
                <h2 className="text-2xl text-brand-navy">Problem Statement</h2>
              </div>
              <div className="border-4 border-slate-100 p-8 rounded-4xl relative group-focus-within:border-brand-red transition-all">
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-brand-red rounded-sm" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-brand-navy rounded-sm" />
                <textarea
                  value={activeProject.problemStatement}
                  onChange={e => updateProject({ problemStatement: e.target.value })}
                  className="w-full bg-transparent border-none p-0 text-brand-grey text-lg leading-relaxed outline-none resize-none min-h-[140px] focus:ring-0"
                  placeholder="Articulate the core performance blockers..."
                />
              </div>
            </section>

            <section className="group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-6 bg-brand-red rounded-full" />
                <h2 className="text-2xl text-brand-navy">Goal Statement</h2>
              </div>
              <div className="bg-brand-navy text-white p-8 rounded-4xl shadow-xl shadow-brand-navy/10 group-focus-within:ring-4 group-focus-within:ring-brand-red/20 transition-all">
                <textarea
                  value={activeProject.goalStatement}
                  onChange={e => updateProject({ goalStatement: e.target.value })}
                  className="w-full bg-transparent border-none p-0 text-slate-300 text-xl font-bold leading-relaxed outline-none resize-none min-h-[80px] focus:ring-0 placeholder:text-slate-600"
                  placeholder="What is the non-negotiable end state?"
                />
              </div>
            </section>

            <section className="space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-6 bg-brand-red rounded-full" />
                <h2 className="text-2xl text-brand-navy">Project Scope</h2>
              </div>
              <div className="pl-6 space-y-8">
                <div className="relative">
                  <h3 className="text-md text-brand-navy mb-4 flex items-center gap-3">
                    <div className="w-2 h-2 bg-brand-green rounded-full" /> In Scope
                  </h3>
                  <textarea
                    value={activeProject.inScope}
                    onChange={e => updateProject({ inScope: e.target.value })}
                    placeholder="• List critical path components..."
                    className="w-full bg-slate-50 border-none p-6 rounded-3xl text-brand-grey text-lg outline-none resize-none min-h-[100px] focus:bg-white focus:ring-2 focus:ring-brand-green/20 transition-all"
                  />
                </div>
                <div className="relative">
                  <h3 className="text-md text-brand-navy mb-4 flex items-center gap-3">
                    <div className="w-2 h-2 bg-brand-red rounded-full" /> Out Of Scope
                  </h3>
                  <textarea
                    value={activeProject.outOfScope}
                    onChange={e => updateProject({ outOfScope: e.target.value })}
                    placeholder="• Define explicit exclusions..."
                    className="w-full bg-slate-50 border-none p-6 rounded-3xl text-brand-grey text-lg outline-none resize-none min-h-[100px] focus:bg-white focus:ring-2 focus:ring-brand-red/20 transition-all"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-16">
            <ProjectCharterTeamSection
              activeProject={activeProject}
              updateProject={updateProject}
              team={state.team}
            />

            <section>
              <div className="flex items-center gap-3 mb-6 px-2">
                <div className="w-1.5 h-6 bg-brand-red rounded-full" />
                <h2 className="text-2xl font-black text-brand-navy tracking-tight">Mission Timeline</h2>
              </div>
              <div className="pl-6 space-y-6">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <div key={num} className="flex gap-6 group">
                    <div className="pt-2 text-center w-8 shrink-0">
                      <span className="text-md font-black text-brand-red opacity-20 group-focus-within:opacity-100 group-hover:opacity-50 transition-opacity">
                        0{num}
                      </span>
                    </div>
                    <div className="flex-1 bg-slate-50/50 p-6 rounded-4xl border border-slate-100 group-focus-within:border-brand-red/20 group-focus-within:bg-white transition-all hover:bg-slate-50">
                      <div className="flex flex-col gap-1">
                        <span className="text-[14px] font-black tracking-widest opacity-40 mb-1">
                          Phase Authorization
                        </span>
                        <textarea
                          value={(activeProject.phases as any)[`phase${num}`] || ''}
                          onChange={e => updatePhase(`phase${num}` as keyof ProjectPhases, e.target.value)}
                          className="w-full bg-transparent border-none p-0 text-brand-grey text-md font-medium outline-none resize-none h-auto focus:ring-0"
                          placeholder={`Define strategic outcomes for phase ${num}...`}
                          rows={1}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <ProjectCharterTasksSection
          sortedTasks={sortedTasks}
          isGenerating={isGenerating}
          team={state.team}
          isPrivilegedCreator={isPrivilegedCreator}
          onOpenAiConfigModal={() => setIsAiConfigModalOpen(true)}
          onOpenAddTaskModal={() => {
            setNewTaskTitle('');
            setIsAddTaskModalOpen(true);
          }}
          removeTask={removeTask}
          toggleTaskStatus={toggleTaskStatus}
          handleAssignTask={handleAssignTask}
        />

        <div className="mt-10 flex justify-end print:hidden">
          <button
            onClick={() => navigate('/workspaces')}
            className="inline-flex items-center gap-3 px-8 py-3 rounded-full bg-brand-red text-white text-[15px] font-black tracking-[0.15em] shadow-lg shadow-brand-red/30 hover:bg-brand-navy transition-colors uppercase"
          >
            Submit / Add Project
          </button>
        </div>

        <ProjectCharterDetailModals
          isDeleteModalOpen={isDeleteModalOpen}
          onCloseDeleteModal={() => setIsDeleteModalOpen(false)}
          onConfirmDelete={handleDeleteProject}
          aiErrorMessage={aiErrorMessage}
          onCloseAiError={() => setAiErrorMessage(null)}
          isAddTaskModalOpen={isAddTaskModalOpen}
          onCloseAddTaskModal={() => setIsAddTaskModalOpen(false)}
          newTaskTitle={newTaskTitle}
          setNewTaskTitle={setNewTaskTitle}
          handleAddTask={handleAddTask}
          isAiConfigModalOpen={isAiConfigModalOpen}
          onCloseAiConfigModal={() => setIsAiConfigModalOpen(false)}
          aiTaskCount={aiTaskCount}
          setAiTaskCount={setAiTaskCount}
          aiStatus={aiStatus}
          setAiStatus={setAiStatus}
          handleAiSuggest={handleAiSuggest}
        />
      </div>
    </div>
  );
};

export default ProjectCharterDetail;

