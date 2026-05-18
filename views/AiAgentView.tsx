import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, ExternalLink, FileUp, Loader2, Sparkles, Users } from 'lucide-react';
import AccessDenied from '../components/AccessDenied';
import Toast from '../components/ui/Toast';
import { usePermissions } from '../context/usePermissions';
import { API_BASE, getAuthHeaders } from '../config/api';
import {
  approveTasks,
  assignTasks,
  extractTasksFromFile,
  extractTasksFromText,
  generateProjectPlan,
  getCapacityPlanning,
  getDelayFollowUps,
  sendFollowUpEmailsBatch,
  sendSingleFollowUpEmail,
  type DelayFollowUp,
  getEmployeePerformance,
  getManagerSummary,
  getPendingApprovals,
  rejectTasks,
  runWorkflow,
  sendWeeklyStandup,
  type ExtractedTask,
  type PendingApprovalTask,
  type ProjectPlan,
  type TaskAssignment,
} from '../services/aiAgentApi';

type TabId = 'extract' | 'approval' | 'capacity' | 'project' | 'summary' | 'followups' | 'performance';

interface EmployeeOption {
  empId: string;
  empName: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

const AiAgentView: React.FC = () => {
  const { hasPermission } = usePermissions();
  const canUse = hasPermission('SPACES_VIEW');

  const [activeTab, setActiveTab] = useState<TabId>('extract');
  const [meetingText, setMeetingText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [taskHubCount, setTaskHubCount] = useState(0);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [performance, setPerformance] = useState<Record<string, unknown> | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [followUps, setFollowUps] = useState<{
    followUps?: DelayFollowUp[];
    delayedCount?: number;
  } | null>(null);
  const [followUpEmailStatus, setFollowUpEmailStatus] = useState<
    Record<string, 'idle' | 'sending' | 'sent' | 'failed'>
  >({});
  const [selectedFollowUpIds, setSelectedFollowUpIds] = useState<string[]>([]);
  const [requireApproval, setRequireApproval] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalTask[]>([]);
  const [selectedApprovalIds, setSelectedApprovalIds] = useState<string[]>([]);
  const [capacity, setCapacity] = useState<Record<string, unknown> | null>(null);
  const [projectPlan, setProjectPlan] = useState<ProjectPlan | null>(null);
  const [loading, setLoading] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message: String(message || '').trim() || (type === 'success' ? 'Done.' : 'Something went wrong.') });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const rows = (await res.json()) as EmployeeOption[];
      setEmployees(
        (Array.isArray(rows) ? rows : [])
          .map((row) => ({ empId: row.empId, empName: row.empName }))
          .filter((row) => row.empId),
      );
    } catch {
      // Non-blocking for main flows
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/project-charters`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const rows = await res.json().catch(() => []);
      setProjects(
        (Array.isArray(rows) ? rows : [])
          .map((row: { clientProjectId?: string; id?: string; name?: string; projectName?: string }) => ({
            id: String(row.clientProjectId || row.id || '').trim(),
            name: String(row.name || row.projectName || 'Untitled project').trim(),
          }))
          .filter((row) => row.id),
      );
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    if (canUse) {
      void loadEmployees();
      void loadProjects();
    }
  }, [canUse, loadEmployees, loadProjects]);

  const runExtract = async () => {
    setAssignments([]);
    if (!meetingText.trim() && !file) {
      showToast('error', 'Paste meeting notes or choose a document.');
      return;
    }
    setLoading('extract');
    try {
      const result = file
        ? await extractTasksFromFile(file)
        : await extractTasksFromText(meetingText.trim());
      setTasks(result.tasks || []);
      showToast('success', `Extracted ${result.count ?? result.tasks?.length ?? 0} task(s).`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Extraction failed.');
    } finally {
      setLoading('');
    }
  };

  const runAssign = async () => {
    if (!tasks.length) {
      showToast('error', 'Extract tasks first.');
      return;
    }
    setLoading('assign');
    try {
      const result = await assignTasks(tasks, {
        persist: true,
        sourceText: meetingText,
        projectId: selectedProjectId,
        requireApproval,
        notify: true,
      });
      setAssignments(result.assignments || []);
      const synced = result.taskHubTasks?.length ?? 0;
      setTaskHubCount(synced);
      if (!synced) {
        showToast(
          'error',
          'Tasks were assigned by AI but did not sync to TaskHub. Ensure user-service is running and USER_SERVICE_URL is set on ai-agent-service.',
        );
      } else {
        showToast(
          'success',
          result.message ||
            `Assigned ${result.assignments?.length ?? 0} task(s). ${synced} synced to TaskHub.`,
        );
      }
      if (result.taskHubTasks?.length) {
        window.dispatchEvent(
          new CustomEvent('rapidgrow:ai-tasks-created', { detail: result.taskHubTasks }),
        );
      }
      window.dispatchEvent(new CustomEvent('rapidgrow:spaces-refresh'));
      window.dispatchEvent(new CustomEvent('rapidgrow:performance-refresh'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Assignment failed.');
    } finally {
      setLoading('');
    }
  };

  const loadSummary = async (period: 'daily' | 'weekly') => {
    setLoading('summary');
    try {
      const data = await getManagerSummary(period);
      setSummary(data);
      setActiveTab('summary');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load summary.');
    } finally {
      setLoading('');
    }
  };

  const runOneClickWorkflow = async () => {
    if (!meetingText.trim() && !file) {
      showToast('error', 'Paste meeting notes or choose a document.');
      return;
    }
    setLoading('workflow');
    try {
      const result = (await runWorkflow({
        text: meetingText.trim(),
        file: file || undefined,
        projectId: selectedProjectId,
        requireApproval,
        notify: true,
      })) as {
        tasks?: ExtractedTask[];
        assignments?: TaskAssignment[];
        taskHubTasks?: Array<{ spacesTaskId: string }>;
        message?: string;
        requireApproval?: boolean;
      };
      setTasks(result.tasks || []);
      setAssignments(result.assignments || []);
      const synced = result.taskHubTasks?.length ?? 0;
      setTaskHubCount(synced);
      showToast('success', result.message || 'Extract → Assign → Notify completed.');
      if (synced) {
        window.dispatchEvent(new CustomEvent('rapidgrow:spaces-refresh'));
        window.dispatchEvent(new CustomEvent('rapidgrow:performance-refresh'));
      }
      if (result.requireApproval) void loadPendingApprovals();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Workflow failed.');
    } finally {
      setLoading('');
    }
  };

  const loadPendingApprovals = async () => {
    setLoading('approval');
    try {
      const data = await getPendingApprovals();
      setPendingApprovals(data.tasks || []);
      setSelectedApprovalIds((data.tasks || []).map((row) => row.id));
      setActiveTab('approval');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load approvals.');
    } finally {
      setLoading('');
    }
  };

  const runApproveSelected = async () => {
    if (!selectedApprovalIds.length) {
      showToast('error', 'Select tasks to approve.');
      return;
    }
    setLoading('approve');
    try {
      const result = await approveTasks(selectedApprovalIds, {
        projectId: selectedProjectId,
        notify: true,
      });
      showToast('success', String(result.message || 'Tasks approved.'));
      window.dispatchEvent(new CustomEvent('rapidgrow:spaces-refresh'));
      await loadPendingApprovals();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setLoading('');
    }
  };

  const runRejectSelected = async () => {
    if (!selectedApprovalIds.length) return;
    setLoading('reject');
    try {
      const result = await rejectTasks(selectedApprovalIds);
      showToast('success', String(result.message || 'Tasks rejected.'));
      await loadPendingApprovals();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setLoading('');
    }
  };

  const loadCapacity = async () => {
    setLoading('capacity');
    try {
      const data = await getCapacityPlanning(tasks);
      setCapacity(data as Record<string, unknown>);
      setActiveTab('capacity');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Capacity planning failed.');
    } finally {
      setLoading('');
    }
  };

  const runProjectPlan = async () => {
    if (!meetingText.trim() && !file) {
      showToast('error', 'Paste document text or upload a file.');
      return;
    }
    setLoading('project');
    try {
      const data = await generateProjectPlan({
        text: meetingText.trim(),
        file: file || undefined,
      });
      setProjectPlan(data.plan);
      setTasks(data.plan.tasks || []);
      setActiveTab('project');
      showToast('success', `Project plan: ${data.plan.projectName}`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Project plan generation failed.');
    } finally {
      setLoading('');
    }
  };

  const loadFollowUps = async () => {
    setLoading('followups');
    try {
      const data = await getDelayFollowUps();
      setFollowUps(data);
      setFollowUpEmailStatus({});
      setSelectedFollowUpIds((data.followUps || []).map((row) => row.taskId).filter(Boolean));
      setActiveTab('followups');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load follow-ups.');
    } finally {
      setLoading('');
    }
  };

  const sendOneFollowUpEmail = async (item: DelayFollowUp) => {
    const key = item.taskId || `${item.assigneeId}-${item.taskTitle}`;
    setFollowUpEmailStatus((prev) => ({ ...prev, [key]: 'sending' }));
    try {
      const result = await sendSingleFollowUpEmail(item);
      setFollowUpEmailStatus((prev) => ({ ...prev, [key]: 'sent' }));
      showToast('success', result.message || `Email sent to ${item.assigneeName || item.assigneeId}.`);
    } catch (err) {
      setFollowUpEmailStatus((prev) => ({ ...prev, [key]: 'failed' }));
      showToast('error', err instanceof Error ? err.message : 'Failed to send email.');
    }
  };

  const sendSelectedFollowUpEmails = async () => {
    const list = (followUps?.followUps || []).filter((row) =>
      selectedFollowUpIds.includes(row.taskId),
    );
    if (!list.length) {
      showToast('error', 'Select at least one follow-up to email.');
      return;
    }
    setLoading('followups-send');
    try {
      const result = await sendFollowUpEmailsBatch(list);
      const nextStatus = { ...followUpEmailStatus };
      for (const row of result.results || []) {
        const key = row.taskId || '';
        if (key) nextStatus[key] = row.sent ? 'sent' : 'failed';
      }
      setFollowUpEmailStatus(nextStatus);
      showToast('success', result.message || `${result.sent} email(s) sent individually.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to send emails.');
    } finally {
      setLoading('');
    }
  };

  const runWeeklyStandupEmail = async () => {
    setLoading('standup');
    try {
      const result = await sendWeeklyStandup('weekly');
      showToast('success', String(result.message || 'Weekly standup emailed with PDF.'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to send standup report.');
    } finally {
      setLoading('');
    }
  };

  const loadPerformance = async () => {
    if (!selectedEmpId) {
      showToast('error', 'Select an employee.');
      return;
    }
    setLoading('performance');
    try {
      const data = await getEmployeePerformance(selectedEmpId);
      setPerformance(data);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load performance.');
    } finally {
      setLoading('');
    }
  };

  const updateTask = (index: number, patch: Partial<ExtractedTask>) => {
    setTasks((prev) => prev.map((task, i) => (i === index ? { ...task, ...patch } : task)));
  };

  if (!canUse) {
    return <AccessDenied />;
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'extract', label: 'Extract & Assign' },
    { id: 'approval', label: 'Approvals' },
    { id: 'capacity', label: 'Capacity' },
    { id: 'project', label: 'Project Plan' },
    { id: 'summary', label: 'Manager Summary' },
    { id: 'followups', label: 'Delay Follow-ups' },
    { id: 'performance', label: 'Performance' },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">AI Agent</h1>
            <p className="mt-1 text-sm text-slate-600">
              Extract tasks from notes, assign intelligently, track performance, and manage delays.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-brand-red text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {activeTab === 'extract' && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <label className="block text-sm font-medium text-slate-800">Link to project (optional)</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="mb-4 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">No project — TaskHub only</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium text-slate-800">Meeting notes / text</label>
            <textarea
              value={meetingText}
              onChange={(e) => setMeetingText(e.target.value)}
              rows={6}
              placeholder="Paste standup notes, meeting minutes, or action items..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="rounded border-slate-300"
              />
              Require manager approval before TaskHub sync
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold"
              />
              <button
                type="button"
                onClick={runOneClickWorkflow}
                disabled={!!loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading === 'workflow' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Extract → Assign → Notify
              </button>
              <button
                type="button"
                onClick={runExtract}
                disabled={!!loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
              >
                {loading === 'extract' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Extract only
              </button>
              <button
                type="button"
                onClick={runAssign}
                disabled={!!loading || !tasks.length}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
              >
                {loading === 'assign' ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                Assign to team
              </button>
              <button
                type="button"
                onClick={loadCapacity}
                disabled={!!loading}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
              >
                Check capacity
              </button>
              <button
                type="button"
                onClick={runProjectPlan}
                disabled={!!loading}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
              >
                Document → project plan
              </button>
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
              <h2 className="text-lg font-semibold text-slate-900">Extracted tasks ({tasks.length})</h2>
              <table className="mt-4 w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Priority</th>
                    <th className="py-2 pr-3">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, index) => (
                    <tr key={`task-${index}`} className="border-b border-slate-50">
                      <td className="py-2 pr-3">
                        <input
                          value={task.title}
                          onChange={(e) => updateTask(index, { title: e.target.value })}
                          className="w-full rounded border border-slate-200 px-2 py-1"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={task.priority}
                          onChange={(e) =>
                            updateTask(index, { priority: e.target.value as ExtractedTask['priority'] })
                          }
                          className="rounded border border-slate-200 px-2 py-1"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          value={task.deadline}
                          onChange={(e) => updateTask(index, { deadline: e.target.value })}
                          placeholder="YYYY-MM-DD"
                          className="w-full rounded border border-slate-200 px-2 py-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {taskHubCount > 0 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-700">
                {taskHubCount} task(s) are now in TaskHub
                {selectedProjectId ? ' and linked to the selected project charter' : ''}.
                Progress and performance update automatically when statuses change.
              </p>
              <Link
                to="/spaces"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white"
              >
                Open TaskHub
                <ExternalLink size={14} />
              </Link>
            </div>
          )}

          {assignments.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Assignments</h2>
              <ul className="mt-3 space-y-3">
                {assignments.map((row, index) => (
                  <li key={`assign-${index}`} className="rounded-lg border border-emerald-100 bg-white p-3 text-sm">
                    <p className="font-medium text-slate-900">{row.taskTitle}</p>
                    <p className="text-slate-600">
                      → {row.assignedTo}
                      {row.employeeId ? ` (${row.employeeId})` : ''}
                    </p>
                    <p className="mt-1 text-slate-500">{row.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {activeTab === 'approval' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadPendingApprovals}
              disabled={!!loading}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800"
            >
              Refresh pending
            </button>
            <button
              type="button"
              onClick={runApproveSelected}
              disabled={!!loading || !selectedApprovalIds.length}
              className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Approve selected
            </button>
            <button
              type="button"
              onClick={runRejectSelected}
              disabled={!!loading || !selectedApprovalIds.length}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
            >
              Reject selected
            </button>
          </div>
          <ul className="space-y-3">
            {pendingApprovals.map((task) => (
              <li key={task.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedApprovalIds.includes(task.id)}
                    onChange={(e) => {
                      setSelectedApprovalIds((prev) =>
                        e.target.checked ? [...prev, task.id] : prev.filter((id) => id !== task.id),
                      );
                    }}
                  />
                  <span>
                    <span className="font-medium text-slate-900">{task.title}</span>
                    <span className="block text-slate-600">
                      → {task.assignedTo} ({task.assigneeEmpId})
                    </span>
                    <span className="block text-slate-500">{task.assignmentReason}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {!pendingApprovals.length && (
            <p className="text-sm text-slate-500">No tasks pending approval.</p>
          )}
        </div>
      )}

      {activeTab === 'capacity' && capacity && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-700 space-y-2">
          <p>
            Utilization: {String(capacity.utilizationPct)}% · Can absorb:{' '}
            {capacity.canAbsorb ? 'Yes' : 'No'}
          </p>
          <p>
            Available hours: {String(capacity.availableHours)} / {String(capacity.totalCapacityHours)}
          </p>
          {Array.isArray(capacity.recommendations) && (
            <ul className="list-disc pl-5">
              {(capacity.recommendations as string[]).map((line, i) => (
                <li key={`cap-${i}`}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'project' && projectPlan && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-sm">
          <h2 className="text-lg font-semibold text-slate-900">{projectPlan.projectName}</h2>
          <p className="text-slate-600">{projectPlan.description}</p>
          <p className="font-semibold">Milestones: {projectPlan.milestones?.length ?? 0}</p>
          <p className="font-semibold">Tasks: {projectPlan.tasks?.length ?? 0} (loaded into extract table)</p>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <p className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-sm text-slate-700">
            <span className="font-semibold">Automatic:</span> weekly PDF standup emails when ai-agent-service is
            running (default Mon 9:00 Asia/Kolkata).{' '}
            <span className="font-semibold">Manual:</span> &quot;Email weekly PDF standup&quot; sends immediately.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadSummary('daily')}
              disabled={!!loading}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800"
            >
              Daily summary
            </button>
            <button
              type="button"
              onClick={() => loadSummary('weekly')}
              disabled={!!loading}
              className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Weekly summary
            </button>
            <button
              type="button"
              onClick={runWeeklyStandupEmail}
              disabled={!!loading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
            >
              {loading === 'standup' ? 'Sending...' : 'Email weekly PDF standup'}
            </button>
          </div>
          {summary && (
            <div className="space-y-3 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Tasks:</span> {String(summary.totalTasks)} total,{' '}
                {String(summary.completedTasks)} done, {String(summary.delayedTasks)} delayed
              </p>
              <p className="whitespace-pre-wrap">{String(summary.summary || '')}</p>
              {Array.isArray(summary.risks) && summary.risks.length > 0 && (
                <div>
                  <p className="font-semibold text-amber-800">Risks</p>
                  <ul className="mt-1 list-disc pl-5">
                    {(summary.risks as string[]).map((risk, i) => (
                      <li key={`risk-${i}`}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(summary.recommendedActions) && summary.recommendedActions.length > 0 && (
                <div>
                  <p className="font-semibold text-emerald-800">Recommended actions</p>
                  <ul className="mt-1 list-disc pl-5">
                    {(summary.recommendedActions as string[]).map((action, i) => (
                      <li key={`action-${i}`}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'followups' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <p className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-sm text-slate-700">
            <span className="font-semibold">Automatic:</span> overdue follow-up emails on weekdays when ai-agent-service
            is running (default 10:00 Asia/Kolkata).{' '}
            <span className="font-semibold">Manual:</span> load list, then send per person or selected rows.
          </p>
          <button
            type="button"
            onClick={loadFollowUps}
            disabled={!!loading}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
          >
            {loading === 'followups' ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
            Load delay follow-ups
          </button>
          <p className="text-sm text-slate-600 w-full">
            Each assignee gets their own email. Use &quot;Send email to assignee&quot; on a row, or select several and
            click Send selected.
          </p>
          <button
            type="button"
            onClick={sendSelectedFollowUpEmails}
            disabled={!!loading || !selectedFollowUpIds.length}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading === 'followups-send' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileUp size={16} />
            )}
            Send selected ({selectedFollowUpIds.length})
          </button>
          {followUps && (
            <p className="text-sm text-slate-600">{followUps.delayedCount ?? 0} delayed task(s)</p>
          )}
          <ul className="space-y-3">
            {(followUps?.followUps || []).map((item) => {
              const key = item.taskId || `${item.assigneeId}-${item.taskTitle}`;
              const emailStatus = followUpEmailStatus[key] || 'idle';
              const canSend = !!item.assigneeId;

              return (
                <li key={key} className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <label className="flex items-start gap-2 flex-1 min-w-[200px]">
                      <input
                        type="checkbox"
                        checked={selectedFollowUpIds.includes(item.taskId)}
                        onChange={(e) => {
                          setSelectedFollowUpIds((prev) =>
                            e.target.checked
                              ? [...prev, item.taskId]
                              : prev.filter((id) => id !== item.taskId),
                          );
                        }}
                      />
                      <span>
                        <span className="font-medium text-slate-900">{item.taskTitle || 'Task'}</span>
                        <span className="block text-slate-600 mt-0.5">
                          Assignee: {item.assigneeName || item.assigneeId || 'Unassigned'}
                          {item.assigneeEmail ? ` · ${item.assigneeEmail}` : ''}
                          {item.delayDays ? ` · ${item.delayDays}d overdue` : ''}
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => sendOneFollowUpEmail(item)}
                      disabled={!canSend || emailStatus === 'sending' || !!loading}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 disabled:opacity-50 hover:bg-slate-100"
                    >
                      {emailStatus === 'sending'
                        ? 'Sending...'
                        : emailStatus === 'sent'
                          ? 'Email sent'
                          : emailStatus === 'failed'
                            ? 'Retry email'
                            : 'Send email to assignee'}
                    </button>
                  </div>
                  <p className="mt-2 text-slate-600">{item.message || ''}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-brand-red">
                    {item.recommendation || 'continue'}
                    {item.reason ? ` · ${item.reason}` : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.empId} value={emp.empId}>
                  {emp.empName} ({emp.empId})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadPerformance}
              disabled={!!loading}
              className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading === 'performance' ? 'Loading...' : 'View performance'}
            </button>
          </div>
          {performance && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">
                {String(performance.employeeName || '')} — score {String(performance.performanceScore)}/100
              </p>
              <p>
                Completed: {String(performance.completedTasks)} · Pending: {String(performance.pendingTasks)} ·
                Delayed: {String(performance.delayedTasks)} · Completion:{' '}
                {String(performance.completionPercentage)}%
              </p>
              <p className="whitespace-pre-wrap italic">{String(performance.insight || '')}</p>
            </div>
          )}
        </div>
      )}
      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
};

export default AiAgentView;
