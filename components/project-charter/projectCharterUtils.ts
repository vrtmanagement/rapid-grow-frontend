import {
  ProjectActivityItem,
  ProjectPriority,
  ProjectStatus,
  ProjectTeamHierarchy,
  ProjectTeamLeadGroup,
  ProjectTeamMember,
  WorkspaceProject,
  WorkspaceTask,
} from '../../types';

export interface EmployeeDirectoryRecord {
  _id?: string;
  empId?: string;
  empName?: string;
  designation?: string;
  department?: string;
  email?: string;
  avatar?: string;
  role?: string;
}

export interface ProjectTaskMetrics {
  total: number;
  completed: number;
  active: number;
  blocked: number;
  progress: number;
}

export interface ProjectFormState {
  id?: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: Extract<ProjectStatus, 'Planning' | 'Active' | 'Completed'>;
  priority: Extract<ProjectPriority, 'Low' | 'Medium' | 'High' | 'Critical'>;
  projectManagerId: string;
  teamLeads: Array<{
    leadId: string;
    leadRole: string;
    memberIds: string[];
  }>;
}

export const PROJECT_STATUS_OPTIONS: Array<Extract<ProjectStatus, 'Planning' | 'Active' | 'Completed'>> = [
  'Planning',
  'Active',
  'Completed',
];

export const PROJECT_PRIORITY_OPTIONS: Array<Extract<ProjectPriority, 'Low' | 'Medium' | 'High' | 'Critical'>> = [
  'Low',
  'Medium',
  'High',
  'Critical',
];

const DEFAULT_MEMBER_AVATAR = 'https://api.dicebear.com/7.x/initials/svg?seed=RapidGrow';

function sanitizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function titleCase(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function normalizeProjectStatus(status: unknown): Extract<ProjectStatus, 'Planning' | 'Active' | 'Completed'> {
  const raw = sanitizeText(status).toLowerCase();
  if (raw === 'completed' || raw === 'archived') return 'Completed';
  if (raw === 'active' || raw === 'launched') return 'Active';
  return 'Planning';
}

export function normalizeProjectPriority(priority: unknown): Extract<ProjectPriority, 'Low' | 'Medium' | 'High' | 'Critical'> {
  const raw = sanitizeText(priority).toLowerCase();
  if (raw === 'critical') return 'Critical';
  if (raw === 'high') return 'High';
  if (raw === 'low') return 'Low';
  return 'Medium';
}

export function createMemberAvatar(name: string, avatar?: string): string {
  if (sanitizeText(avatar)) return sanitizeText(avatar);
  const seed = sanitizeText(name).replace(/\s+/g, '') || 'RapidGrow';
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`;
}

export function mapEmployeeToProjectMember(employee: EmployeeDirectoryRecord, fallbackRole = 'Team Member'): ProjectTeamMember {
  const name = sanitizeText(employee.empName) || sanitizeText(employee.empId) || 'Team Member';
  const id = sanitizeText(employee.empId) || sanitizeText(employee._id) || name;
  return {
    id,
    name,
    role: sanitizeText(employee.designation) || sanitizeText(employee.role) || fallbackRole,
    avatar: createMemberAvatar(name, sanitizeText(employee.avatar) || DEFAULT_MEMBER_AVATAR),
    email: sanitizeText(employee.email),
    designation: sanitizeText(employee.designation),
    department: sanitizeText(employee.department),
  };
}

export function buildEmployeeDirectory(employees: EmployeeDirectoryRecord[]): Map<string, ProjectTeamMember> {
  const directory = new Map<string, ProjectTeamMember>();
  employees.forEach((employee) => {
    const member = mapEmployeeToProjectMember(employee);
    if (sanitizeText(employee.empId)) {
      directory.set(sanitizeText(employee.empId), member);
    }
    if (sanitizeText(employee._id)) {
      directory.set(sanitizeText(employee._id), member);
    }
  });
  return directory;
}

function normalizeMember(input: any, directory?: Map<string, ProjectTeamMember>, fallbackRole = 'Team Member'): ProjectTeamMember | null {
  if (!input) return null;
  const candidateId = sanitizeText(input.id) || sanitizeText(input.empId) || sanitizeText(input._id);
  const fromDirectory = candidateId ? directory?.get(candidateId) : null;
  const name = sanitizeText(input.name) || sanitizeText(input.empName) || fromDirectory?.name || candidateId;

  if (!candidateId && !name) return null;

  return {
    id: candidateId || name,
    name: name || candidateId,
    role: sanitizeText(input.role) || sanitizeText(input.designation) || fromDirectory?.role || fallbackRole,
    avatar: createMemberAvatar(name || fromDirectory?.name || candidateId || 'RapidGrow', sanitizeText(input.avatar) || fromDirectory?.avatar),
    email: sanitizeText(input.email) || fromDirectory?.email,
    designation: sanitizeText(input.designation) || fromDirectory?.designation,
    department: sanitizeText(input.department) || fromDirectory?.department,
  };
}

function dedupeMembers(members: ProjectTeamMember[]): ProjectTeamMember[] {
  const seen = new Set<string>();
  return members.filter((member) => {
    const key = sanitizeText(member.id) || sanitizeText(member.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeProjectTeam(project: any, directory?: Map<string, ProjectTeamMember>): ProjectTeamHierarchy {
  const pmFromTeam = normalizeMember(project?.team?.projectManager, directory, 'Project Manager');
  const pmFromLegacyLead = normalizeMember(
    project?.lead
      ? {
          id: sanitizeText(project?.leadId) || sanitizeText(project?.lead),
          name: sanitizeText(project?.lead),
          role: sanitizeText(project?.leadRole) || 'Project Manager',
        }
      : null,
    directory,
    'Project Manager',
  );

  const projectManager = pmFromTeam || pmFromLegacyLead || null;

  const teamLeadGroups: ProjectTeamLeadGroup[] = [];
  const rawLeadGroups = Array.isArray(project?.team?.teamLeads) ? project.team.teamLeads : [];

  rawLeadGroups.forEach((group: any, index: number) => {
    const lead = normalizeMember(group?.lead || group, directory, 'Team Lead');
    if (!lead) return;
    teamLeadGroups.push({
      id: sanitizeText(group?.id) || `lead-${index + 1}-${lead.id}`,
      lead: {
        ...lead,
        role: sanitizeText(group?.leadRole) || lead.role || 'Team Lead',
      },
      members: dedupeMembers(
        Array.isArray(group?.members)
          ? group.members
              .map((member: any) => normalizeMember(member, directory, 'Team Member'))
              .filter(Boolean) as ProjectTeamMember[]
          : [],
      ),
    });
  });

  if (teamLeadGroups.length === 0) {
    const legacyLeads = Array.isArray(project?.smeList) ? project.smeList : [];
    legacyLeads.forEach((lead: any, index: number) => {
      const normalizedLead = normalizeMember(lead, directory, 'Team Lead');
      if (!normalizedLead) return;
      teamLeadGroups.push({
        id: `legacy-lead-${index + 1}-${normalizedLead.id}`,
        lead: normalizedLead,
        members: [],
      });
    });
  }

  const nestedMemberIds = new Set<string>();
  const reservedMemberIds = new Set<string>();
  if (projectManager?.id) reservedMemberIds.add(projectManager.id);
  teamLeadGroups.forEach((group) => {
    reservedMemberIds.add(group.lead.id);
    group.members.forEach((member) => nestedMemberIds.add(member.id));
  });

  const rawUnassignedMembers = dedupeMembers(
    (
      Array.isArray(project?.team?.unassignedMembers)
        ? project.team.unassignedMembers
        : Array.isArray(project?.projectTeam)
          ? project.projectTeam
          : []
    )
      .map((member: any) => normalizeMember(member, directory, 'Team Member'))
      .filter(Boolean) as ProjectTeamMember[],
  ).filter((member) => !nestedMemberIds.has(member.id) && !reservedMemberIds.has(member.id));

  let normalizedLeadGroups = teamLeadGroups;
  let unassignedMembers = rawUnassignedMembers;

  // Older saved projects often store contributor rows in projectTeam without nested lead member links.
  // If there is exactly one lead and it has no explicit members yet, attach those contributors to that lead.
  if (normalizedLeadGroups.length === 1 && normalizedLeadGroups[0].members.length === 0 && rawUnassignedMembers.length > 0) {
    normalizedLeadGroups = [
      {
        ...normalizedLeadGroups[0],
        members: rawUnassignedMembers,
      },
    ];
    unassignedMembers = [];
  }

  return {
    projectManager,
    teamLeads: normalizedLeadGroups,
    unassignedMembers,
  };
}

export function flattenProjectMembers(team?: ProjectTeamHierarchy): ProjectTeamMember[] {
  if (!team) return [];
  const members = [
    ...(team.projectManager ? [team.projectManager] : []),
    ...team.teamLeads.map((group) => group.lead),
    ...team.teamLeads.flatMap((group) => group.members),
    ...(team.unassignedMembers || []),
  ];
  return dedupeMembers(members);
}

export function countProjectMembers(project: WorkspaceProject): number {
  return flattenProjectMembers(project.team).length;
}

export function computeProjectTaskMetrics(tasks: WorkspaceTask[] = []): ProjectTaskMetrics {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === 'done').length;
  const blocked = tasks.filter((task) => task.status === 'blocked').length;
  const active = tasks.filter((task) => task.status !== 'done').length;
  return {
    total,
    completed,
    blocked,
    active,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

function createFallbackActivity(project: any): ProjectActivityItem[] {
  const date = sanitizeText(project?.updatedAt) || sanitizeText(project?.createdAt) || new Date().toISOString();
  return [
    {
      id: `activity-${sanitizeText(project?.clientProjectId) || sanitizeText(project?.id) || 'new'}`,
      type: 'project_created',
      title: 'Project charter created',
      description: `${sanitizeText(project?.name) || 'This project'} entered the charter workspace.`,
      createdAt: date,
    },
  ];
}

export function normalizeActivity(activity: any, project: any): ProjectActivityItem[] {
  if (!Array.isArray(activity) || activity.length === 0) {
    return createFallbackActivity(project);
  }

  return activity
    .map((entry: any, index: number) => ({
      id: sanitizeText(entry?.id) || `activity-${index + 1}`,
      type: sanitizeText(entry?.type) || 'note',
      title: sanitizeText(entry?.title) || 'Project updated',
      description: sanitizeText(entry?.description),
      actorId: sanitizeText(entry?.actorId),
      actorName: sanitizeText(entry?.actorName),
      createdAt: sanitizeText(entry?.createdAt) || new Date().toISOString(),
    }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function normalizeProjectRecord(project: any, directory?: Map<string, ProjectTeamMember>): WorkspaceProject {
  const team = normalizeProjectTeam(project, directory);
  const description =
    sanitizeText(project?.description) ||
    sanitizeText(project?.problemStatement) ||
    sanitizeText(project?.businessCase);

  return {
    id: sanitizeText(project?.clientProjectId) || sanitizeText(project?.id),
    name: sanitizeText(project?.name) || sanitizeText(project?.projectName) || 'Untitled Project',
    status: normalizeProjectStatus(project?.status),
    description,
    startDate: sanitizeText(project?.startDate),
    endDate: sanitizeText(project?.endDate),
    priority: normalizeProjectPriority(project?.priority),
    dateCreated:
      sanitizeText(project?.dateCreated) ||
      sanitizeText(project?.createdAt)?.split('T')[0] ||
      new Date().toISOString().split('T')[0],
    businessCase: sanitizeText(project?.businessCase) || description,
    problemStatement: sanitizeText(project?.problemStatement) || description,
    goalStatement: sanitizeText(project?.goalStatement),
    inScope: sanitizeText(project?.inScope),
    outOfScope: sanitizeText(project?.outOfScope),
    benefits: sanitizeText(project?.benefits),
    champion: sanitizeText(project?.champion) || team.projectManager?.name || '',
    championRole: sanitizeText(project?.championRole) || 'Project Sponsor',
    lead: sanitizeText(project?.lead) || team.projectManager?.name || '',
    leadRole: sanitizeText(project?.leadRole) || team.projectManager?.role || 'Project Manager',
    smeList:
      Array.isArray(project?.smeList) && project.smeList.length > 0
        ? (project.smeList
            .map((member: any) => normalizeMember(member, directory, 'Team Lead'))
            .filter(Boolean) as ProjectTeamMember[])
        : team.teamLeads.map((group) => group.lead),
    projectTeam:
      Array.isArray(project?.projectTeam) && project.projectTeam.length > 0
        ? (project.projectTeam
            .map((member: any) => normalizeMember(member, directory, 'Team Member'))
            .filter(Boolean) as ProjectTeamMember[])
        : flattenProjectMembers(team).filter((member) => member.id !== team.projectManager?.id),
    team,
    activity: normalizeActivity(project?.activity, project),
    phases: project?.phases || {},
    tasks: Array.isArray(project?.tasks) ? project.tasks : [],
  };
}

export function createInitialProjectFormState(project?: WorkspaceProject): ProjectFormState {
  const team = project?.team;
  return {
    id: project?.id,
    name: project?.name || '',
    description: project?.description || project?.problemStatement || '',
    startDate: project?.startDate || '',
    endDate: project?.endDate || '',
    status: normalizeProjectStatus(project?.status),
    priority: normalizeProjectPriority(project?.priority),
    projectManagerId: team?.projectManager?.id || '',
    teamLeads:
      team?.teamLeads.map((group) => ({
        leadId: group.lead.id,
        leadRole: group.lead.role || 'Team Lead',
        memberIds: group.members.map((member) => member.id),
      })) || [],
  };
}

export function buildProjectTeamFromForm(
  form: ProjectFormState,
  directory: Map<string, ProjectTeamMember>,
): ProjectTeamHierarchy {
  const projectManager = form.projectManagerId ? directory.get(form.projectManagerId) || null : null;

  const teamLeads = form.teamLeads
    .map((leadConfig, index) => {
      const leadMember = directory.get(leadConfig.leadId);
      if (!leadMember) return null;
      return {
        id: `team-lead-${index + 1}-${leadMember.id}`,
        lead: {
          ...leadMember,
          role: sanitizeText(leadConfig.leadRole) || leadMember.role || 'Team Lead',
        },
        members: dedupeMembers(
          leadConfig.memberIds
            .map((memberId) => directory.get(memberId))
            .filter(Boolean) as ProjectTeamMember[],
        ),
      };
    })
    .filter(Boolean) as ProjectTeamLeadGroup[];

  const assignedMemberIds = new Set<string>();
  if (projectManager?.id) assignedMemberIds.add(projectManager.id);
  teamLeads.forEach((group) => {
    assignedMemberIds.add(group.lead.id);
    group.members.forEach((member) => assignedMemberIds.add(member.id));
  });

  const unassignedMembers = Array.from(directory.values()).filter((member) => !assignedMemberIds.has(member.id));

  return {
    projectManager,
    teamLeads,
    unassignedMembers: [],
  };
}

export function createActivityEntry(
  title: string,
  description: string,
  actorName?: string,
  type = 'project_updated',
): ProjectActivityItem {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `activity-${Date.now()}`,
    type,
    title,
    description,
    actorName: sanitizeText(actorName),
    createdAt: new Date().toISOString(),
  };
}

export function appendActivity(
  currentActivity: ProjectActivityItem[] | undefined,
  entry: ProjectActivityItem,
): ProjectActivityItem[] {
  return [entry, ...(currentActivity || [])].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function buildProjectPayload(
  form: ProjectFormState,
  directory: Map<string, ProjectTeamMember>,
  existingProject?: WorkspaceProject,
  actorName?: string,
): Partial<WorkspaceProject> {
  const team = buildProjectTeamFromForm(form, directory);
  const allMembers = flattenProjectMembers(team).filter((member) => member.id !== team.projectManager?.id);
  const leadMembers = team.teamLeads.map((group) => group.lead);
  const activityEntry = createActivityEntry(
    existingProject ? 'Project charter updated' : 'Project charter created',
    existingProject
      ? `${form.name} details and team assignments were refreshed.`
      : `${form.name} was created and ready for delivery planning.`,
    actorName,
    existingProject ? 'project_updated' : 'project_created',
  );

  return {
    id: existingProject?.id || form.id || '',
    name: form.name.trim(),
    status: form.status,
    description: form.description.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    priority: form.priority,
    dateCreated: existingProject?.dateCreated || new Date().toISOString().split('T')[0],
    businessCase: form.description.trim(),
    problemStatement: form.description.trim(),
    goalStatement: existingProject?.goalStatement || '',
    inScope: existingProject?.inScope || '',
    outOfScope: existingProject?.outOfScope || '',
    benefits: existingProject?.benefits || '',
    champion: team.projectManager?.name || '',
    championRole: 'Project Manager',
    lead: team.projectManager?.name || '',
    leadRole: team.projectManager?.role || 'Project Manager',
    smeList: leadMembers,
    projectTeam: allMembers,
    team,
    activity: appendActivity(existingProject?.activity, activityEntry),
    phases: existingProject?.phases || {},
    tasks: existingProject?.tasks || [],
  };
}

export function formatProjectDate(value?: string): string {
  if (!sanitizeText(value)) return 'Not set';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function formatProjectDateTime(value?: string): string {
  if (!sanitizeText(value)) return 'Just now';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export function formatProjectTimeline(project: WorkspaceProject): string {
  if (project.startDate && project.endDate) {
    return `${formatProjectDate(project.startDate)} -> ${formatProjectDate(project.endDate)}`;
  }
  if (project.startDate) return `Starts ${formatProjectDate(project.startDate)}`;
  if (project.endDate) return `Ends ${formatProjectDate(project.endDate)}`;
  return 'Timeline pending';
}

export function getProjectStatusClasses(status: ProjectStatus): string {
  const normalized = normalizeProjectStatus(status);
  if (normalized === 'Completed') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }
  if (normalized === 'Active') {
    return 'bg-sky-50 text-sky-700 border border-sky-200';
  }
  return 'bg-amber-50 text-amber-700 border border-amber-200';
}

export function getProjectPriorityClasses(priority?: ProjectPriority): string {
  const normalized = normalizeProjectPriority(priority);
  if (normalized === 'Critical') {
    return 'bg-rose-50 text-rose-700 border border-rose-200';
  }
  if (normalized === 'High') {
    return 'bg-orange-50 text-orange-700 border border-orange-200';
  }
  if (normalized === 'Low') {
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
  return 'bg-violet-50 text-violet-700 border border-violet-200';
}

export function getProjectStatusLabel(status: ProjectStatus): string {
  return normalizeProjectStatus(status);
}

export function getProjectPriorityLabel(priority?: ProjectPriority): string {
  return titleCase(normalizeProjectPriority(priority));
}
