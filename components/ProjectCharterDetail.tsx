import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  PlanningState,
  WorkspaceProject,
  ProjectPhases,
  WorkspaceTask,
  TaskStatus,
} from '../types';
import {
  Plus,
  RotateCcw,
  Trash2,
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  User,
  Briefcase,
  Award,
  ChevronDown,
  UserCircle2,
} from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { PROJECT_ROLES } from '../constants';
import { API_BASE, getAuthHeaders } from '../config/api';

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

  const handleAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    const newTask: WorkspaceTask = {
      id: `t-${Date.now()}`,
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
        id: `t-ai-${Math.random().toString(36).substr(2, 9)}`,
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
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
            <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
              <button
                className="absolute top-4 right-4 text-slate-300 hover:text-brand-red transition-colors"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-md">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-navy leading-tight">
                    Delete Charter Frame
                  </h3>
                  <p className="text-[13px] text-brand-grey font-medium tracking-[0.15em] mt-1 uppercase">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <p className="text-[15px] text-slate-700 mb-8">Permanently purge this charter frame?</p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-5 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-brand-grey bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors uppercase"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
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
                  className="px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-brand-red shadow-lg shadow-brand-red/30 hover:bg-brand-navy transition-colors uppercase"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

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
            <section className="bg-slate-50 p-10 rounded-5xl border border-slate-100 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-red/5 -mr-24 -mt-24 rounded-full" />
              <div className="flex items-center gap-4 mb-10 relative z-10">
                <div className="p-3 bg-brand-red text-white rounded-2xl shadow-lg">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-3xl text-brand-navy leading-none">Project Team</h2>
                  <p className="text-[15px] font-black text-brand-grey tracking-widest mt-1 opacity-50">
                    Strategic unit assignment Matrix
                  </p>
                </div>
              </div>

              <div className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[15px] font-black text-slate-800 tracking-[0.2em]">
                      Project Champion
                    </label>
                    <div className="w-1.5 h-1.5 bg-brand-red rounded-full animate-pulse" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-white p-2 rounded-4xl shadow-sm border border-slate-100 group-within:border-brand-red/20 transition-all">
                    <div className="flex items-center px-4 gap-3 py-2 border-b md:border-b-0 md:border-r border-slate-50">
                      <UserCircle2 size={18} className="text-brand-red opacity-30" />
                      <input
                        value={activeProject.champion}
                        onChange={e => updateProject({ champion: e.target.value })}
                        className="w-full bg-transparent border-none p-0 text-brand-grey font-black text-md outline-none focus:ring-0 placeholder:font-medium placeholder:text-slate-300"
                        placeholder="Assign identity"
                      />
                    </div>
                    <div className="relative flex items-center px-4 gap-2 py-2">
                      <Briefcase size={14} className="text-brand-navy opacity-30" />
                      <input
                        list="project-roles"
                        value={activeProject.championRole || ''}
                        onChange={e => updateProject({ championRole: e.target.value })}
                        className="w-full bg-transparent border-none p-0 text-brand-red text-[15px] font-black tracking-widest outline-none focus:ring-0 placeholder:font-medium placeholder:text-slate-300"
                        placeholder="Define mission role"
                      />
                      <ChevronDown size={14} className="text-slate-300 shrink-0" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[15px] font-black text-slate-800 tracking-[0.2em]">
                      Project lead
                    </label>
                    <div className="w-1.5 h-1.5 bg-brand-cyan rounded-full animate-pulse" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-white p-2 rounded-4xl shadow-sm border border-slate-100 group-within:border-brand-red/20 transition-all">
                    <div className="flex items-center px-4 gap-3 py-2 border-b md:border-b-0 md:border-r border-slate-50">
                      <Sparkles size={18} className="text-brand-cyan opacity-30" />
                      <input
                        value={activeProject.lead}
                        onChange={e => updateProject({ lead: e.target.value })}
                        className="w-full bg-transparent border-none p-0 text-brand-grey font-black text-md outline-none focus:ring-0 placeholder:font-medium placeholder:text-slate-300"
                        placeholder="Assign Identity"
                      />
                    </div>
                    <div className="relative flex items-center px-4 gap-2 py-2">
                      <Briefcase size={14} className="text-brand-navy opacity-30" />
                      <input
                        list="project-roles"
                        value={activeProject.leadRole || ''}
                        onChange={e => updateProject({ leadRole: e.target.value })}
                        className="w-full bg-transparent border-none p-0 text-brand-red text-[15px] font-black tracking-widest outline-none focus:ring-0 placeholder:font-medium placeholder:text-slate-300"
                        placeholder="Define Mission Role"
                      />
                      <ChevronDown size={14} className="text-slate-300 shrink-0" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-200/50">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[15px] font-black text-slate-800 tracking-[0.2em]">
                      Core Project Team
                    </h3>
                    <button
                      onClick={() =>
                        updateProject({
                          projectTeam: [
                            ...(activeProject.projectTeam || []),
                            { id: `pt-${Date.now()}`, name: '', role: '' },
                          ],
                        })
                      }
                      className="text-white bg-brand-navy shadow-lg shadow-slate-200 p-2 rounded-2xl hover:scale-110 active:scale-95 transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-3 no-scrollbar custom-scrollbar-thin">
                    {(activeProject.projectTeam || []).map(member => (
                      <div
                        key={member.id}
                        className="flex flex-col md:flex-row gap-2 bg-white p-3 rounded-[2.5rem] border border-slate-100 group transition-all hover:border-brand-navy/40 shadow-sm"
                      >
                        <div className="flex-1 flex gap-3 items-center px-3 py-1">
                          <div className="w-2 h-2 rounded-full bg-slate-100 shrink-0 group-hover:bg-brand-navy transition-colors" />
                          <select
                            value={member.name}
                            onChange={e => {
                              const name = e.target.value;
                              updateProject({
                                projectTeam: (activeProject.projectTeam || []).map(m =>
                                  m.id === member.id ? { ...m, name } : m
                                ),
                              });
                            }}
                            className="flex-1 bg-transparent border-none p-0 text-brand-grey font-bold text-md outline-none focus:ring-0 cursor-pointer"
                          >
                            <option value="">Select team member</option>
                            {state.team.map(tm => (
                              <option key={tm.id} value={tm.name}>
                                {tm.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1 flex gap-3 items-center border-t md:border-t-0 md:border-l border-slate-50 pl-0 md:pl-4 pt-3 md:pt-0">
                          <div className="relative flex-1 flex items-center gap-2">
                            <Briefcase size={12} className="text-slate-300 shrink-0" />
                            <input
                              list="project-roles"
                              value={member.role}
                              onChange={e =>
                                updateProject({
                                  projectTeam: (activeProject.projectTeam || []).map(m =>
                                    m.id === member.id ? { ...m, role: e.target.value } : m
                                  ),
                                })
                              }
                              className="flex-1 bg-transparent border-none p-0 text-brand-red text-[15px] font-black tracking-wider outline-none focus:ring-0 placeholder:text-slate-400"
                              placeholder="Assignment"
                            />
                          </div>
                          <button
                            onClick={() =>
                              updateProject({
                                projectTeam: (activeProject.projectTeam || []).filter(
                                  m => m.id !== member.id
                                ),
                              })
                            }
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-brand-red transition-all p-2 bg-red-50/0 hover:bg-red-50 rounded-xl"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!activeProject.projectTeam || activeProject.projectTeam.length === 0) && (
                      <div className="text-center py-8 bg-white/50 border-2 border-dashed border-slate-200 rounded-5xl">
                        <p className="text-[9px] text-slate-300 tracking-[0.2em] font-black leading-loose">
                          Awaiting Core Team <br /> Assignment
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-200/50">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[15px] font-black text-slate-800 tracking-[0.2em]">
                      Deployment Units (SMEs)
                    </h3>
                    <button
                      onClick={() =>
                        updateProject({
                          smeList: [
                            ...activeProject.smeList,
                            { id: `sme-${Date.now()}`, name: '', role: '' },
                          ],
                        })
                      }
                      className="text-white bg-brand-red shadow-lg shadow-red-100 p-2 rounded-2xl hover:scale-110 active:scale-95 transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-3 no-scrollbar custom-scrollbar-thin">
                    {activeProject.smeList.map(sme => (
                      <div
                        key={sme.id}
                        className="flex flex-col md:flex-row gap-2 bg-white p-3 rounded-[2.5rem] border border-slate-100 group transition-all hover:border-brand-red/30 shadow-sm"
                      >
                        <div className="flex-1 flex gap-3 items-center px-3 py-1">
                          <div className="w-2 h-2 rounded-full bg-slate-100 shrink-0 group-hover:bg-brand-red transition-colors" />
                          <input
                            value={sme.name}
                            onChange={e =>
                              updateProject({
                                smeList: activeProject.smeList.map(s =>
                                  s.id === sme.id ? { ...s, name: e.target.value } : s
                                ),
                              })
                            }
                            className="flex-1 bg-transparent border-none p-0 text-brand-grey font-bold text-md outline-none focus:ring-0 placeholder:text-slate-400"
                            placeholder="Unit Identifier"
                          />
                        </div>
                        <div className="flex-1 flex gap-3 items-center border-t md:border-t-0 md:border-l border-slate-50 pl-0 md:pl-4 pt-3 md:pt-0">
                          <div className="relative flex-1 flex items-center gap-2">
                            <Briefcase size={12} className="text-slate-300 shrink-0" />
                            <input
                              list="project-roles"
                              value={sme.role}
                              onChange={e =>
                                updateProject({
                                  smeList: activeProject.smeList.map(s =>
                                    s.id === sme.id ? { ...s, role: e.target.value } : s
                                  ),
                                })
                              }
                              className="flex-1 bg-transparent border-none p-0 text-brand-red text-[15px] font-black tracking-wider outline-none focus:ring-0 placeholder:text-slate-400"
                              placeholder="Assignment"
                            />
                          </div>
                          <button
                            onClick={() =>
                              updateProject({
                                smeList: activeProject.smeList.filter(s => s.id !== sme.id),
                              })
                            }
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-brand-red transition-all p-2 bg-red-50/0 hover:bg-red-50 rounded-xl"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {activeProject.smeList.length === 0 && (
                      <div className="text-center py-12 bg-white/50 border-2 border-dashed border-slate-200 rounded-5xl">
                        <p className="text-[9px] text-slate-300 tracking-[0.2em] font-black leading-loose">
                          Awaiting Unit <br /> Deployment
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

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

        <div className="mt-16 pt-24 border-t-8 border-brand-navy relative print:mt-12">
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-12 py-2.5 bg-brand-red text-white text-[12px] font-black tracking-[0.2em] rounded-full shadow-2xl shadow-brand-red/30 transform hover:scale-105 transition-transform cursor-default">
            Mission Throughput Matrix
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
            <div>
              <h2 className="text-5xl font-black text-brand-navy tracking-tighter leading-none">
                Project Tasks
              </h2>
              <p className="text-brand-grey font-bold tracking-[0.2em] text-[15px] mt-4 max-w-lg opacity-60">
                Critical work items required to deliver this project.
              </p>
            </div>
            <div className="flex items-center gap-6 print:hidden">
              <button
                onClick={() => setIsAiConfigModalOpen(true)}
                disabled={isGenerating}
                className={`flex items-center gap-3 px-8 py-4 bg-brand-red text-white rounded-[2rem] text-[15px] font-black tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-red/20 ${
                  isGenerating ? 'opacity-50 animate-pulse cursor-not-allowed' : ''
                }`}
              >
                <Sparkles size={18} /> {isGenerating ? 'Synthesizing...' : 'Generate Tasks'}
              </button>
              <button
                onClick={() => {
                  setNewTaskTitle('');
                  setIsAddTaskModalOpen(true);
                }}
                className="flex items-center gap-3 px-8 py-4 bg-brand-navy text-white rounded-[2rem] text-[15px] font-black tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-navy/20"
              >
                <Plus size={18} /> Add Task
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {sortedTasks.map(task => {
              const taskMessages = Array.isArray(task.messages) ? task.messages : [];
              const sortedMessages = [...taskMessages].sort(
                (a, b) =>
                  new Date(b.createdAt || '').getTime() -
                  new Date(a.createdAt || '').getTime()
              );
              const highlightGreen = isPrivilegedCreator((task as any).createdBy, (task as any).createdByRole);

              return (
              <div
                key={task.id}
                className={`p-10 rounded-5xl border-2 group hover:border-brand-red transition-all relative shadow-sm hover:shadow-3xl flex flex-col ${
                  highlightGreen ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'
                }`}
              >
                <button
                  onClick={() => removeTask(task.id)}
                  className="absolute top-8 right-8 text-slate-300 hover:text-brand-red opacity-0 group-hover:opacity-100 transition-all print:hidden"
                >
                  <X size={20} />
                </button>
                <div className="flex items-start gap-5 mb-8">
                  <button
                    onClick={() => toggleTaskStatus(task.id)}
                    className={`shrink-0 mt-1 w-8 h-8 rounded-2xl border-2 flex items-center justify-center transition-all ${
                      task.status === 'done'
                        ? 'bg-brand-green border-brand-green text-white rotate-6 shadow-lg shadow-brand-green/20'
                        : 'border-slate-200 text-transparent hover:border-brand-red hover:bg-red-50'
                    }`}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <div className="flex-1">
                    <h3
                      className={`text-xl font-black leading-tight tracking-tight ${
                        task.status === 'done'
                          ? 'text-slate-800 line-through opacity-50'
                          : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h3>
                    {sortedMessages.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {sortedMessages.map((m, idx) => (
                          <div
                            key={m.id || idx}
                            className="text-sm text-brand-grey font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity bg-slate-50 rounded-2xl px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-slate-700">
                                  {m.from || 'Employee'}
                                </span>
                                {m.status && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
                                    {m.status}
                                  </span>
                                )}
                              </div>
                              {m.createdAt && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(m.createdAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="text-[13px] text-slate-700 whitespace-pre-wrap">
                              {m.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      task.description && (
                        <p className="text-md text-brand-grey font-medium mt-4 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                          {task.description}
                        </p>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-8 flex flex-col gap-4">
                  <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-3xl border border-slate-100/50 group-hover:bg-white group-hover:border-slate-200 transition-all">
                    <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-red group-hover:bg-slate-50">
                      <User size={14} />
                    </div>
                    <div className="flex-1 relative">
                      <select
                        value={task.assigneeId || ''}
                        onChange={e => handleAssignTask(task.id, e.target.value)}
                        className="w-full bg-transparent border-none text-[15px] font-black tracking-widest text-brand-navy outline-none focus:ring-0 cursor-pointer appearance-none pr-6"
                      >
                        <option value="">Unassigned</option>
                        {state.team.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={10}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-[9px] font-black tracking-[0.2em] text-slate-800">
                      <Clock size={12} className="text-brand-red opacity-30" />{' '}
                      {task.status.replace('_', ' ')}
                    </div>
                    <div
                      className={`px-4 py-1.5 rounded-full text-[14px] font-black tracking-widest ${
                        task.priority === 'high'
                          ? 'bg-brand-red text-white'
                          : 'bg-slate-100 text-brand-grey shadow-inner'
                      }`}
                    >
                      {task.priority} Priority
                    </div>
                  </div>
                </div>
              </div>
            )})}
            {sortedTasks.length === 0 && (
              <div className="col-span-full py-40 text-center bg-slate-50/30 border-4 border-dashed border-slate-100 rounded-5xl">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                  <Clock size={48} className="text-slate-400" />
                </div>
                <h3 className="text-2xl font-black text-slate-400 tracking-[0.2em]">
                  No tasks yet
                </h3>
                <p className="text-[15px] text-slate-300 mt-4 tracking-[0.2em]">
                  Use Generate Tasks or Add Task to create your first items.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 flex justify-end print:hidden">
          <button
            onClick={() => navigate('/workspaces')}
            className="inline-flex items-center gap-3 px-8 py-3 rounded-full bg-brand-red text-white text-[15px] font-black tracking-[0.15em] shadow-lg shadow-brand-red/30 hover:bg-brand-navy transition-colors uppercase"
          >
            Submit / Add Project
          </button>
        </div>

        {aiErrorMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
            <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
              <button
                className="absolute top-4 right-4 text-slate-300 hover:text-brand-red transition-colors"
                onClick={() => setAiErrorMessage(null)}
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-md">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-navy leading-tight">
                    AI Protocol Error
                  </h3>
                  <p className="text-[13px] text-brand-grey font-medium tracking-[0.15em] mt-1 uppercase">
                    Task synthesis unavailable
                  </p>
                </div>
              </div>
              <p className="text-[15px] text-slate-700 mb-8">{aiErrorMessage}</p>
              <div className="flex justify-end">
                <button
                  className="px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-brand-red shadow-lg shadow-brand-red/30 hover:bg-brand-navy transition-colors uppercase"
                  onClick={() => setAiErrorMessage(null)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {isAddTaskModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-md">
            <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
              <button
                className="absolute top-4 right-4 text-slate-300 hover:text-brand-navy transition-colors"
                onClick={() => setIsAddTaskModalOpen(false)}
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-brand-navy flex items-center justify-center text-white shadow-md">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-navy leading-tight">Add Task</h3>
                  <p className="text-[13px] text-brand-grey font-medium tracking-[0.15em] mt-1 uppercase">
                    Create a project task
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[13px] font-black tracking-[0.2em] text-slate-500 uppercase">
                  Task Title
                </label>
                <input
                  autoFocus
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-brand-navy text-[15px] font-medium outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy bg-slate-50/40"
                  placeholder="Enter task title"
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  className="px-5 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-brand-grey bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors uppercase"
                  onClick={() => setIsAddTaskModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  disabled={!newTaskTitle.trim()}
                  onClick={handleAddTask}
                  className={`px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-brand-navy shadow-lg shadow-brand-navy/30 hover:bg-brand-red transition-colors uppercase ${
                    !newTaskTitle.trim() ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        )}

        {isAiConfigModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-md">
            <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
              <button
                className="absolute top-4 right-4 text-slate-300 hover:text-brand-red transition-colors"
                onClick={() => setIsAiConfigModalOpen(false)}
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-md">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-navy leading-tight">
                    Generate Tasks
                  </h3>
                  <p className="text-[13px] text-brand-grey font-medium tracking-[0.15em] mt-1 uppercase">
                    Configure synthesis parameters
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[13px] font-black tracking-[0.2em] text-slate-500 uppercase">
                    Number of Tasks (1-10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={aiTaskCount}
                    onChange={e => setAiTaskCount(e.target.value)}
                    className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-brand-navy text-[15px] font-medium outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red bg-slate-50/40"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[13px] font-black tracking-[0.2em] text-slate-500 uppercase">
                    Initial Status
                  </label>
                  <select
                    value={aiStatus}
                    onChange={e => setAiStatus(e.target.value as TaskStatus)}
                    className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-brand-navy text-[15px] font-medium outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red bg-slate-50/40 cursor-pointer"
                  >
                    <option value="todo">todo</option>
                    <option value="doing">doing</option>
                    <option value="review">review</option>
                    <option value="done">done</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  className="px-5 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-brand-grey bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors uppercase"
                  onClick={() => setIsAiConfigModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  disabled={!aiTaskCount || parseInt(aiTaskCount || '0', 10) <= 0}
                  onClick={handleAiSuggest}
                  className={`px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-brand-red shadow-lg shadow-brand-red/30 hover:bg-brand-navy transition-colors uppercase ${
                    !aiTaskCount || parseInt(aiTaskCount || '0', 10) <= 0
                      ? 'opacity-60 cursor-not-allowed'
                      : ''
                  }`}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCharterDetail;

