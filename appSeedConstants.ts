import { HOURS } from './constants';
import { PlanningState, TeamMember, ProfileData, UIConfig } from './types';

export const SUPER_ADMIN_EMAIL = 'superadmin@example.com';

export const DEFAULT_POWERS: Record<string, string[]> = {
  SUPER_ADMIN: ['EMPLOYEE_CREATE', 'EMPLOYEE_INVITE', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE', 'EMPLOYEE_LIST', 'DASHBOARD_VIEW', 'EXECUTION_MATRIX_VIEW', 'WORKSPACES_VIEW', 'SPACES_VIEW', 'ATTENDANCE_VIEW', 'YEARLY_VIEW', 'QUARTERLY_VIEW', 'MONTHLY_VIEW', 'WEEKLY_VIEW', 'DAILY_VIEW', 'REFLECTION_VIEW', 'PROFILE_VIEW', 'COMMUNICATION_VIEW', 'CONTENT_VIEW', 'ANALYSIS_VIEW', 'STAFF_VIEW', 'PERMISSIONS_MANAGE', 'CRM_VIEW', 'EXPENSE_VIEW', 'EXPENSE_MANAGE', 'EXPENSE_APPROVE', 'EXPENSE_BUDGET_MANAGE', 'EXPENSE_REIMBURSE', 'STRATEGY_EXECUTION_VIEW'],
  ADMIN: ['EMPLOYEE_CREATE', 'EMPLOYEE_INVITE', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE', 'EMPLOYEE_LIST', 'DASHBOARD_VIEW', 'EXECUTION_MATRIX_VIEW', 'WORKSPACES_VIEW', 'SPACES_VIEW', 'ATTENDANCE_VIEW', 'YEARLY_VIEW', 'QUARTERLY_VIEW', 'MONTHLY_VIEW', 'WEEKLY_VIEW', 'DAILY_VIEW', 'REFLECTION_VIEW', 'PROFILE_VIEW', 'COMMUNICATION_VIEW', 'CONTENT_VIEW', 'ANALYSIS_VIEW', 'STAFF_VIEW', 'PERMISSIONS_MANAGE', 'CRM_VIEW', 'EXPENSE_VIEW', 'EXPENSE_MANAGE', 'EXPENSE_APPROVE', 'EXPENSE_BUDGET_MANAGE', 'EXPENSE_REIMBURSE', 'STRATEGY_EXECUTION_VIEW'],
  TEAM_LEAD: ['EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'EMPLOYEE_LIST', 'DASHBOARD_VIEW', 'EXECUTION_MATRIX_VIEW', 'WORKSPACES_VIEW', 'SPACES_VIEW', 'ATTENDANCE_VIEW', 'YEARLY_VIEW', 'QUARTERLY_VIEW', 'MONTHLY_VIEW', 'WEEKLY_VIEW', 'DAILY_VIEW', 'REFLECTION_VIEW', 'PROFILE_VIEW', 'COMMUNICATION_VIEW', 'CONTENT_VIEW', 'STAFF_VIEW', 'CRM_VIEW', 'EXPENSE_VIEW', 'EXPENSE_MANAGE', 'EXPENSE_APPROVE', 'EXPENSE_BUDGET_MANAGE', 'STRATEGY_EXECUTION_VIEW'],
  EMPLOYEE: ['DASHBOARD_VIEW', 'EXECUTION_MATRIX_VIEW', 'WORKSPACES_VIEW', 'SPACES_VIEW', 'ATTENDANCE_VIEW', 'YEARLY_VIEW', 'QUARTERLY_VIEW', 'MONTHLY_VIEW', 'WEEKLY_VIEW', 'DAILY_VIEW', 'REFLECTION_VIEW', 'PROFILE_VIEW', 'COMMUNICATION_VIEW', 'CONTENT_VIEW', 'STAFF_VIEW', 'CRM_VIEW', 'EXPENSE_VIEW', 'EXPENSE_MANAGE', 'STRATEGY_EXECUTION_VIEW'],
};

export const DEFAULT_UI_CONFIG: UIConfig = {
  sidebarLogoName: 'Rapid Grow',
  dashboardTitle: 'Command Matrix',
  dashboardSub: 'Your home for projects, tasks, attendance, and weekly performance.',
  operationsTitle: 'Project Charters',
  operationsSub: 'Enterprise Mission Control & Execution Hub',
  commsTitle: 'Communications Hub',
  commsSub: 'Autonomous Log Management',
  yearlyTitle: 'Yearly Vision',
  yearlySub: 'Add yearly goals (e.g., increase sales, grow team, improve revenue).',
  quarterlyTitle: 'Quarterly Vision',
  quarterlySub: 'Break yearly goals into Q1, Q2, Q3, and Q4 goals.',
  monthlyTitle: 'Monthly Goals',
  monthlySub: 'Set monthly targets under each quarter.',
  weeklyTitle: 'Weekly Tasks',
  weeklySub: 'Split monthly goals into weekly action items.',
  dailyTitle: 'Daily Tasks',
  dailySub: 'Split weekly tasks into daily actions.',
  reflectionTitle: 'Review Matrix',
  reflectionSub: 'Daily Structured Debriefing.',
  profileTitle: 'Core Identity',
  profileSub: 'Strategic Personnel Identification.',
};

export const INITIAL_TEAM: TeamMember[] = [
  {
    id: 'u-admin',
    name: 'Alex Rivera (Super Admin)',
    role: 'Admin',
    email: SUPER_ADMIN_EMAIL,
    avatar: '',
    status: 'Active',
    isVerified: true,
    powers: ['PROJECT_CREATE', 'PROJECT_DELETE', 'PROJECT_LAUNCH', 'TASK_AI_GENERATE', 'UI_EDIT', 'TEAM_MANAGE', 'VIEW_REPORTS', 'EDIT_STRATEGY'],
  },
  {
    id: 'u-leader',
    name: 'Sarah Chen (Leader)',
    role: 'Leader',
    email: 'schen@vrt9.com',
    avatar: '',
    status: 'Active',
    isVerified: true,
    powers: ['PROJECT_CREATE', 'PROJECT_LAUNCH', 'TASK_AI_GENERATE'],
  },
  {
    id: 'u-emp',
    name: 'James Wilson (Employee)',
    role: 'Employee',
    email: 'jwilson@vrt9.com',
    avatar: '',
    status: 'Active',
    isVerified: true,
    powers: [],
  },
];

export const EMPTY_PROFILE: ProfileData = {
  firstName: '', lastName: '', displayName: '', username: '', email: '', phone: '',
  dob: '', gender: '', country: '', city: '', language: '', agreedTerms: false,
  profilePhoto: '', coverPhoto: '', headline: '', bio: '', about: '', profession: '',
  industry: '', company: '', website: '', workplace: '', jobTitle: '', experience: '',
  education: '', certifications: '', skills: '', portfolio: '', achievements: '',
  testimonials: '', mediaMentions: '', speakingEvents: '', interests: '',
  topicsToFollow: '', communities: '', tags: '', targetConnections: '',
  pinnedPost: '', featuredPosts: '', featuredArticles: '', featuredVideos: '',
  featuredLinks: '', highlights: '', contactMethod: '', businessEmail: '',
  whatsapp: '', bookingLink: '', dmPreference: 'open', ctaButton: '',
  primaryOffer: '', twoFactorEnabled: false, recoveryEmail: '', recoveryPhone: '',
  securityQuestions: '', verificationId: '', accountType: 'Personal',
  businessCategory: '', businessAddress: '', paymentDetails: '', taxDetails: '',
  productsToSell: '',
};

export const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

export function createDefaultPlanningStateInput(): PlanningState {
  return {
    currentYear: 2026,
    currentUser: INITIAL_TEAM[0],
    profile: EMPTY_PROFILE,
    uiConfig: DEFAULT_UI_CONFIG,
    yearlyGoals: [
      { id: '1', text: 'Achieve $10M ARR', completed: false, level: 'year' },
      { id: '2', text: 'Expand to 3 Global Regions', completed: false, level: 'year' },
      { id: '3', text: 'Build Performance-First Culture', completed: false, level: 'year' },
    ],
    quarterlyGoals: [],
    monthlyGoals: [],
    weeklyGoals: [],
    dailyGoals: [],
    dailyPriorities: ['', '', '', '', ''],
    schedule: HOURS.map((h) => ({ time: h, activity: '' })),
    reflection: {
      accomplishments: '', mistakes: '', lessons: '', forgotten: '', prevention: '', energyPeaks: '', bigRocksTomorrow: '',
    },
    team: INITIAL_TEAM,
    workspaces: [
      {
        id: 'ws-1',
        name: 'Strategic Performance Hub',
        projects: [],
      },
    ],
    emailLogs: [],
  };
}
