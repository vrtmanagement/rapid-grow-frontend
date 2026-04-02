
export type GoalLevel = 'year' | 'quarter' | 'month' | 'week' | 'day';
export type UserRole = 'Admin' | 'Employee' | 'Leader';

export type UserPower = 
  | 'PROJECT_CREATE' 
  | 'PROJECT_DELETE' 
  | 'PROJECT_LAUNCH' 
  | 'TASK_AI_GENERATE' 
  | 'UI_EDIT' 
  | 'TEAM_MANAGE' 
  | 'VIEW_REPORTS' 
  | 'EDIT_STRATEGY'
  | 'EMPLOYEE_CREATE'
  | 'EMPLOYEE_UPDATE'
  | 'EMPLOYEE_DELETE'
  | 'EMPLOYEE_LIST'
  | 'DASHBOARD_VIEW'
  | 'EXECUTION_MATRIX_VIEW'
  | 'WORKSPACES_VIEW'
  | 'SPACES_VIEW'
  | 'ATTENDANCE_VIEW'
  | 'YEARLY_VIEW'
  | 'QUARTERLY_VIEW'
  | 'MONTHLY_VIEW'
  | 'WEEKLY_VIEW'
  | 'DAILY_VIEW'
  | 'REFLECTION_VIEW'
  | 'PROFILE_VIEW'
  | 'COMMUNICATION_VIEW'
  | 'FEEDBACK_VIEW'
  | 'STAFF_VIEW'
  | 'PERMISSIONS_MANAGE';

export interface Goal {
  id: string;
  text: string;
  completed: boolean;
  level: GoalLevel;
  parentId?: string;
  details?: string;
  timeline?: string;
}

export interface DailySchedule {
  time: string;
  activity: string;
}

export interface ReflectionData {
  accomplishments: string;
  mistakes: string;
  lessons: string;
  forgotten: string;
  prevention: string;
  energyPeaks: string;
  bigRocksTomorrow: string;
}

export type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'blocked';
export type ProjectStatus = 'draft' | 'ready' | 'launched' | 'completed' | 'archived';

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  email: string;
  password?: string;
  isVerified: boolean;
  status: 'Active' | 'Inactive';
  lastLogin?: string;
  powers: UserPower[];
}

export interface ProjectTeamMember {
  id: string;
  name: string;
  role: string;
}

export interface TaskMessage {
  id: string;
  text: string;
  from?: string;
  status?: TaskStatus;
  createdAt: string;
}

export interface WorkspaceTask {
  id: string;
  title: string;
  description?: string;
  messages?: TaskMessage[];
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  linkedGoalId?: string;
  linkedGoalLevel?: GoalLevel;
  assigneeId?: string;
  prerequisiteId?: string;
  dueDate?: string;
  createdBy?: string;
  createdByRole?: UserRole | string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPhases {
  [key: string]: string | undefined;
  phase1?: string;
  phase2?: string;
  phase3?: string;
  phase4?: string;
  phase5?: string;
  phase6?: string;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  status: ProjectStatus;
  dateCreated: string;
  businessCase: string;
  problemStatement: string;
  goalStatement: string;
  inScope: string;
  outOfScope: string;
  benefits: string;
  champion: string;
  championRole?: string;
  lead: string;
  leadRole?: string;
  smeList: ProjectTeamMember[];
  projectTeam?: ProjectTeamMember[];
  phases: ProjectPhases;
  tasks: WorkspaceTask[];
}

export interface Workspace {
  id: string;
  name: string;
  projects: WorkspaceProject[];
}

export interface ProfileData {
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  country: string;
  city: string;
  language: string;
  agreedTerms: boolean;
  profilePhoto: string;
  coverPhoto: string;
  headline: string;
  bio: string;
  about: string;
  profession: string;
  industry: string;
  company: string;
  website: string;
  workplace: string;
  jobTitle: string;
  experience: string;
  education: string;
  certifications: string;
  skills: string;
  portfolio: string;
  achievements: string;
  testimonials: string;
  mediaMentions: string;
  speakingEvents: string;
  interests: string;
  topicsToFollow: string;
  communities: string;
  tags: string;
  targetConnections: string;
  pinnedPost: string;
  featuredPosts: string;
  featuredArticles: string;
  featuredVideos: string;
  featuredLinks: string;
  highlights: string;
  contactMethod: string;
  businessEmail: string;
  whatsapp: string;
  bookingLink: string;
  dmPreference: string;
  ctaButton: string;
  primaryOffer: string;
  twoFactorEnabled: boolean;
  recoveryEmail: string;
  recoveryPhone: string;
  securityQuestions: string;
  verificationId: string;
  accountType: 'Personal' | 'Business';
  businessCategory: string;
  businessAddress: string;
  paymentDetails: string;
  taxDetails: string;
  productsToSell: string;
}

export interface UIConfig {
  sidebarLogoName: string;
  dashboardTitle: string;
  dashboardSub: string;
  operationsTitle: string;
  operationsSub: string;
  commsTitle: string;
  commsSub: string;
  yearlyTitle: string;
  yearlySub: string;
  quarterlyTitle: string;
  quarterlySub: string;
  monthlyTitle: string;
  monthlySub: string;
  weeklyTitle: string;
  weeklySub: string;
  dailyTitle: string;
  dailySub: string;
  reflectionTitle: string;
  reflectionSub: string;
  profileTitle: string;
  profileSub: string;
}

export interface EmailLog {
  id: string;
  type: string;
  recipientEmail: string;
  sentAt: string;
  subject: string;
  body: string;
}

export interface PlanningState {
  currentYear: number;
  currentUser: TeamMember; 
  yearlyGoals: Goal[];
  quarterlyGoals: Goal[];
  monthlyGoals: Goal[];
  weeklyGoals: Goal[];
  dailyGoals: Goal[];
  dailyPriorities: string[];
  schedule: DailySchedule[];
  reflection: ReflectionData;
  workspaces: Workspace[];
  team: TeamMember[];
  profile: ProfileData;
  emailLogs: EmailLog[];
  uiConfig: UIConfig;
}
