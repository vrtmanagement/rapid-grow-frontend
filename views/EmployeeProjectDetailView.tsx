import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_BASE, getAuthHeaders } from '../config/api';
import { SendHorizonal } from 'lucide-react';

const EmployeeProjectDetailView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentEmpId, setCurrentEmpId] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftMessages, setDraftMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    // Read logged-in employee from localStorage so we know which tasks are editable
    try {
      const stored = localStorage.getItem('rapidgrow-admin');
      if (stored) {
        const parsed = JSON.parse(stored);
        const emp = parsed.employee || {};
        setCurrentEmpId(emp.empId || emp._id || null);
      }
    } catch {
      setCurrentEmpId(null);
    }
  }, []);

  useEffect(() => {
    if (!projectId) return;
    const fetchProject = async () => {
      try {
        const res = await fetch(`${API_BASE}/project-charters/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch (e) {
        console.error('Failed to fetch project charter', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-500">
        Loading project...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto py-16 space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-red">
          Back to dashboard
        </Link>
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Project not found</h2>
          <p className="text-slate-500">We could not find details for this project.</p>
        </div>
      </div>
    );
  }

  const Section = ({ title, content }: { title: string; content?: string }) =>
    content ? (
      <div>
        <h4 className="text-lg font-semibold text-slate-900 mb-2">{title}</h4>
        <div className="p-4 bg-slate-50 rounded-xl text-slate-700 whitespace-pre-wrap">{content}</div>
      </div>
    ) : null;

  const proj = project as any;

  const handleTaskChange = async (taskId: string, updates: Partial<any>) => {
    if (!project || !projectId) return;
    const projAny = project as any;
    const tasks: any[] = Array.isArray(projAny.tasks) ? projAny.tasks : [];
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t
    );

    const updatedProject = { ...projAny, tasks: updatedTasks };
    setProject(updatedProject);
    setSavingTaskId(taskId);
    setSaveError(null);

    try {
      const body = {
        id: projAny.clientProjectId,
        name: projAny.name,
        status: projAny.status,
        dateCreated: projAny.dateCreated,
        businessCase: projAny.businessCase,
        problemStatement: projAny.problemStatement,
        goalStatement: projAny.goalStatement,
        inScope: projAny.inScope,
        outOfScope: projAny.outOfScope,
        benefits: projAny.benefits,
        champion: projAny.champion,
        championRole: projAny.championRole,
        lead: projAny.lead,
        leadRole: projAny.leadRole,
        smeList: projAny.smeList || [],
        projectTeam: projAny.projectTeam || [],
        phases: projAny.phases || {},
        tasks: updatedTasks,
      };

      const res = await fetch(`${API_BASE}/project-charters`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update task');
      }
    } catch (e: any) {
      console.error('Failed to update task from employee view', e);
      setSaveError(e?.message || 'Failed to update task');
    } finally {
      setSavingTaskId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-red">
        Back to dashboard
      </Link>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10 space-y-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{proj.name}</h1>
            {proj.dateCreated && (
              <p className="text-sm text-slate-500">
                Created on {new Date(proj.dateCreated as string).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
          <span className="px-4 py-2 bg-slate-100 text-slate-700 text-[13px] font-semibold rounded-full h-fit">
            {(proj.status as string) || 'draft'}
          </span>
        </div>

        <div className="space-y-6">
          <Section title="Business Case" content={proj.businessCase} />
          <Section title="Problem / Opportunity Statement" content={proj.problemStatement} />
          <Section title="Goal / Objective / Key Results" content={proj.goalStatement} />
          <Section title="In Scope" content={proj.inScope} />
          <Section title="Out of Scope" content={proj.outOfScope} />
          <Section title="Benefits / Revenue" content={proj.benefits} />

          <div>
            <h4 className="text-lg font-semibold text-slate-900 mb-3">Project Team</h4>
            <div className="space-y-3">
              <div className="flex gap-4 p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 min-w-[120px]">Champion</span>
                <span className="font-medium">{proj.champion || '—'} {proj.championRole && `(${proj.championRole})`}</span>
              </div>
              <div className="flex gap-4 p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 min-w-[120px]">Lead</span>
                <span className="font-medium">{proj.lead || '—'} {proj.leadRole && `(${proj.leadRole})`}</span>
              </div>
              {(proj.projectTeam || []).map((m: { name?: string; role?: string }, i: number) => (
                <div key={i} className="flex gap-4 p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 min-w-[120px]">Team Member</span>
                  <span className="font-medium">{m.name} {m.role && `(${m.role})`}</span>
                </div>
              ))}
            </div>
          </div>

          {proj.phases && Object.keys(proj.phases).length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-slate-900 mb-3">Project Phases</h4>
              <div className="space-y-2">
                {Object.entries(proj.phases as Record<string, string>)
                  .filter(([_, v]) => v)
                  .sort(([a], [b]) => {
                    const ma = a.match(/phase(\d+)/);
                    const mb = b.match(/phase(\d+)/);
                    const na = ma ? parseInt(ma[1], 10) : Number.MAX_SAFE_INTEGER;
                    const nb = mb ? parseInt(mb[1], 10) : Number.MAX_SAFE_INTEGER;
                    return na - nb;
                  })
                  .map(([key, value], idx) => (
                    <div key={key} className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-500 font-medium">
                        Phase {idx + 1}:
                      </span>{' '}
                      <span className="text-slate-900">{value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {Array.isArray(proj.tasks) && proj.tasks.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-slate-900 mb-3">Tasks</h4>
              <div className="space-y-3">
                {(proj.tasks as any[]).map((t, idx) => {
                  const isAssignedToMe =
                    currentEmpId && t.assigneeId && t.assigneeId === currentEmpId;
                  const taskMessages: any[] = Array.isArray(t.messages) ? t.messages : [];
                  const sortedMessages = [...taskMessages].sort(
                    (a, b) =>
                      new Date(b.createdAt || '').getTime() -
                      new Date(a.createdAt || '').getTime()
                  );
                  const draftText = draftMessages[t.id] ?? '';

                  if (isAssignedToMe) {
                    return (
                      <div
                        key={t.id || idx}
                        className="p-4 bg-slate-50 rounded-xl flex flex-col gap-3 border border-slate-100"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">
                            {t.title}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                            {t.assigneeId && <span>Assignee: {t.assigneeId}</span>}
                            {t.dueDate && <span>Due: {t.dueDate}</span>}
                            {t.priority && <span>Priority: {t.priority}</span>}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] text-slate-500 uppercase tracking-[0.15em]">
                                Project notes / conflicts
                              </label>
                              <textarea
                                value={draftText}
                                onChange={e =>
                                  setDraftMessages(prev => ({
                                    ...prev,
                                    [t.id]: e.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red min-h-[60px]"
                                placeholder="Add context, blockers, or conflicts here..."
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-[11px] text-slate-500 uppercase tracking-[0.15em]">
                                  Status
                                </label>
                                <select
                                  value={t.status || 'todo'}
                                  onChange={e =>
                                    setProject(prev => {
                                      if (!prev) return prev;
                                      const copy: any = { ...(prev as any) };
                                      copy.tasks = (copy.tasks || []).map((task: any) =>
                                        task.id === t.id ? { ...task, status: e.target.value } : task
                                      );
                                      return copy;
                                    })
                                  }
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                                >
                                  <option value="todo">To Do</option>
                                  <option value="doing">In Process</option>
                                  <option value="review">In Review</option>
                                  <option value="done">Done</option>
                                  <option value="blocked">Conflict / Blocked</option>
                                </select>
                              </div>
                              {t.status &&
                                !['todo', 'doing', 'review', 'done', 'blocked'].includes(t.status) && (
                                  <span className="text-xs text-slate-500">
                                    Current status: {t.status}
                                  </span>
                                )}
                              <button
                                type="button"
                                onClick={() => {
                                  const text = draftText.trim();
                                  if (!text) return;
                                  const existingMessages: any[] = Array.isArray(t.messages)
                                    ? t.messages
                                    : [];
                                  const newMessage = {
                                    id: `m-${Date.now()}`,
                                    text,
                                    from: currentEmpId || 'employee',
                                    status: t.status || 'todo',
                                    createdAt: new Date().toISOString(),
                                  };
                                  handleTaskChange(t.id, {
                                    status: t.status || 'todo',
                                    messages: [...existingMessages, newMessage],
                                  });
                                  setDraftMessages(prev => ({
                                    ...prev,
                                    [t.id]: '',
                                  }));
                                }}
                                disabled={!!savingTaskId || !draftText.trim()}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-red text-white hover:bg-brand-navy disabled:opacity-60 disabled:cursor-not-allowed"
                                title="Send update"
                              >
                                {savingTaskId === t.id ? (
                                  <span className="text-[9px] font-semibold">...</span>
                                ) : (
                                  <SendHorizonal size={14} />
                                )}
                              </button>
                            </div>
                          </div>

                          {sortedMessages.length > 0 && (
                            <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                              {sortedMessages.map((m, i) => (
                                <div
                                  key={m.id || i}
                                  className="flex items-start justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-medium text-slate-800">
                                        {m.from || 'Employee'}
                                      </span>
                                      {m.status && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
                                          {m.status}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-slate-700 whitespace-pre-wrap">
                                      {m.text}
                                    </div>
                                  </div>
                                  {m.createdAt && (
                                    <div className="text-[10px] text-slate-400 whitespace-nowrap">
                                      {new Date(m.createdAt).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={t.id || idx}
                      className="p-4 bg-slate-50 rounded-xl flex flex-col gap-3 border border-slate-100"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-900">
                          {t.title}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                          {t.assigneeId && <span>Assignee: {t.assigneeId}</span>}
                          {t.dueDate && <span>Due: {t.dueDate}</span>}
                          {t.priority && <span>Priority: {t.priority}</span>}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 text-xs text-slate-600">
                        {sortedMessages.length > 0 ? (
                          <div className="space-y-1">
                            {sortedMessages.map((m, i) => (
                              <div
                                key={m.id || i}
                                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                              >
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-800">
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
                                <div className="text-slate-700 whitespace-pre-wrap">
                                  {m.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {saveError && (
                  <p className="text-xs text-red-600 mt-1">{saveError}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProjectDetailView;
