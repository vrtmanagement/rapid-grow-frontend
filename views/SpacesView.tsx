import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { Plus, MessageSquareText, RefreshCw, MoreVertical } from 'lucide-react';

type SpacesMode = 'employee' | 'manager';
type BackendRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | string;

interface ProjectOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  empId: string;
  empName: string;
}

interface SpacesColumn {
  id: string;
  name: string;
}

interface SpacesComment {
  id: string;
  text: string;
  fromEmpId?: string;
  fromName?: string;
  createdAt: string;
  editedAt?: string;
}

type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'blocked';
type TaskPriority = 'low' | 'medium' | 'high';

interface SpacesTask {
  taskId: string;
  title: string;
  description?: string;
  projectId?: string;
  projectTaskId?: string;
  assigneeId?: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  comments: SpacesComment[];
  customFields: Record<string, string>;
  createdByEmpId?: string;
  createdByName?: string;
  createdByRole?: BackendRole;
  createdAt: string;
  updatedAt: string;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getLoggedInEmployee() {
  const stored = safeJsonParse<any>(localStorage.getItem('rapidgrow-admin'));
  const emp = stored?.employee || {};
  const id = emp.empId || emp._id || '';
  const name = emp.empName || 'Employee';
  const role: BackendRole = emp.role || 'EMPLOYEE';
  return { id, name, role };
}

function normalizeRole(role?: BackendRole): BackendRole {
  return (role || '').toUpperCase() as BackendRole;
}

function projectCharterPayloadFromBackendProject(proj: any, updatedTasks: any[]) {
  return {
    id: proj.clientProjectId,
    name: proj.name,
    status: proj.status,
    dateCreated: proj.dateCreated,
    businessCase: proj.businessCase,
    problemStatement: proj.problemStatement,
    goalStatement: proj.goalStatement,
    inScope: proj.inScope,
    outOfScope: proj.outOfScope,
    benefits: proj.benefits,
    champion: proj.champion,
    championRole: proj.championRole,
    lead: proj.lead,
    leadRole: proj.leadRole,
    smeList: proj.smeList || [],
    projectTeam: proj.projectTeam || [],
    phases: proj.phases || {},
    tasks: updatedTasks,
  };
}

interface Props {
  mode: SpacesMode;
}

const SpacesView: React.FC<Props> = ({ mode }) => {
  const me = useMemo(() => getLoggedInEmployee(), []);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const [columns, setColumns] = useState<SpacesColumn[]>([]);
  const [tasks, setTasks] = useState<SpacesTask[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commentTaskId, setCommentTaskId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState('');
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');

  const [activeColumnMenuId, setActiveColumnMenuId] = useState<string | null>(null);
  const [isRenamingColumnId, setIsRenamingColumnId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [columnToDelete, setColumnToDelete] = useState<SpacesColumn | null>(null);
  const [deleteTaskModal, setDeleteTaskModal] = useState<SpacesTask | null>(null);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const loadSpaces = async () => {
    setSpacesLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/spaces`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load spaces');
      }
      const data = await res.json();
      setColumns(Array.isArray(data?.columns) ? data.columns : []);
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load spaces');
    } finally {
      setSpacesLoading(false);
    }
  };

  useEffect(() => {
    loadSpaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      setProjectsLoading(true);
      try {
        if (mode === 'employee') {
          if (!me.id) {
            setProjects([]);
            return;
          }
          const res = await fetch(`${API_BASE}/project-charters/assigned/${me.id}`, {
            headers: getAuthHeaders(),
          });
          if (!res.ok) {
            setProjects([]);
            return;
          }
          const data = await res.json().catch(() => []);
          const list = Array.isArray(data) ? data : [];
          setProjects(
            list
              .map((p: any) => ({ id: p.clientProjectId, name: p.name }))
              .filter((p: ProjectOption) => p.id && p.name),
          );
        } else {
          const res = await fetch(`${API_BASE}/project-charters`, {
            headers: getAuthHeaders(),
          });
          if (!res.ok) {
            setProjects([]);
            return;
          }
          const data = await res.json().catch(() => []);
          const list = Array.isArray(data) ? data : [];
          setProjects(
            list
              .map((p: any) => ({ id: p.clientProjectId, name: p.name }))
              .filter((p: ProjectOption) => p.id && p.name),
          );
        }
      } catch (e) {
        console.error('Failed to load projects for Spaces', e);
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    loadProjects();
  }, [mode, me.id]);

  useEffect(() => {
    const loadEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
        if (!res.ok) {
          setEmployees([]);
          return;
        }
        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];
        setEmployees(
          list
            .map((e: any) => ({ empId: e.empId, empName: e.empName }))
            .filter((e: EmployeeOption) => e.empId && e.empName),
        );
      } catch (e) {
        console.error('Failed to load employees for Spaces', e);
        setEmployees([]);
      } finally {
        setEmployeesLoading(false);
      }
    };

    loadEmployees();
  }, []);

  const patchTask = async (taskId: string, updates: Partial<SpacesTask>) => {
    setError(null);
    const existing = tasks.find((t) => t.taskId === taskId) || null;
    setTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? ({ ...t, ...updates } as SpacesTask) : t)),
    );
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update task');
      }
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.taskId === taskId ? updated : t)));

      // If this task is linked to a project task, sync updates into the project charter as well
      if (existing?.projectId && existing?.projectTaskId) {
        try {
          const resProj = await fetch(`${API_BASE}/project-charters/${existing.projectId}`, {
            headers: getAuthHeaders(),
          });
          if (resProj.ok) {
            const proj = await resProj.json();
            const existingTasks: any[] = Array.isArray(proj?.tasks) ? proj.tasks : [];
            const updatedTasks = existingTasks.map((pt: any) => {
              if (pt.id !== existing.projectTaskId) return pt;
              return {
                ...pt,
                title: updates.title ?? pt.title,
                status: updates.status ?? pt.status,
                priority: updates.priority ?? pt.priority,
                assigneeId: updates.assigneeId ?? pt.assigneeId,
                dueDate: updates.dueDate ?? pt.dueDate,
                updatedAt: new Date().toISOString(),
              };
            });
            const payload = projectCharterPayloadFromBackendProject(proj, updatedTasks);
            await fetch(`${API_BASE}/project-charters`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(payload),
            });
          }
        } catch (e) {
          console.error('Failed to sync Spaces task to project charter', e);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to update task');
      loadSpaces();
    }
  };

  const handleAddColumn = async () => {
    const name = window.prompt('New field name');
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/spaces/columns`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add field');
      }
      setColumns(Array.isArray(data.columns) ? data.columns : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to add field');
    }
  };

  const handleCreate = async () => {
    const t = title.trim();
    if (!t) return;
    setSaving(true);
    setError(null);

    const now = new Date().toISOString();
    const project = selectedProjectId
      ? projects.find((p) => p.id === selectedProjectId) || null
      : null;

    try {
      if (project) {
        // Persist to backend project tasks so Team Lead/Admin can see it inside the project.
        const resProj = await fetch(`${API_BASE}/project-charters/${project.id}`, {
          headers: getAuthHeaders(),
        });
        if (!resProj.ok) {
          throw new Error('Failed to load project details');
        }
        const proj = await resProj.json();
        const existingTasks: any[] = Array.isArray(proj?.tasks) ? proj.tasks : [];
        const newWorkspaceTask = {
          id: `t-${Date.now()}`,
          title: t,
          description: '',
          status,
          priority,
          createdBy: me.id || 'employee',
          createdByRole: me.role || 'EMPLOYEE',
          assigneeId: assigneeId || undefined,
          dueDate: dueDate || undefined,
          createdAt: now,
          updatedAt: now,
        };
        const updatedTasks = [...existingTasks, newWorkspaceTask];
        const payload = projectCharterPayloadFromBackendProject(proj, updatedTasks);

        const resSave = await fetch(`${API_BASE}/project-charters`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!resSave.ok) {
          const data = await resSave.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to create task under project');
        }
      }

      const res = await fetch(`${API_BASE}/spaces/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: t,
          projectId: project?.id || '',
          projectTaskId: newWorkspaceTask.id,
          assigneeId,
          dueDate,
          priority,
          status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create task');
      }

      setTasks((prev) => [data as SpacesTask, ...prev]);
      setTitle('');
      setAssigneeId('');
      setDueDate('');
      setPriority('medium');
      setStatus('todo');
      setSelectedProjectId('');
    } catch (e: any) {
      setError(e?.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const visibleTasks = useMemo(() => {
    if (mode !== 'employee') return tasks;
    if (!me.id) return [];
    return tasks.filter(
      (t) => t.assigneeId === me.id || (!t.assigneeId && t.createdByEmpId === me.id),
    );
  }, [tasks, mode, me.id]);

  const sortedTasks = useMemo(() => {
    if (visibleTasks.length === 0) return visibleTasks;
    const copy = [...visibleTasks];
    const managerRoles = new Set<BackendRole>(['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD']);
    copy.sort((a, b) => {
      if (mode === 'employee') {
        const aManager = managerRoles.has((a.createdByRole || '').toUpperCase());
        const bManager = managerRoles.has((b.createdByRole || '').toUpperCase());
        if (aManager !== bManager) return aManager ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return copy;
  }, [visibleTasks, mode]);

  const getTaskHighlightClass = (t: SpacesTask): string => {
    const creatorRole = normalizeRole(t.createdByRole);
    const viewerRole = normalizeRole(me.role);
    const isSelf = t.createdByEmpId && t.createdByEmpId === me.id;

    if (isSelf) return '';

    if (mode === 'employee') {
      // Employee: admin- and team-lead-created tasks are highlighted
      if (
        creatorRole === 'ADMIN' ||
        creatorRole === 'SUPER_ADMIN' ||
        creatorRole === 'TEAM_LEAD'
      ) {
        return 'bg-emerald-50';
      }
      return '';
    }

    if (mode === 'manager' && viewerRole === 'TEAM_LEAD') {
      // Team lead: admin-created tasks are highlighted
      if (creatorRole === 'ADMIN' || creatorRole === 'SUPER_ADMIN') {
        return 'bg-emerald-50';
      }
    }

    return '';
  };

  const getTaskRowClasses = (t: SpacesTask): string => {
    const highlight = getTaskHighlightClass(t);
    const base = 'border-b border-slate-100';
    if (highlight) {
      return `${base} ${highlight} hover:bg-emerald-100`;
    }
    return `${base} hover:bg-slate-50/50`;
  };

  const canEditTask = (t: SpacesTask): boolean => {
    const role = (me.role || '').toUpperCase() as BackendRole;
    if (mode === 'employee') {
      return t.createdByEmpId === me.id;
    }
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      // Admins can edit all tasks in the group
      return true;
    }
    if (role === 'TEAM_LEAD') {
      // Team leads can edit tasks created by team leads or employees
      const createdRole = (t.createdByRole || '').toUpperCase();
      return createdRole === 'TEAM_LEAD' || createdRole === 'EMPLOYEE';
    }
    return false;
  };

  const activeCommentTask = useMemo(
    () => sortedTasks.find((t) => t.taskId === commentTaskId) || null,
    [sortedTasks, commentTaskId],
  );

  const handleAddComment = async () => {
    if (!activeCommentTask) return;
    const text = commentDraft.trim();
    if (!text) return;
    setError(null);
    try {
      // If employee is viewing their portal, allow status change together with comment
      if (mode === 'employee' && modalStatus && modalStatus !== activeCommentTask.status) {
        await patchTask(activeCommentTask.taskId, { status: modalStatus });
      }

      const res = await fetch(`${API_BASE}/spaces/tasks/${activeCommentTask.taskId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add comment');
      }
      setTasks((prev) =>
        prev.map((t) =>
          t.taskId === activeCommentTask.taskId
            ? { ...t, comments: Array.isArray(data.comments) ? data.comments : [] }
            : t,
        ),
      );
      setCommentDraft('');
    } catch (e: any) {
      setError(e?.message || 'Failed to add comment');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1.5 w-8 bg-brand-red rounded-full" />
            <span className="text-[15px] text-slate-500">Spaces</span>
          </div>
          <h2 className="text-4xl text-slate-900 leading-none">Spaces</h2>
          <p className="text-slate-500 text-lg mt-3">
            Tasks table with project/no-project support.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSpaces}
          disabled={spacesLoading}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 ${
            spacesLoading ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          title="Refresh"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-[15px]">
          {error}
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Task *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              placeholder="Task name"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
              disabled={employeesLoading}
            >
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e.empId} value={e.empId}>
                  {e.empName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
            >
              <option value="todo">To Do</option>
              <option value="doing">Doing</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
              disabled={projectsLoading}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !title.trim()}
              className={`inline-flex items-center gap-2 px-8 py-3 rounded-full bg-brand-red text-white text-[15px] font-black shadow-lg hover:bg-brand-navy transition-colors ${
                saving || !title.trim() ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <Plus size={18} />
              {saving ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[12px] font-bold text-slate-600 uppercase tracking-[0.12em]">
                <th className="px-4 py-3 min-w-[220px]">Name</th>
                <th className="px-4 py-3 min-w-[180px]">Assignee</th>
                <th className="px-4 py-3 min-w-[140px]">Due date</th>
                <th className="px-4 py-3 min-w-[140px]">Priority</th>
                <th className="px-4 py-3 min-w-[140px]">Status</th>
                <th className="px-4 py-3 min-w-[120px]">Comments</th>
                {columns.map((c) => (
                  <th key={c.id} className="px-4 py-3 min-w-[200px]">
                    <div className="flex items-center justify-between gap-2">
                      {isRenamingColumnId === c.id ? (
                        <input
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={async () => {
                            const next = renameDraft.trim();
                            setIsRenamingColumnId(null);
                            setActiveColumnMenuId(null);
                            if (!next || next === c.name) return;
                            try {
                              const updatedTasks = sortedTasks.map((t) => ({
                                ...t,
                              }));
                              const res = await fetch(`${API_BASE}/spaces/columns`, {
                                method: 'POST',
                                headers: getAuthHeaders(),
                                body: JSON.stringify({ name: next }),
                              });
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                throw new Error(data.message || 'Failed to rename field');
                              }
                              setColumns(Array.isArray(data.columns) ? data.columns : []);
                            } catch (e: any) {
                              setError(e?.message || 'Failed to rename field');
                            }
                          }}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-2 py-1 text-[12px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                          autoFocus
                        />
                      ) : (
                        <span>{c.name}</span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveColumnMenuId((prev) => (prev === c.id ? null : c.id))
                        }
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-100"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                    {activeColumnMenuId === c.id && (
                      <div className="relative">
                        <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-10">
                          <button
                            type="button"
                            onClick={() => {
                              setIsRenamingColumnId(c.id);
                              setRenameDraft(c.name);
                            }}
                            className="w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setColumnToDelete(c);
                              setActiveColumnMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </th>
                ))}
                <th className="px-3 py-3 w-[56px] text-right">
                  <button
                    type="button"
                    onClick={handleAddColumn}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    title="Add new field"
                  >
                    <Plus size={18} />
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {spacesLoading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7 + columns.length}>
                    Loading...
                  </td>
                </tr>
              ) : sortedTasks.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-slate-500" colSpan={7 + columns.length}>
                    No tasks yet.
                  </td>
                </tr>
              ) : (
                sortedTasks.map((t) => {
                  const canEdit = canEditTask(t);
                  return (
                  <tr key={t.taskId} className={getTaskRowClasses(t)}>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={t.title}
                        onBlur={(e) => {
                          if (!canEdit) return;
                          const next = e.target.value.trim();
                          if (next && next !== t.title) patchTask(t.taskId, { title: next });
                        }}
                        disabled={!canEdit}
                        className="w-full bg-transparent border-none outline-none text-[14px] text-slate-900 font-medium disabled:text-slate-500"
                      />
                      <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                        {t.projectId ? (
                          <div>
                            Project: {projectNameById.get(t.projectId) || t.projectId}
                          </div>
                        ) : null}
                        {((mode === 'manager') ||
                          (mode === 'employee' && t.createdByEmpId !== me.id)) &&
                          (t.createdByName || t.createdByEmpId) ? (
                          <div>
                            Created by: {t.createdByName || t.createdByEmpId}
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={t.assigneeId || ''}
                        onChange={(e) => canEdit && patchTask(t.taskId, { assigneeId: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                        disabled={employeesLoading || !canEdit}
                      >
                        <option value="">Unassigned</option>
                        {employees.map((e) => (
                          <option key={e.empId} value={e.empId}>
                            {e.empName}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={t.dueDate || ''}
                        onChange={(e) => canEdit && patchTask(t.taskId, { dueDate: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                        disabled={!canEdit}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={t.priority}
                        onChange={(e) => canEdit && patchTask(t.taskId, { priority: e.target.value as TaskPriority })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                        disabled={!canEdit}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={t.status}
                        onChange={(e) => canEdit && patchTask(t.taskId, { status: e.target.value as TaskStatus })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                        disabled={!canEdit}
                      >
                        <option value="todo">To Do</option>
                        <option value="doing">Doing</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setCommentTaskId(t.taskId);
                          setModalStatus(t.status);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        title="View comments"
                      >
                        <MessageSquareText size={16} />
                        <span className="text-[12px] font-semibold">{t.comments?.length || 0}</span>
                      </button>
                    </td>

                    {columns.map((c) => (
                      <td key={c.id} className="px-4 py-3">
                        <input
                          defaultValue={t.customFields?.[c.id] || ''}
                          onBlur={(e) => {
                            if (!canEdit) return;
                            const next = e.target.value;
                            const prevVal = t.customFields?.[c.id] || '';
                            if (next === prevVal) return;
                            const nextCustom = { ...(t.customFields || {}), [c.id]: next };
                            patchTask(t.taskId, { customFields: nextCustom });
                          }}
                          disabled={!canEdit}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red disabled:bg-slate-50 disabled:text-slate-500"
                          placeholder="—"
                        />
                      </td>
                    ))}

                    <td className="px-3 py-3 text-right">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setDeleteTaskModal(t)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-100 text-red-500 hover:bg-red-50 text-[18px]"
                          title="Delete task"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeCommentTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => {
            setCommentTaskId(null);
            setCommentDraft('');
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[13px] text-slate-500">Comments</div>
                <div className="text-lg font-bold text-slate-900">{activeCommentTask.title}</div>
              </div>
              <button
                type="button"
                className="w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-50"
                onClick={() => {
                  setCommentTaskId(null);
                  setCommentDraft('');
                }}
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-3 overflow-auto max-h-[55vh]">
              {(activeCommentTask.comments || []).length === 0 ? (
                <div className="text-slate-500 text-sm">No comments yet.</div>
              ) : (
                activeCommentTask.comments
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((c) => {
                    const canEditComment = c.fromEmpId === me.id;
                    const isEditing = editingCommentId === c.id;
                    return (
                    <div key={c.id} className="border border-slate-200 rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-slate-700">
                            {c.fromName || c.fromEmpId || 'User'}
                          </span>
                          {c.editedAt && (
                            <span className="text-[10px] text-slate-400">(edited)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                          {canEditComment && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditCommentDraft(c.text);
                                }}
                                className="text-[11px] text-slate-500 hover:text-brand-red"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommentToDeleteId(c.id)}
                                className="text-[11px] text-red-500 hover:text-red-600"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="mt-1 space-y-2">
                          <textarea
                            value={editCommentDraft}
                            onChange={(e) => setEditCommentDraft(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditCommentDraft('');
                              }}
                              className="px-3 py-1.5 rounded-full border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={!editCommentDraft.trim()}
                              onClick={async () => {
                                const text = editCommentDraft.trim();
                                if (!text || !activeCommentTask) return;
                                try {
                                  const res = await fetch(
                                    `${API_BASE}/spaces/tasks/${activeCommentTask.taskId}/comments/${c.id}`,
                                    {
                                      method: 'PATCH',
                                      headers: getAuthHeaders(),
                                      body: JSON.stringify({ text }),
                                    },
                                  );
                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok) {
                                    throw new Error(data.message || 'Failed to update comment');
                                  }
                                  setTasks((prev) =>
                                    prev.map((t) =>
                                      t.taskId === activeCommentTask.taskId
                                        ? {
                                            ...t,
                                            comments: Array.isArray(data.comments)
                                              ? data.comments
                                              : [],
                                          }
                                        : t,
                                    ),
                                  );
                                  setEditingCommentId(null);
                                  setEditCommentDraft('');
                                } catch (e: any) {
                                  setError(e?.message || 'Failed to update comment');
                                }
                              }}
                              className={`px-4 py-1.5 rounded-full bg-brand-red text-white text-[12px] font-semibold hover:bg-brand-navy ${
                                !editCommentDraft.trim() ? 'opacity-60 cursor-not-allowed' : ''
                              }`}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[13px] text-slate-800 whitespace-pre-wrap">
                          {c.text}
                        </div>
                      )}
                    </div>
                  )})
              )}
            </div>

            <div className="p-6 border-t border-slate-100 space-y-3">
              {mode === 'employee' && (
                <div className="flex items-center gap-3">
                  <label className="text-[13px] font-semibold text-slate-700">
                    Status
                    <select
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value as TaskStatus)}
                      className="ml-2 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                    >
                      <option value="todo">To Do</option>
                      <option value="doing">Doing</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </label>
                </div>
              )}
              <div className="flex gap-3">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                  placeholder="Add a comment or task update..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddComment();
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!commentDraft.trim()}
                  className={`px-6 py-3 rounded-2xl bg-brand-red text-white font-bold hover:bg-brand-navy transition-colors ${
                    !commentDraft.trim() ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete column modal */}
      {columnToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove field</h3>
            <p className="text-[14px] text-slate-600 mb-6">
              Are you sure you want to remove &quot;{columnToDelete.name}&quot; from all tasks?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setColumnToDelete(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!columnToDelete) return;
                  try {
                    const res = await fetch(
                      `${API_BASE}/spaces/columns/${columnToDelete.id}`,
                      {
                        method: 'DELETE',
                        headers: getAuthHeaders(),
                      },
                    );
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      throw new Error(data.message || 'Failed to remove field');
                    }
                    setColumns(Array.isArray(data.columns) ? data.columns : []);
                    const newTasks = sortedTasks.map((t) => {
                      const { [columnToDelete.id]: _omit, ...rest } = t.customFields || {};
                      return { ...t, customFields: rest };
                    });
                    setTasks(newTasks);
                  } catch (e: any) {
                    setError(e?.message || 'Failed to remove field');
                  } finally {
                    setColumnToDelete(null);
                  }
                }}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete comment modal */}
      {activeCommentTask && commentToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete comment</h3>
            <p className="text-[14px] text-slate-600 mb-6">
              Are you sure you want to delete this comment?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCommentToDeleteId(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!activeCommentTask || !commentToDeleteId) return;
                  try {
                    const res = await fetch(
                      `${API_BASE}/spaces/tasks/${activeCommentTask.taskId}/comments/${commentToDeleteId}`,
                      {
                        method: 'DELETE',
                        headers: getAuthHeaders(),
                      },
                    );
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      throw new Error(data.message || 'Failed to delete comment');
                    }
                    setTasks((prev) =>
                      prev.map((t) =>
                        t.taskId === activeCommentTask.taskId
                          ? { ...t, comments: Array.isArray(data.comments) ? data.comments : [] }
                          : t,
                      ),
                    );
                  } catch (e: any) {
                    setError(e?.message || 'Failed to delete comment');
                  } finally {
                    setCommentToDeleteId(null);
                  }
                }}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete task modal */}
      {deleteTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete task</h3>
            <p className="text-[14px] text-slate-600 mb-6">
              Are you sure you want to delete &quot;{deleteTaskModal.title}&quot;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTaskModal(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/spaces/tasks/${deleteTaskModal.taskId}`, {
                      method: 'DELETE',
                      headers: getAuthHeaders(),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      throw new Error(data.message || 'Failed to delete task');
                    }
                    setTasks((prev) => prev.filter((x) => x.taskId !== deleteTaskModal.taskId));
                  } catch (e: any) {
                    setError(e?.message || 'Failed to delete task');
                  } finally {
                    setDeleteTaskModal(null);
                  }
                }}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpacesView;

