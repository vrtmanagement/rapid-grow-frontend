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
import { getDisplayAvatarUrl } from '../../utils/avatar';

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
  problemStatement: string;
  goalStatement: string;
  keyResults: string;
  inScope: string;
  outOfScope: string;
  benefits: string;
  teamMembers: Array<{
    rowId: string;
    role: string;
    memberId: string;
    name: string;
  }>;
  phases: ProjectPhases;
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

export const PROJECT_TEAM_ROLE_OPTIONS = [
  'Project Champion',
  'Project Lead',
  'Project Team Members (SMEs)',
  'Team Member',
] as const;

export const PROJECT_REVIEW_PHASES = [
  { key: 'phase0', label: 'Phase 0', defaultValue: 'Communication plan & GAP/Tool' },
  { key: 'phase1', label: 'Phase 1', defaultValue: 'Review current SOPs and process maps, Gemba walk' },
  { key: 'phase2', label: 'Phase 2', defaultValue: 'Evaluate current space utilization and inventory staging stations' },
  { key: 'phase3', label: 'Phase 3', defaultValue: 'Identify GAPs and update processes and SOPs' },
  { key: 'phase4', label: 'Phase 4', defaultValue: 'Test, validate and finalize improvement' },
  { key: 'phase5', label: 'Phase 5', defaultValue: 'Train team members in the new SOPs and procedures' },
  { key: 'phase6', label: 'Phase 6', defaultValue: 'Implement start date' },
  { key: 'phase7', label: 'Phase 7', defaultValue: 'Collect data, monitor performance to ensure benefits are realized' },
] as const;

export const DEFAULT_PROJECT_PHASES: ProjectPhases = PROJECT_REVIEW_PHASES.reduce<ProjectPhases>((acc, phase) => {
  acc[phase.key] = phase.defaultValue;
  return acc;
}, {});

function sanitizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function titleCase(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function createTeamRowId(role: string, name?: string, memberId?: string, index = 0): string {
  const raw = `${role}-${memberId || name || index + 1}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw ? `team-row-${raw}` : `team-row-${index + 1}`;
}

function createTeamMemberRow(
  role: string,
  member?: Partial<ProjectTeamMember> | null,
  index = 0,
): ProjectFormState['teamMembers'][number] {
  const name = sanitizeText(member?.name);
  const memberId = sanitizeText(member?.id);
  return {
    rowId: createTeamRowId(role, name, memberId, index),
    role,
    memberId,
    name,
  };
}

function createDefaultTeamMembers(): ProjectFormState['teamMembers'] {
  return [
    createTeamMemberRow('Project Champion', null, 0),
    createTeamMemberRow('Project Lead', null, 1),
    createTeamMemberRow('Project Team Members (SMEs)', null, 2),
    createTeamMemberRow('Team Member', null, 3),
  ];
}

function createManualMember(name: string, role: string, memberId?: string): ProjectTeamMember {
  const cleanName = sanitizeText(name) || 'Team Member';
  const cleanRole = sanitizeText(role) || 'Team Member';
  const cleanId =
    sanitizeText(memberId) ||
    `manual-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || Date.now()}`;

  return {
    id: cleanId,
    name: cleanName,
    role: cleanRole,
    avatar: createMemberAvatar(cleanName),
    email: '',
    designation: '',
    department: '',
  };
}

function resolveFormTeamMember(
  row: ProjectFormState['teamMembers'][number],
  directory: Map<string, ProjectTeamMember>,
): ProjectTeamMember | null {
  const name = sanitizeText(row.name);
  if (!name) return null;

  const byId = sanitizeText(row.memberId) ? directory.get(sanitizeText(row.memberId)) : null;
  if (byId) {
    return {
      ...byId,
      role: sanitizeText(row.role) || byId.role || 'Team Member',
    };
  }

  const byName = Array.from(directory.values()).find(
    (member) => sanitizeText(member.name).toLowerCase() === name.toLowerCase(),
  );
  if (byName) {
    return {
      ...byName,
      role: sanitizeText(row.role) || byName.role || 'Team Member',
    };
  }

  return createManualMember(name, row.role, row.memberId);
}

function buildFormTeamMembers(project?: WorkspaceProject): ProjectFormState['teamMembers'] {
  const rows: ProjectFormState['teamMembers'] = [];
  const seen = new Set<string>();

  const pushRow = (role: string, member?: Partial<ProjectTeamMember> | null) => {
    const name = sanitizeText(member?.name);
    const memberId = sanitizeText(member?.id);
    const key = `${role.toLowerCase()}::${(memberId || name).toLowerCase()}`;
    if ((memberId || name) && seen.has(key)) return;
    if (memberId || name) seen.add(key);
    rows.push(createTeamMemberRow(role, member, rows.length));
  };

  if (project?.champion) {
    pushRow(project.championRole || 'Project Champion', {
      id: project.champion,
      name: project.champion,
      role: project.championRole || 'Project Champion',
    });
  }

  const projectLead =
    project?.team?.projectManager ||
    (project?.lead
      ? {
          id: project.lead,
          name: project.lead,
          role: project.leadRole || 'Project Lead',
        }
      : null);
  if (projectLead) {
    pushRow(project.leadRole || 'Project Lead', projectLead);
  }

  (project?.smeList || []).forEach((member) => pushRow(member.role || 'Project Team Members (SMEs)', member));
  (project?.projectTeam || []).forEach((member) => pushRow(member.role || 'Team Member', member));

  return rows.length > 0 ? rows : createDefaultTeamMembers();
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
  return getDisplayAvatarUrl(sanitizeText(avatar), sanitizeText(name) || 'RapidGrow');
}

export function mapEmployeeToProjectMember(employee: EmployeeDirectoryRecord, fallbackRole = 'Team Member'): ProjectTeamMember {
  const name = sanitizeText(employee.empName) || sanitizeText(employee.empId) || 'Team Member';
  const id = sanitizeText(employee.empId) || sanitizeText(employee._id) || name;
  return {
    id,
    name,
    role: sanitizeText(employee.designation) || sanitizeText(employee.role) || fallbackRole,
    avatar: createMemberAvatar(name, sanitizeText(employee.avatar)),
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
  return {
    id: project?.id,
    name: project?.name || '',
    description: project?.description || '',
    startDate: project?.startDate || '',
    endDate: project?.endDate || '',
    status: normalizeProjectStatus(project?.status),
    priority: normalizeProjectPriority(project?.priority),
    problemStatement: project?.problemStatement || project?.description || '',
    goalStatement: project?.goalStatement || '',
    keyResults: project?.businessCase || '',
    inScope: project?.inScope || '',
    outOfScope: project?.outOfScope || '',
    benefits: project?.benefits || '',
    teamMembers: buildFormTeamMembers(project),
    phases: project?.phases || {},
  };
}

export function buildProjectTeamFromForm(
  form: ProjectFormState,
  directory: Map<string, ProjectTeamMember>,
): ProjectTeamHierarchy {
  const populatedRows = form.teamMembers
    .map((row) => ({
      row,
      member: resolveFormTeamMember(row, directory),
    }))
    .filter((entry) => entry.member) as Array<{
    row: ProjectFormState['teamMembers'][number];
    member: ProjectTeamMember;
  }>;

  const leadEntry =
    populatedRows.find((entry) => sanitizeText(entry.row.role).toLowerCase() === 'project lead') || null;

  const projectManager = leadEntry?.member || null;
  const unassignedMembers = dedupeMembers(
    populatedRows
      .filter((entry) => entry.row.rowId !== leadEntry?.row.rowId)
      .map((entry) => entry.member),
  );

  return {
    projectManager,
    teamLeads: [],
    unassignedMembers,
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
  const populatedRows = form.teamMembers
    .map((row) => ({
      row,
      member: resolveFormTeamMember(row, directory),
    }))
    .filter((entry) => entry.member) as Array<{
    row: ProjectFormState['teamMembers'][number];
    member: ProjectTeamMember;
  }>;
  const championEntry =
    populatedRows.find((entry) => sanitizeText(entry.row.role).toLowerCase() === 'project champion') || null;
  const leadMembers = dedupeMembers(
    populatedRows
      .filter((entry) => sanitizeText(entry.row.role).toLowerCase().includes('sme'))
      .map((entry) => entry.member),
  );
  const summaryText = [form.problemStatement, form.goalStatement, form.keyResults]
    .map((value) => sanitizeText(value))
    .filter(Boolean)
    .join('\n\n');
  const cleanedPhases = Object.fromEntries(
    Object.entries(form.phases || {}).filter(([, value]) => sanitizeText(value)),
  );
  const derivedName =
    sanitizeText(form.name) ||
    sanitizeText(form.goalStatement) ||
    sanitizeText(form.problemStatement) ||
    sanitizeText(form.keyResults) ||
    existingProject?.name ||
    'Untitled Project Charter';
  const activityEntry = createActivityEntry(
    existingProject ? 'Project charter updated' : 'Project charter created',
    existingProject
      ? `${derivedName} details and team assignments were refreshed.`
      : `${derivedName} was created and ready for delivery planning.`,
    actorName,
    existingProject ? 'project_updated' : 'project_created',
  );

  return {
    id: existingProject?.id || form.id || '',
    name: derivedName,
    status: form.status,
    description: summaryText || sanitizeText(form.description),
    startDate: form.startDate,
    endDate: form.endDate,
    priority: form.priority,
    dateCreated: existingProject?.dateCreated || new Date().toISOString().split('T')[0],
    businessCase: sanitizeText(form.keyResults) || summaryText || sanitizeText(form.problemStatement),
    problemStatement: sanitizeText(form.problemStatement),
    goalStatement: sanitizeText(form.goalStatement),
    inScope: sanitizeText(form.inScope),
    outOfScope: sanitizeText(form.outOfScope),
    benefits: sanitizeText(form.benefits),
    champion: championEntry?.member.name || existingProject?.champion || '',
    championRole: championEntry?.member.role || existingProject?.championRole || 'Project Champion',
    lead: team.projectManager?.name || existingProject?.lead || '',
    leadRole: team.projectManager?.role || existingProject?.leadRole || 'Project Lead',
    smeList: leadMembers,
    projectTeam: allMembers,
    team,
    activity: appendActivity(existingProject?.activity, activityEntry),
    phases: cleanedPhases,
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
