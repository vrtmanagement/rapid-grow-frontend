import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Target, Calendar, Clock, BarChart3, 
  LayoutDashboard, BrainCircuit, 
  CheckSquare, Menu, Briefcase, UserCircle, ShieldCheck, 
  Mail, Settings, Zap, ShieldAlert, Check, Database, LogOut, UserPlus
} from 'lucide-react';
import { PlanningState, Goal, ReflectionData, TeamMember, ProfileData, EmailLog, UserRole, UIConfig } from './types';
import { BrandingLogo, HOURS } from './constants';
import YearlyView from './views/YearlyView';
import QuarterlyView from './views/QuarterlyView';
import MonthlyView from './views/MonthlyView';
import WeeklyView from './views/WeeklyView';
import DailyView from './views/DailyView';
import ReflectionView from './views/ReflectionView';
import DashboardView from './views/DashboardView';
import WorkspacesView from './views/WorkspacesView';
import ProfileView from './views/ProfileView';
import AddEmployeeView from './views/AddEmployeeView';
import LoginView from './views/LoginView';
import EmployeeDashboardView from './views/EmployeeDashboardView';
import EmployeeProfileView from './views/EmployeeProfileView';
import EmployeeProjectDetailView from './views/EmployeeProjectDetailView';
import SpacesView from './views/SpacesView';
import FeedbackView from './views/FeedbackView';
import AttendanceView from './views/AttendanceView';
import StaffView from './views/StaffView';
import CommunicationView from './communication/views/CommunicationView';
import { apiUnreadCount } from './communication/api';
import { getSocket } from './realtime/socket';
import PermissionsView from './views/PermissionsView';
import { mapBackendRoleToUiRole } from './config/permissions';
import { usePermissions } from './context/PermissionContext';
import AccessDenied from './components/AccessDenied';
import { API_BASE, getAuthHeaders } from './config/api';

