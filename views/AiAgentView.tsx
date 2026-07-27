import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import AccessDenied from '../components/AccessDenied';
import PageSectionSubnav from '../components/layout/PageSectionSubnav';
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
import SpacesCreateTaskButton from '../components/spaces/SpacesCreateTaskButton';
import AiAgentTabPanels from '../components/aiAgent/AiAgentTabPanels';

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
  const navigate = useNavigate();
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
  const [hourlyRate, setHourlyRate] = useState('75');
  const [estimateCurrency, setEstimateCurrency] = useState('USD');
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
      const res = await fetch(`${API_BASE}/project-charters?summary=1`, { headers: getAuthHeaders() });
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
      const parsedRate = Number(hourlyRate);
      const data = await generateProjectPlan({
        text: meetingText.trim(),
        file: file || undefined,
        hourlyRate: Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : undefined,
        currency: estimateCurrency.trim() || undefined,
      });
      setProjectPlan(data.plan);
      setTasks(data.plan.tasks || []);
      setActiveTab('project');
      const est = data.plan.estimate;
      showToast(
        'success',
        est
          ? `${data.plan.projectName}: ~${est.estimatedDays} days, ${est.peopleNeeded} people, ${est.currency} ${est.totalPrice.toLocaleString()}`
          : `Project plan: ${data.plan.projectName}`,
      );
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
    <div className="-mx-16 -mb-16 mt-0 min-h-full overflow-x-hidden space-y-6 px-6 pb-8 pt-0 animate-in fade-in duration-700">
      <PageSectionSubnav
        outerClassName="px-6 sm:px-10 lg:px-14"
        innerClassName="gap-2 py-1.5 lg:min-h-[50px] lg:gap-3.5"
        leading={
          <>
            <div className="h-1.5 w-8 rounded-full bg-brand-red" />
            <span className="text-[14px] font-medium text-slate-900">Task Hub</span>
          </>
        }
        center={
          <>
            <button
              type="button"
              onClick={() => navigate('/spaces')}
              className="border-b-2 border-transparent px-1 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 transition-colors hover:text-slate-900"
            >
              Overview
            </button>
            <button
              type="button"
              className="border-b-2 border-brand-red px-1 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-900"
            >
              AI Agent
            </button>
          </>
        }
        trailing={
          <SpacesCreateTaskButton onClick={() => navigate('/spaces', { state: { openCreateTask: true } })} />
        }
      />
      <div className="mx-auto max-w-6xl space-y-6 px-6 sm:px-10 lg:px-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">AI Agent</h1>
            <p className="mt-1 text-sm text-slate-600">
              Extract tasks from notes, generate project plans with time and cost estimates from documents,
              assign intelligently, and manage delays.
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

      <AiAgentTabPanels
        ctx={{
          activeTab,
          setActiveTab,
          meetingText,
          setMeetingText,
          file,
          setFile,
          tasks,
          assignments,
          setAssignments,
          employees,
          projects,
          selectedProjectId,
          setSelectedProjectId,
          taskHubCount,
          selectedEmpId,
          setSelectedEmpId,
          performance,
          summary,
          followUps,
          followUpEmailStatus,
          selectedFollowUpIds,
          setSelectedFollowUpIds,
          requireApproval,
          setRequireApproval,
          pendingApprovals,
          selectedApprovalIds,
          setSelectedApprovalIds,
          capacity,
          projectPlan,
          hourlyRate,
          setHourlyRate,
          estimateCurrency,
          setEstimateCurrency,
          loading,
          runExtract,
          runAssign,
          runApproveSelected,
          runRejectSelected,
          loadCapacity,
          runProjectPlan,
          loadSummary,
          loadFollowUps,
          sendOneFollowUpEmail,
          sendSelectedFollowUpEmails,
          loadPerformance,
          runOneClickWorkflow,
          runWeeklyStandupEmail,
          loadPendingApprovals,
          updateTask,
        }}
      />
      {toast && <Toast type={toast.type} message={toast.message} />}
      </div>
    </div>
  );
};

export default AiAgentView;
