import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../config/api';

export type ExtractedTask = {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  deadline: string;
  skillsNeeded: string[];
  estimatedHours: string;
};

export type TaskAssignment = {
  taskTitle: string;
  assignedTo: string;
  employeeId: string;
  reason: string;
};

export type ProjectPlan = {
  projectName: string;
  description: string;
  milestones: Array<{ name: string; dueDate?: string; description?: string }>;
  tasks: ExtractedTask[];
};

export type PendingApprovalTask = {
  id: string;
  title: string;
  description: string;
  priority: string;
  deadline: string;
  assignedTo: string;
  assigneeEmpId: string;
  assignmentReason: string;
};

async function parseError(res: Response, fallback: string) {
  try {
    const body = await res.json();
    throw new Error(body?.message || fallback);
  } catch (error) {
    if (error instanceof Error && error.message !== fallback) throw error;
    throw new Error(fallback);
  }
}

export async function extractTasksFromText(text: string) {
  const res = await fetch(`${API_BASE}/ai/extract-tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) await parseError(res, 'Failed to extract tasks');
  return res.json() as Promise<{ tasks: ExtractedTask[]; count: number }>;
}

export async function extractTasksFromFile(file: File) {
  const token = getStoredAuthSession()?.token;
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/ai/extract-tasks`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) await parseError(res, 'Failed to extract tasks from file');
  return res.json() as Promise<{ tasks: ExtractedTask[]; count: number }>;
}

export type TaskHubSyncedTask = {
  spacesTaskId: string;
  projectTaskId?: string;
  projectId?: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  status: string;
  priority: string;
  dueDate: string;
};

export async function assignTasks(
  tasks: ExtractedTask[],
  options?: {
    persist?: boolean;
    sourceText?: string;
    projectId?: string;
    requireApproval?: boolean;
    notify?: boolean;
  },
) {
  const persist = options?.persist !== false;
  const res = await fetch(`${API_BASE}/ai/assign-tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      tasks,
      persist,
      sourceText: options?.sourceText || '',
      projectId: options?.projectId || '',
      requireApproval: options?.requireApproval,
      notify: options?.notify,
    }),
  });
  if (!res.ok) await parseError(res, 'Failed to assign tasks');
  return res.json() as Promise<{
    assignments: TaskAssignment[];
    savedTasks: Array<{
      id: string;
      title: string;
      assigneeEmpId: string;
      status: string;
      approvalStatus?: string;
      spacesTaskId?: string;
    }>;
    taskHubTasks: TaskHubSyncedTask[];
    employeeCount: number;
    requireApproval?: boolean;
    message?: string;
  }>;
}

export async function runWorkflow(options: {
  text?: string;
  file?: File;
  projectId?: string;
  requireApproval?: boolean;
  notify?: boolean;
}) {
  const token = getStoredAuthSession()?.token;
  let res: Response;

  if (options.file) {
    const form = new FormData();
    form.append('file', options.file);
    if (options.text) form.append('text', options.text);
    if (options.projectId) form.append('projectId', options.projectId);
    form.append('requireApproval', String(options.requireApproval === true));
    form.append('notify', String(options.notify !== false));
    res = await fetch(`${API_BASE}/ai/workflow/run`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } else {
    res = await fetch(`${API_BASE}/ai/workflow/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text: options.text || '',
        projectId: options.projectId || '',
        requireApproval: options.requireApproval,
        notify: options.notify,
      }),
    });
  }

  if (!res.ok) await parseError(res, 'Workflow failed');
  return res.json();
}

export async function getPendingApprovals() {
  const res = await fetch(`${API_BASE}/ai/pending-approvals`, { headers: getAuthHeaders() });
  if (!res.ok) await parseError(res, 'Failed to load pending approvals');
  return res.json() as Promise<{ tasks: PendingApprovalTask[]; count: number }>;
}

export async function approveTasks(taskIds: string[], options?: { projectId?: string; notify?: boolean }) {
  const res = await fetch(`${API_BASE}/ai/approve-tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      taskIds,
      projectId: options?.projectId || '',
      notify: options?.notify,
    }),
  });
  if (!res.ok) await parseError(res, 'Failed to approve tasks');
  return res.json();
}

export async function rejectTasks(taskIds: string[]) {
  const res = await fetch(`${API_BASE}/ai/reject-tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ taskIds }),
  });
  if (!res.ok) await parseError(res, 'Failed to reject tasks');
  return res.json();
}

export async function getCapacityPlanning(tasks: ExtractedTask[] = []) {
  const res = await fetch(`${API_BASE}/ai/capacity-planning`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ tasks }),
  });
  if (!res.ok) await parseError(res, 'Failed to load capacity plan');
  return res.json();
}

export async function generateProjectPlan(options: { text?: string; file?: File }) {
  const token = getStoredAuthSession()?.token;
  let res: Response;

  if (options.file) {
    const form = new FormData();
    form.append('file', options.file);
    if (options.text) form.append('text', options.text);
    res = await fetch(`${API_BASE}/ai/generate-project-plan`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } else {
    res = await fetch(`${API_BASE}/ai/generate-project-plan`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text: options.text || '' }),
    });
  }

  if (!res.ok) await parseError(res, 'Failed to generate project plan');
  return res.json() as Promise<{ plan: ProjectPlan }>;
}

export async function sendWeeklyStandup(period: 'daily' | 'weekly' = 'weekly') {
  const res = await fetch(`${API_BASE}/ai/weekly-standup/send`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ period }),
  });
  if (!res.ok) await parseError(res, 'Failed to send standup report');
  return res.json();
}

export async function getEmployeePerformance(employeeId: string) {
  const res = await fetch(`${API_BASE}/ai/performance/${encodeURIComponent(employeeId)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) await parseError(res, 'Failed to load performance');
  return res.json();
}

export type DelayFollowUp = {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  assigneeName?: string;
  assigneeEmail?: string;
  message: string;
  recommendation: string;
  reason?: string;
  delayDays?: number;
  source?: string;
};

export async function getDelayFollowUps() {
  const res = await fetch(`${API_BASE}/ai/follow-up-delays`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) await parseError(res, 'Failed to load follow-ups');
  return res.json() as Promise<{
    followUps: DelayFollowUp[];
    delayedCount: number;
  }>;
}

export async function sendSingleFollowUpEmail(followUp: DelayFollowUp) {
  const res = await fetch(`${API_BASE}/ai/send-follow-up-email`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ followUp }),
  });
  if (!res.ok) await parseError(res, 'Failed to send follow-up email');
  return res.json() as Promise<{
    sent: boolean;
    assigneeName?: string;
    assigneeEmail?: string;
    message?: string;
  }>;
}

export async function sendFollowUpEmailsBatch(followUps: DelayFollowUp[]) {
  const res = await fetch(`${API_BASE}/ai/send-follow-up-emails`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ followUps, staggerMs: 800 }),
  });
  if (!res.ok) await parseError(res, 'Failed to send follow-up emails');
  return res.json() as Promise<{
    sent: number;
    total: number;
    results: Array<{
      taskId: string;
      assigneeId: string;
      assigneeName?: string;
      sent: boolean;
      reason?: string;
    }>;
    message?: string;
  }>;
}

export async function getManagerSummary(period: 'daily' | 'weekly' = 'weekly') {
  const res = await fetch(`${API_BASE}/ai/manager-summary?period=${period}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) await parseError(res, 'Failed to load manager summary');
  return res.json();
}