const SUPER_ADMIN_EMAIL = 'superadmin@example.com';
const DEFAULT_POWERS: Record<string, string[]> = {
  SUPER_ADMIN: ['EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE', 'EMPLOYEE_LIST', 'DASHBOARD_VIEW', 'WORKSPACES_VIEW', 'SPACES_VIEW', 'ATTENDANCE_VIEW', 'YEARLY_VIEW', 'QUARTERLY_VIEW', 'MONTHLY_VIEW', 'WEEKLY_VIEW', 'DAILY_VIEW', 'REFLECTION_VIEW', 'PROFILE_VIEW', 'COMMUNICATION_VIEW', 'FEEDBACK_VIEW', 'STAFF_VIEW', 'PERMISSIONS_MANAGE'],
  ADMIN: ['EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE', 'EMPLOYEE_LIST', 'DASHBOARD_VIEW', 'WORKSPACES_VIEW', 'SPACES_VIEW', 'ATTENDANCE_VIEW', 'YEARLY_VIEW', 'QUARTERLY_VIEW', 'MONTHLY_VIEW', 'WEEKLY_VIEW', 'DAILY_VIEW', 'REFLECTION_VIEW', 'PROFILE_VIEW', 'COMMUNICATION_VIEW', 'FEEDBACK_VIEW', 'STAFF_VIEW', 'PERMISSIONS_MANAGE'],
  TEAM_LEAD: ['EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'EMPLOYEE_LIST', 'DASHBOARD_VIEW', 'WORKSPACES_VIEW', 'SPACES_VIEW', 'ATTENDANCE_VIEW', 'YEARLY_VIEW', 'QUARTERLY_VIEW', 'MONTHLY_VIEW', 'WEEKLY_VIEW', 'DAILY_VIEW', 'REFLECTION_VIEW', 'PROFILE_VIEW', 'COMMUNICATION_VIEW', 'STAFF_VIEW'],
  EMPLOYEE: ['DASHBOARD_VIEW', 'WORKSPACES_VIEW', 'SPACES_VIEW', 'ATTENDANCE_VIEW', 'YEARLY_VIEW', 'QUARTERLY_VIEW', 'MONTHLY_VIEW', 'WEEKLY_VIEW', 'DAILY_VIEW', 'REFLECTION_VIEW', 'PROFILE_VIEW', 'COMMUNICATION_VIEW', 'STAFF_VIEW'],
};

const DEFAULT_UI_CONFIG: UIConfig = {
  sidebarLogoName: "Rapid Grow",
  dashboardTitle: "Command Matrix",
  dashboardSub: "Elite Visibility And Operational Velocity Via Rapid Grow OS.",
  operationsTitle: "Project Charters",
  operationsSub: "Enterprise Mission Control & Execution Hub",
  commsTitle: "Communications Hub",
  commsSub: "Autonomous Log Management",
  yearlyTitle: "Yearly Vision",
  yearlySub: "Architecting The Core Legacy And Non-Negotiables.",
  quarterlyTitle: "Quarterly Vision",
  quarterlySub: "Quarterly Tactical Objectives.",
  monthlyTitle: "Monthly Vision",
  monthlySub: "Strategic Monthly Focus Projects.",
  weeklyTitle: "Weekly Base",
  weeklySub: "Bridge The Gap Between Strategy And Execution.",
  dailyTitle: "Daily Protocol",
  dailySub: "High-Performance Time Boxing.",
  reflectionTitle: "Review Matrix",
  reflectionSub: "Daily Structured Debriefing.",
  profileTitle: "Core Identity",
  profileSub: "Strategic Personnel Identification."
};

const INITIAL_TEAM: TeamMember[] = [
  { 
    id: 'u-admin', 
    name: 'Alex Rivera (Super Admin)', 
    role: 'Admin', 
    email: SUPER_ADMIN_EMAIL, 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', 
    status: 'Active',
    isVerified: true,
    powers: ['PROJECT_CREATE', 'PROJECT_DELETE', 'PROJECT_LAUNCH', 'TASK_AI_GENERATE', 'UI_EDIT', 'TEAM_MANAGE', 'VIEW_REPORTS', 'EDIT_STRATEGY']
  },
  { 
    id: 'u-leader', 
    name: 'Sarah Chen (Leader)', 
    role: 'Leader', 
    email: 'schen@vrt9.com', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', 
    status: 'Active',
    isVerified: true,
    powers: ['PROJECT_CREATE', 'PROJECT_LAUNCH', 'TASK_AI_GENERATE']
  },
  { 
    id: 'u-emp', 
    name: 'James Wilson (Employee)', 
    role: 'Employee', 
    email: 'jwilson@vrt9.com', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', 
    status: 'Active',
    isVerified: true,
    powers: []
  },
];

const EMPTY_PROFILE: ProfileData = {
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
  productsToSell: ''
};

const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

const normalizeGoalHierarchy = (state: PlanningState): PlanningState => {
  const yearlyGoals = state.yearlyGoals;
  const yearlyIds = new Set(yearlyGoals.map((g) => g.id));

  const quarterMap = new Map<string, Goal>();
  for (const quarter of state.quarterlyGoals) {
    if (!quarter.parentId || !yearlyIds.has(quarter.parentId)) continue;
    const label = quarter.timeline || '';
    if (!QUARTER_LABELS.includes(label)) continue;
    quarterMap.set(`${quarter.parentId}:${label}`, quarter);
  }

  const quarterlyGoals: Goal[] = [];
  for (const year of yearlyGoals) {
    QUARTER_LABELS.forEach((label) => {
      const key = `${year.id}:${label}`;
      const existing = quarterMap.get(key);
      quarterlyGoals.push(
        existing || {
          id: `${year.id.toLowerCase()}-${label.toLowerCase()}`,
          text: '',
          completed: false,
          level: 'quarter',
          parentId: year.id,
          timeline: label,
        },
      );
    });
  }

  const quarterIds = new Set(quarterlyGoals.map((q) => q.id));
  const monthlyGoals = state.monthlyGoals.filter((m) => m.parentId && quarterIds.has(m.parentId));
  const monthIds = new Set(monthlyGoals.map((m) => m.id));
  const weeklyGoals = state.weeklyGoals.filter((w) => w.parentId && monthIds.has(w.parentId));
  const weekIds = new Set(weeklyGoals.map((w) => w.id));
  const dailyGoals = state.dailyGoals.filter((d) => d.parentId && weekIds.has(d.parentId));

  const dailyByWeek = new Map<string, Goal[]>();
  dailyGoals.forEach((d) => {
    const key = d.parentId as string;
    const list = dailyByWeek.get(key) || [];
    list.push(d);
    dailyByWeek.set(key, list);
  });

  const weeklyWithCompletion = weeklyGoals.map((w) => {
    const children = dailyByWeek.get(w.id) || [];
    const completed = children.length > 0 ? children.every((d) => d.completed) : w.completed;
    return { ...w, completed };
  });

  const weeklyByMonth = new Map<string, Goal[]>();
  weeklyWithCompletion.forEach((w) => {
    const key = w.parentId as string;
    const list = weeklyByMonth.get(key) || [];
    list.push(w);
    weeklyByMonth.set(key, list);
  });

  const monthlyWithCompletion = monthlyGoals.map((m) => {
    const children = weeklyByMonth.get(m.id) || [];
    return { ...m, completed: children.length > 0 && children.every((w) => w.completed) };
  });

  const monthlyByQuarter = new Map<string, Goal[]>();
  monthlyWithCompletion.forEach((m) => {
    const key = m.parentId as string;
    const list = monthlyByQuarter.get(key) || [];
    list.push(m);
    monthlyByQuarter.set(key, list);
  });

  const quarterlyWithCompletion = quarterlyGoals.map((q) => {
    const children = monthlyByQuarter.get(q.id) || [];
    return { ...q, completed: children.length > 0 && children.every((m) => m.completed) };
  });

  const quarterByYear = new Map<string, Goal[]>();
  quarterlyWithCompletion.forEach((q) => {
    const key = q.parentId as string;
    const list = quarterByYear.get(key) || [];
    list.push(q);
    quarterByYear.set(key, list);
  });

  const yearlyWithCompletion = yearlyGoals.map((y) => {
    const children = quarterByYear.get(y.id) || [];
    return { ...y, completed: children.length > 0 && children.every((q) => q.completed) };
  });

  return {
    ...state,
    yearlyGoals: yearlyWithCompletion,
    quarterlyGoals: quarterlyWithCompletion,
    monthlyGoals: monthlyWithCompletion,
    weeklyGoals: weeklyWithCompletion,
    dailyGoals,
  };
};

const App: React.FC = () => {
  const { permissions, hasPermission, loading: permissionsLoading } = usePermissions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isVisionsOpen, setIsVisionsOpen] = useState(true);
  const [communicationUnreadCount, setCommunicationUnreadCount] = useState(0);

  useEffect(() => {
    const adminStored = localStorage.getItem('rapidgrow-admin');
    setIsAuthenticated(!!adminStored);
    if (adminStored) {
      try {
        const { employee } = JSON.parse(adminStored);
        setState(prev => ({
          ...prev,
            currentUser: {
              id: employee._id || employee.empId,
              name: employee.empName || 'Admin',
              role: mapBackendRoleToUiRole(employee.role),
              email: employee.email || '',
              avatar:
                employee.avatar && typeof employee.avatar === 'string' && employee.avatar.trim()
                  ? employee.avatar
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${(employee.empName || 'Admin').replace(/\s/g, '')}`,
              status: 'Active',
              isVerified: true,
              powers: DEFAULT_POWERS[employee.role as keyof typeof DEFAULT_POWERS] || [],
            },
        }));
      } catch (_e) { /* ignore */ }
    }
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    window.location.hash = '#/';
    window.location.reload();
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('rapidgrow-admin');
    setIsAuthenticated(false);
  }, []);

  const [state, setState] = useState<PlanningState>(normalizeGoalHierarchy({
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
    schedule: HOURS.map(h => ({ time: h, activity: '' })),
    reflection: {
      accomplishments: '', mistakes: '', lessons: '', forgotten: '', prevention: '', energyPeaks: '', bigRocksTomorrow: ''
    },
    team: INITIAL_TEAM,
    workspaces: [
      {
        id: 'ws-1',
        name: 'Strategic Performance Hub',
        projects: [],
      },
    ],
    emailLogs: []
  }));

  useEffect(() => {
    const saved = localStorage.getItem('rapidgrow-os-v1');
    const adminStored = localStorage.getItem('rapidgrow-admin');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: remove legacy default \"Rapid Grow execution framework\" project if present
        if (Array.isArray(parsed.workspaces)) {
          parsed.workspaces = parsed.workspaces.map((ws: any) => ({
            ...ws,
            projects: Array.isArray(ws.projects)
              ? ws.projects.filter(
                  (p: any) =>
                    !(
                      p?.id === 'p-1' &&
                      p?.name === 'Rapid Grow execution framework'
                    ),
                )
              : [],
          }));
        }
        // Always use logged-in user from rapidgrow-admin for header, not saved/static name
        let currentUser = parsed.currentUser;
        if (adminStored) {
          try {
            const { employee } = JSON.parse(adminStored);
            currentUser = {
              id: employee._id || employee.empId,
              name: employee.empName || 'Admin',
              role: mapBackendRoleToUiRole(employee.role),
              email: employee.email || '',
              avatar:
                employee.avatar && typeof employee.avatar === 'string' && employee.avatar.trim()
                  ? employee.avatar
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${(employee.empName || 'Admin').replace(/\s/g, '')}`,
              status: 'Active',
              isVerified: true,
              powers: DEFAULT_POWERS[employee.role as keyof typeof DEFAULT_POWERS] || [],
            };
          } catch (_e) { /* ignore */ }
        }
        setState(normalizeGoalHierarchy({ ...parsed, currentUser }));
      } catch (e) {
        console.error("Restore failed", e);
      }
    }
  }, []);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      currentUser: {
        ...prev.currentUser,
        powers: Array.isArray(permissions) ? permissions : [],
      },
    }));
  }, [permissions]);

  useEffect(() => {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem('rapidgrow-os-v1', serialized);
    } catch (e) {
      console.error('Failed to persist rapidgrow-os state', e);
    }
  }, [state]);

  useEffect(() => {
    if (!isAuthenticated || !state.currentUser?.id) return;

    let active = true;

    async function fetchUnread() {
      try {
        const data = await apiUnreadCount(String(state.currentUser.id));
        if (active) {
          setCommunicationUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
        }
      } catch (err) {
        console.warn('Failed to load unread count', err);
      }
    }

    fetchUnread();

    const socket = getSocket();
    const handleUnreadCount = (payload: any) => {
      if (!payload || String(payload.userId) !== String(state.currentUser.id)) return;
      if (typeof payload.unreadCount === 'number') {
        setCommunicationUnreadCount(payload.unreadCount);
      }
    };

    socket.on('unreadCount', handleUnreadCount);

    return () => {
      active = false;
      socket.off('unreadCount', handleUnreadCount);
    };
  }, [isAuthenticated, state.currentUser?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const loadGoals = async () => {
      try {
        const res = await fetch(`${API_BASE}/goals`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const goals = await res.json();
        if (!Array.isArray(goals)) return;
        setState((prev) =>
          normalizeGoalHierarchy({
            ...prev,
            yearlyGoals: goals.filter((g: any) => g.level === 'year').map((g: any) => ({ id: g.goalId, text: g.text || '', completed: !!g.completed, level: 'year' as const })),
            quarterlyGoals: goals
              .filter((g: any) => g.level === 'quarter')
              .map((g: any) => ({ id: g.goalId, text: g.text || '', completed: !!g.completed, level: 'quarter' as const, parentId: g.parentId || '', timeline: g.timeline || '' })),
            monthlyGoals: goals
              .filter((g: any) => g.level === 'month')
              .map((g: any) => ({ id: g.goalId, text: g.text || '', completed: !!g.completed, level: 'month' as const, parentId: g.parentId || '', details: g.details || '' })),
            weeklyGoals: goals
              .filter((g: any) => g.level === 'week')
              .map((g: any) => ({ id: g.goalId, text: g.text || '', completed: !!g.completed, level: 'week' as const, parentId: g.parentId || '', details: g.details || '', timeline: g.timeline || '' })),
            dailyGoals: goals
              .filter((g: any) => g.level === 'day')
              .map((g: any) => ({ id: g.goalId, text: g.text || '', completed: !!g.completed, level: 'day' as const, parentId: g.parentId || '' })),
          }),
        );
      } catch (_e) {
        // keep local state if goals API unavailable
      }
    };
    loadGoals();
  }, [isAuthenticated]);

  const updateState = useCallback((updater: (prev: PlanningState) => PlanningState) => {
    setState(prev => {
      const next = normalizeGoalHierarchy(updater(prev));
      const tIdx = next.team.findIndex(m => m.id === next.currentUser.id);
      if (tIdx !== -1) next.team[tIdx] = { ...next.currentUser };
      return next;
    });
  }, []);

  const hasPower = (power: string) => hasPermission(power);
  const isSuperAdmin = state.currentUser.email === SUPER_ADMIN_EMAIL;
  const isAdmin = state.currentUser.role === 'Admin';
  const taskCount = state.workspaces?.reduce((count, ws) => count + (Array.isArray(ws.projects) ? ws.projects.length : 0), 0) || 0;
  const visionNavItems = [
    { power: 'YEARLY_VIEW', to: '/yearly', icon: <Target size={20} />, label: state.uiConfig.yearlyTitle },
    { power: 'QUARTERLY_VIEW', to: '/quarterly', icon: <BarChart3 size={20} />, label: state.uiConfig.quarterlyTitle },
    { power: 'MONTHLY_VIEW', to: '/monthly', icon: <Calendar size={20} />, label: state.uiConfig.monthlyTitle },
    { power: 'WEEKLY_VIEW', to: '/weekly', icon: <CheckSquare size={20} />, label: state.uiConfig.weeklyTitle },
  ];

  if (isAuthenticated === null) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  if (permissionsLoading && state.currentUser?.id) {
    return null;
  }

  if (state.currentUser.role === 'Employee') {
    return (
      <HashRouter>
        <div className="h-screen flex overflow-hidden bg-[#f1f5f9]">
          <aside className="w-64 h-full min-h-0 bg-brand-charcoal text-white flex flex-col z-50 shadow-2xl relative shrink-0">
            <div className="absolute top-0 right-0 w-[2px] h-full bg-brand-red opacity-20" />
            <div className="p-6 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-red flex items-center justify-center rounded shadow-lg">
                  <span className="text-white text-lg">RG</span>
                </div>
                <span className="text-md text-brand-red">Employee Portal</span>
              </div>
            </div>
            <nav className="flex-1 min-h-0 py-6 space-y-2 overflow-y-auto overflow-x-hidden px-4">
              {hasPower('DASHBOARD_VIEW') && <SidebarLink to="/" icon={<LayoutDashboard size={20} />} label={state.uiConfig.dashboardTitle} collapsed={false} />}
              {hasPower('SPACES_VIEW') && <SidebarLink to="/spaces" icon={<Database size={20} />} label={`TaskHub${taskCount > 0 ? ' (1)' : ''}`} collapsed={false} />}
              {hasPower('ATTENDANCE_VIEW') && <SidebarLink to="/attendance" icon={<Clock size={20} />} label="Manage Attendance" collapsed={false} />}
              <div className="h-px bg-white/5 mx-4 my-6"></div>
              {visionNavItems.map((item) =>
                hasPower(item.power) ? (
                  <SidebarLink key={item.to} to={item.to} icon={item.icon} label={item.label} collapsed={false} />
                ) : null,
              )}
              <div className="h-px bg-white/5 mx-4 my-6"></div>
              {hasPower('DAILY_VIEW') && <SidebarLink to="/daily" icon={<Clock size={20}/>} label={state.uiConfig.dailyTitle} collapsed={false} />}
              {hasPower('REFLECTION_VIEW') && <SidebarLink to="/reflection" icon={<BrainCircuit size={20}/>} label={state.uiConfig.reflectionTitle} collapsed={false} />}
              <div className="h-px bg-white/5 mx-4 my-6"></div>
              {hasPower('COMMUNICATION_VIEW') && <SidebarLink to="/communication" icon={<Mail size={20}/>} label={communicationUnreadCount > 0 ? `Communication (${communicationUnreadCount})` : 'Communication'} collapsed={false} />}
              {hasPower('STAFF_VIEW') && <SidebarLink to="/staff" icon={<ShieldCheck size={20} />} label="Staff" collapsed={false} />}
            </nav>
          </aside>
          <main className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-end px-8 shrink-0 z-40 relative">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-4 rounded-xl py-1 pr-1 hover:bg-slate-50 transition-colors"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900 leading-tight">{state.currentUser.name}</div>
                    <div className="text-xs text-brand-red mt-0.5">{state.currentUser.role}</div>
                  </div>
                  <img
                    src={
                      state.currentUser.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                        (state.currentUser.name || 'User').replace(/\s/g, ''),
                      )}`
                    }
                    className="w-11 h-11 rounded-full border-2 border-white shadow-md bg-slate-50 object-cover"
                    alt=""
                  />
                </button>
                {userMenuOpen && createPortal(
                  <>
                    <div className="fixed inset-0 z-[9998]" aria-hidden onClick={() => setUserMenuOpen(false)} />
                    <div className="fixed right-8 top-20 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-[9999]">
                      <button
                        type="button"
                        onClick={() => { setUserMenuOpen(false); window.location.hash = '#/profile'; }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <UserCircle size={18} className="text-slate-500" />
                        Core Identity
                      </button>
                      <button
                        type="button"
                        onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <LogOut size={18} className="text-slate-500" />
                        Logout
                      </button>
                    </div>
                  </>,
                  document.body
                )}
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-16 bg-slate-100/30">
              <Routes>
                {hasPower('DASHBOARD_VIEW') && <Route path="/" element={<EmployeeDashboardView />} />}
                {hasPower('SPACES_VIEW') && <Route path="/spaces" element={<SpacesView mode="employee" />} />}
                {hasPower('ATTENDANCE_VIEW') && <Route path="/attendance" element={<AttendanceView mode="employee" />} />}
                {hasPower('PROFILE_VIEW') && <Route path="/profile" element={<EmployeeProfileView state={state} updateState={updateState} />} />}
                {hasPower('WORKSPACES_VIEW') && <Route path="/project/:projectId" element={<EmployeeProjectDetailView />} />}
                {hasPower('WORKSPACES_VIEW') && <Route path="/workspaces/*" element={<WorkspacesView state={state} updateState={updateState} />} />}
                {hasPower('YEARLY_VIEW') && <Route path="/yearly" element={<YearlyView state={state} updateState={updateState} />} />}
                {hasPower('QUARTERLY_VIEW') && <Route path="/quarterly" element={<QuarterlyView state={state} updateState={updateState} />} />}
                {hasPower('MONTHLY_VIEW') && <Route path="/monthly" element={<MonthlyView state={state} updateState={updateState} />} />}
                {hasPower('WEEKLY_VIEW') && <Route path="/weekly" element={<WeeklyView state={state} updateState={updateState} />} />}
                {hasPower('DAILY_VIEW') && <Route path="/daily" element={<DailyView state={state} updateState={updateState} />} />}
                {hasPower('REFLECTION_VIEW') && <Route path="/reflection" element={<ReflectionView state={state} updateState={updateState} />} />}
                {hasPower('COMMUNICATION_VIEW') && <Route path="/communication" element={<CommunicationView />} />}
                {hasPower('STAFF_VIEW') && <Route path="/staff" element={<StaffView />} />}
                <Route path="*" element={<AccessDenied />} />
              </Routes>
            </div>
          </main>
        </div>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <div className="h-screen flex overflow-hidden bg-[#f1f5f9]">
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-24'} h-full min-h-0 bg-brand-charcoal text-white transition-all duration-500 flex flex-col z-50 shadow-2xl relative shrink-0`}>
          <div className="absolute top-0 right-0 w-[2px] h-full bg-brand-red opacity-20"></div>
          
          <div className="p-4 border-b border-white/5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 bg-brand-red flex items-center justify-center rounded shadow-lg shrink-0">
                <span className="text-white text-lg">RG</span>
              </div>
              {isSidebarOpen && <span className="text-md text-brand-red truncate">{state.uiConfig.sidebarLogoName}</span>}
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <Menu size={20} />
            </button>
          </div>
          <nav className="flex-1 min-h-0 py-6 space-y-2 overflow-y-auto overflow-x-hidden px-4">
            {hasPower('DASHBOARD_VIEW') && <SidebarLink to="/" icon={<LayoutDashboard size={20}/>} label={isSuperAdmin ? 'Dashboard' : state.uiConfig.dashboardTitle} collapsed={!isSidebarOpen} />}
            {!isSuperAdmin && (
              <>
                {hasPower('WORKSPACES_VIEW') && <SidebarLink to="/workspaces" icon={<Briefcase size={20}/>} label={state.uiConfig.operationsTitle} collapsed={!isSidebarOpen} />}
                {hasPower('SPACES_VIEW') && <SidebarLink to="/spaces" icon={<Database size={20} />} label="TaskHub" collapsed={!isSidebarOpen} />}
                {hasPower('ATTENDANCE_VIEW') && <SidebarLink to="/attendance" icon={<Clock size={20} />} label="Manage Attendance" collapsed={!isSidebarOpen} />}
                <div className="h-px bg-white/5 mx-4 my-6"></div>
                {visionNavItems.map((item) =>
                  hasPower(item.power) ? (
                    <SidebarLink
                      key={item.to}
                      to={item.to}
                      icon={item.icon}
                      label={item.label}
                      collapsed={!isSidebarOpen}
                    />
                  ) : null,
                )}
                {hasPower('DAILY_VIEW') && <SidebarLink to="/daily" icon={<Clock size={20}/>} label={state.uiConfig.dailyTitle} collapsed={!isSidebarOpen} />}
                {hasPower('REFLECTION_VIEW') && <SidebarLink to="/reflection" icon={<BrainCircuit size={20}/>} label={state.uiConfig.reflectionTitle} collapsed={!isSidebarOpen} />}
                <div className="h-px bg-white/5 mx-4 my-6"></div>
              </>
            )}
            {hasPower('EMPLOYEE_CREATE') && (
              <SidebarLink to="/employees/add" icon={<UserPlus size={20}/>} label={isSuperAdmin ? 'Add Branch' : 'Add Employee'} collapsed={!isSidebarOpen} />
            )}
            {isAdmin && (
              <SidebarLink to="/permissions" icon={<ShieldAlert size={20}/>} label="Permissions" collapsed={!isSidebarOpen} />
            )}
            {hasPower('COMMUNICATION_VIEW') && <SidebarLink to="/communication" icon={<Mail size={20}/>} label={communicationUnreadCount > 0 ? `Communication (${communicationUnreadCount})` : 'Communication'} collapsed={!isSidebarOpen} />}
            {isAdmin && hasPower('FEEDBACK_VIEW') && (
              <SidebarLink to="/feedback" icon={<Mail size={20}/>} label="Feedback" collapsed={!isSidebarOpen} />
            )}
            {hasPower('STAFF_VIEW') && <SidebarLink to="/staff" icon={<ShieldCheck size={20} />} label="Staff" collapsed={!isSidebarOpen} />}
          </nav>
        </aside>

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-end px-8 shrink-0 z-40 relative">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-4 rounded-xl py-1 pr-1 hover:bg-slate-50 transition-colors"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900 leading-tight">{state.currentUser.name}</div>
                    <div className="text-xs text-brand-red mt-0.5">{state.currentUser.role}</div>
                  </div>
                  <img
                    src={
                      state.currentUser.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                        (state.currentUser.name || 'User').replace(/\s/g, ''),
                      )}`
                    }
                    className="w-11 h-11 rounded-full border-2 border-white shadow-md bg-slate-50 object-cover"
                    alt=""
                  />
                </button>
                {userMenuOpen && createPortal(
                  <>
                    <div className="fixed inset-0 z-[9998]" aria-hidden onClick={() => setUserMenuOpen(false)} />
                    <div className="fixed right-8 top-20 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-[9999]">
                      <button
                        type="button"
                        onClick={() => { setUserMenuOpen(false); window.location.hash = '#/profile'; }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <UserCircle size={18} className="text-slate-500" />
                        Core Identity
                      </button>
                      <button
                        type="button"
                        onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <LogOut size={18} className="text-slate-500" />
                        Logout
                      </button>
                    </div>
                  </>,
                  document.body
                )}
              </div>
            </header>
          <div className="flex-1 overflow-y-auto p-16 bg-slate-100/30 no-scrollbar">
            <Routes>
              {hasPower('DASHBOARD_VIEW') && <Route path="/" element={<DashboardView state={state} />} />}
              {hasPower('SPACES_VIEW') && <Route path="/spaces" element={<SpacesView mode="manager" state={state} updateState={updateState} />} />}
              {hasPower('ATTENDANCE_VIEW') && <Route path="/attendance" element={<AttendanceView mode="manager" />} />}
              {hasPower('EMPLOYEE_CREATE') && <Route path="/employees/add" element={<AddEmployeeView state={state} />} />}
              {hasPower('PROFILE_VIEW') && <Route path="/profile" element={<ProfileView state={state} updateState={updateState} />} />}
              {hasPower('WORKSPACES_VIEW') && <Route path="/workspaces/*" element={<WorkspacesView state={state} updateState={updateState} />} />}
              {hasPower('YEARLY_VIEW') && <Route path="/yearly" element={<YearlyView state={state} updateState={updateState} />} />}
              {hasPower('QUARTERLY_VIEW') && <Route path="/quarterly" element={<QuarterlyView state={state} updateState={updateState} />} />}
              {hasPower('MONTHLY_VIEW') && <Route path="/monthly" element={<MonthlyView state={state} updateState={updateState} />} />}
              {hasPower('WEEKLY_VIEW') && <Route path="/weekly" element={<WeeklyView state={state} updateState={updateState} />} />}
              {hasPower('DAILY_VIEW') && <Route path="/daily" element={<DailyView state={state} updateState={updateState} />} />}
              {hasPower('REFLECTION_VIEW') && <Route path="/reflection" element={<ReflectionView state={state} updateState={updateState} />} />}
              {hasPower('COMMUNICATION_VIEW') && <Route path="/communication" element={<CommunicationView />} />}
              {isAdmin && hasPower('FEEDBACK_VIEW') && <Route path="/feedback" element={<FeedbackView />} />}
              {isAdmin && (
                <Route
                  path="/permissions"
                  element={<PermissionsView canEdit={true} />}
                />
              )}
              {hasPower('STAFF_VIEW') && <Route path="/staff" element={<StaffView />} />}
              <Route path="*" element={<AccessDenied />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

const SidebarLink: React.FC<{ to: string; icon: any; label: string; collapsed: boolean }> = ({ to, icon, label, collapsed }) => {
  const location = useLocation();
  const isActive = to === '/workspaces'
    ? location.pathname.startsWith('/workspaces')
    : to.startsWith('/employees')
    ? location.pathname.startsWith('/employees')
    : location.pathname === to;
  return (
    <Link to={to} className={`flex items-center gap-6 px-7 py-5 rounded transition-all group ${isActive ? 'bg-brand-red text-white shadow-xl' : 'text-slate-500 hover:bg-white/5 hover:text-white'} ${collapsed ? 'justify-center px-0' : ''}`}>
      <div className={`${isActive ? 'scale-110 text-white' : 'opacity-70 text-slate-500 group-hover:text-brand-red group-hover:opacity-100'} transition-transform shrink-0`}>{icon}</div>
      {!collapsed && (isActive
        ? <span className="text-[14px] text-white truncate">{label}</span>
        : <span className="text-[14px] truncate group-hover:text-brand-red">{label}</span>
      )}
    </Link>
  );
};

export default App;
