import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlanningState, WorkspaceProject, ProjectPhases, WorkspaceTask, TaskStatus } from '../types';
import { RotateCcw, Trash2, X, User, Plus, Clock, Bell } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../config/api';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

interface Employee {
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

    // Initial sync on mount
    syncTasksFromBackend();

    // Periodic refresh so status changes from employees are reflected
    const interval = setInterval(syncTasksFromBackend, 15000);
    return () => clearInterval(interval);
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

  const handleAddSimpleTask = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const task: WorkspaceTask = {
      id: `t-${Date.now()}`,
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
          projectTaskId: task.id,
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
                    Delete Project Brief
                  </h3>
                  <p className="text-[13px] text-brand-grey font-medium tracking-[0.15em] mt-1 uppercase">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <p className="text-[15px] text-slate-700 mb-8">
                Permanently remove this project brief?
              </p>
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

        <div className="flex flex-col md:flex-row justify-between items-start mb-12 border-b border-slate-100 pb-10">
          <div className="flex flex-col gap-2">
            <span className="text-[15px] text-brand-red">Project Brief</span>
            <h1 className="text-4xl md:text-5xl text-brand-navy leading-tight max-w-2xl">
              {activeProject.name}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-brand-navy mb-2">Business Case</h2>
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <textarea
                  value={activeProject.businessCase}
                  onChange={e => updateProject({ businessCase: e.target.value })}
                  className="w-full bg-transparent border-none text-brand-grey text-[15px] leading-relaxed outline-none resize-none min-h-[80px]"
                  placeholder="Describe the business case for this project..."
                />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-brand-navy mb-2">
                Problem / Opportunity Statement
              </h2>
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <textarea
                  value={activeProject.problemStatement}
                  onChange={e => updateProject({ problemStatement: e.target.value })}
                  className="w-full bg-transparent border-none text-brand-grey text-[15px] leading-relaxed outline-none resize-none min-h-[80px]"
                  placeholder="Summarize the core problem or opportunity..."
                />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-brand-navy mb-2">
                Goal / Objective / Key Results
              </h2>
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <textarea
                  value={activeProject.goalStatement}
                  onChange={e => updateProject({ goalStatement: e.target.value })}
                  className="w-full bg-transparent border-none text-brand-grey text-[15px] leading-relaxed outline-none resize-none min-h-[100px]"
                  placeholder={'Goal:\nObjective:\nKey Results:'}
                />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-brand-navy mb-2">Project Scope</h2>
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <div className="text-[13px] font-semibold text-slate-700 mb-1">In Scope</div>
                  <textarea
                    value={activeProject.inScope}
                    onChange={e => updateProject({ inScope: e.target.value })}
                    className="w-full bg-transparent border-none text-brand-grey text-[15px] leading-relaxed outline-none resize-none min-h-[60px]"
                    placeholder="Items and activities included within this project..."
                  />
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <div className="text-[13px] font-semibold text-slate-700 mb-1">Out of Scope</div>
                  <textarea
                    value={activeProject.outOfScope}
                    onChange={e => updateProject({ outOfScope: e.target.value })}
                    className="w-full bg-transparent border-none text-brand-grey text-[15px] leading-relaxed outline-none resize-none min-h-[60px]"
                    placeholder="Items and activities explicitly excluded from this project..."
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-brand-navy mb-2">
                Project Benefits / Revenue
              </h2>
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <textarea
                  value={activeProject.benefits}
                  onChange={e => updateProject({ benefits: e.target.value })}
                  className="w-full bg-transparent border-none text-brand-grey text-[15px] leading-relaxed outline-none resize-none min-h-[80px]"
                  placeholder="Describe expected benefits and revenue impact..."
                />
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-2xl bg-brand-red text-white flex items-center justify-center">
                  <User size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-brand-navy">Project Team</h2>
                  <p className="text-[13px] text-brand-grey">
                    Identification of team lead, members, and stakeholders.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                    Project Champion
                  </label>
                  <select
                    value={activeProject.champion}
                    onChange={e => updateProject({ champion: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                  >
                    <option value="">Select project champion</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp.empName}>
                        {emp.empName} ({emp.designation} - {emp.department})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                    Project Lead
                  </label>
                  <select
                    value={activeProject.lead}
                    onChange={e => updateProject({ lead: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                  >
                    <option value="">Select project lead</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp.empName}>
                        {emp.empName} ({emp.designation} - {emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-200 mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-slate-700">
                      Project Team Members
                    </span>
                    <button
                      onClick={() =>
                        updateProject({
                          projectTeam: [
                            ...(activeProject.projectTeam || []),
                            { id: `pt-${Date.now()}`, name: '', role: '' },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] bg-brand-navy text-white hover:bg-brand-red transition-colors"
                    >
                      <Plus size={14} /> Add member
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
                    {(activeProject.projectTeam || []).map(member => (
                      <div
                        key={member.id}
                        className="flex flex-col gap-2 bg-white border border-slate-100 rounded-2xl p-3"
                      >
                        <select
                          value={member.name}
                          onChange={e => {
                            const selectedEmp = employees.find(emp => emp.empName === e.target.value);
                            updateProject({
                              projectTeam: (activeProject.projectTeam || []).map(m =>
                                m.id === member.id
                                  ? {
                                      ...m,
                                      id: selectedEmp ? selectedEmp.empId : m.id,
                                      name: e.target.value,
                                      role: selectedEmp ? selectedEmp.designation : m.role,
                                    }
                                  : m
                              ),
                            });
                          }}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                        >
                          <option value="">Select team member</option>
                          {employees.map(emp => (
                            <option key={emp._id} value={emp.empName}>
                              {emp.empName} ({emp.designation} - {emp.department})
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <input
                            value={member.role}
                            onChange={e =>
                              updateProject({
                                projectTeam: (activeProject.projectTeam || []).map(m =>
                                  m.id === member.id ? { ...m, role: e.target.value } : m
                                ),
                              })
                            }
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                            placeholder="Role / stakeholder type"
                          />
                          <button
                            onClick={() =>
                              updateProject({
                                projectTeam: (activeProject.projectTeam || []).filter(
                                  m => m.id !== member.id
                                ),
                              })
                            }
                            className="px-3 py-2 rounded-xl border border-red-100 text-[13px] text-brand-red hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    {(!activeProject.projectTeam || activeProject.projectTeam.length === 0) && (
                      <div className="text-[13px] text-slate-400 border border-dashed border-slate-200 rounded-2xl px-4 py-6 text-center">
                        No team members added yet. Use &quot;Add member&quot; to start building the
                        project team.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-brand-navy">Project Review Timeline</h2>
                <button
                  type="button"
                  onClick={() => setPhaseCount(c => c + 1)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] bg-brand-navy text-white hover:bg-brand-red transition-colors"
                >
                  <Plus size={14} /> Add phase
                </button>
              </div>
              <div className="space-y-3">
                {Array.from({ length: Math.max(1, phaseCount) }).map((_, idx) => {
                  const num = idx + 1;
                  const key = `phase${num}` as keyof ProjectPhases;
                  return (
                    <div key={num} className="flex items-start gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[13px] font-semibold text-slate-700">
                          Phase {num}
                        </label>
                        <input
                          value={(activeProject.phases as any)?.[key] || ''}
                          onChange={e => updatePhase(key, e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                          placeholder={`Describe Phase ${num}...`}
                        />
                      </div>
                      {phaseCount > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhase(num)}
                          className="mt-6 inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-100 text-brand-red hover:bg-red-50"
                          title="Delete phase"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
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

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-brand-navy">Add Tasks</h2>
              <button
                type="button"
                onClick={() => setIsAddingTask(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-navy text-white text-[14px] font-semibold hover:bg-brand-red transition-colors"
              >
                <Plus size={16} /> Add task
              </button>
            </div>

            {isAddingTask && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-semibold text-slate-700">Task</label>
                  <input
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    placeholder="Task name"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-semibold text-slate-700">Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={e => setNewTaskAssignee(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                  >
                    <option value="">Unassigned</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp.empId}>
                        {emp.empName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-semibold text-slate-700">Due date</label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={e => setNewTaskDueDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-semibold text-slate-700">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="md:col-span-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTask(false);
                      setNewTaskTitle('');
                      setNewTaskAssignee('');
                      setNewTaskDueDate('');
                      setNewTaskPriority('medium');
                    }}
                    className="px-4 py-2 rounded-full text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!newTaskTitle.trim()}
                    onClick={handleAddSimpleTask}
                    className={`px-6 py-2 rounded-full text-[13px] font-semibold text-white bg-brand-red hover:bg-brand-navy transition-colors ${
                      !newTaskTitle.trim() ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    Add task
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {(activeProject.tasks || []).length === 0 && !isAddingTask && (
                <div className="text-[13px] text-slate-400 border border-dashed border-slate-200 rounded-2xl px-4 py-6 text-center">
                  No tasks added yet. Use &quot;Add task&quot; to create the first task.
                </div>
              )}
              {(activeProject.tasks || []).map(task => (
                <div
                  key={task.id}
                  className={`grid grid-cols-1 md:grid-cols-6 gap-4 p-4 rounded-3xl border items-center ${
                    isPrivilegedCreator((task as any).createdBy, (task as any).createdByRole)
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-slate-100'
                  }`}
                >
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-[0.15em] mb-1">
                      Task
                    </div>
                    <div className="text-[15px] text-slate-900 font-medium">{task.title}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-[0.15em] mb-1">
                      Assignee
                    </div>
                    <div className="text-[14px] text-slate-700">
                      {task.assigneeId || 'Unassigned'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-[0.15em] mb-1">
                      Due Date
                    </div>
                    <div className="flex items-center gap-2 text-[14px] text-slate-700">
                      <Clock size={14} className="text-slate-300" />
                      {task.dueDate || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-[0.15em] mb-1">
                      Priority
                    </div>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-[12px] font-semibold ${
                        task.priority === 'high'
                          ? 'bg-red-50 text-brand-red'
                          : task.priority === 'low'
                          ? 'bg-slate-50 text-slate-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-[0.15em] mb-1">
                      Status
                    </div>
                    <div className="flex items-center gap-2 text-[14px] text-slate-700">
                      <span>{task.status || 'todo'}</span>
                      <button
                        type="button"
                        onClick={() => setMessageTask(task)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:text-brand-red hover:border-brand-red/40 bg-white"
                        title="View messages from employees"
                      >
                        <Bell size={14} />
                        {Array.isArray(task.messages) && task.messages.length > 0 && (
                          <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-brand-red text-white text-[10px]">
                            {task.messages.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-100 text-brand-red hover:bg-red-50"
                      title="Delete task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
            {messageTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto border border-slate-100 relative p-6">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-brand-red transition-colors"
              onClick={() => setMessageTask(null)}
            >
              <X size={18} />
            </button>
            <h3 className="text-xl font-semibold text-brand-navy mb-1">
              Messages for: {messageTask.title}
            </h3>
            <p className="text-[13px] text-slate-500 mb-4">
              Status: {messageTask.status || 'todo'} · Priority: {messageTask.priority}
            </p>
            {Array.isArray(messageTask.messages) && messageTask.messages.length > 0 ? (
              <div className="space-y-2">
                {[...messageTask.messages]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt || '').getTime() -
                      new Date(a.createdAt || '').getTime()
                  )
                  .map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-slate-800">
                            {m.from || 'Employee'}
                          </span>
                          {m.status && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                              {m.status}
                            </span>
                          )}
                        </div>
                        {m.createdAt && (
                          <span className="text-[11px] text-slate-400">
                            {new Date(m.createdAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-slate-800 whitespace-pre-wrap">
                        {m.text}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-[14px] text-slate-500">No messages received from employees.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceP1Detail;

