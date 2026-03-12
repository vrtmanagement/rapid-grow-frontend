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

const SUPER_ADMIN_EMAIL = 'superadmin@example.com';

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

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isVisionsOpen, setIsVisionsOpen] = useState(true);

  useEffect(() => {
    const adminStored = localStorage.getItem('rapidgrow-admin');
    setIsAuthenticated(!!adminStored);
    if (adminStored) {
      try {
        const { employee } = JSON.parse(adminStored);
        const roleMap = { SUPER_ADMIN: 'Admin', ADMIN: 'Admin', TEAM_LEAD: 'Leader', EMPLOYEE: 'Employee' };
        const powersMap: Record<string, string[]> = {
          SUPER_ADMIN: ['PROJECT_CREATE', 'PROJECT_DELETE', 'PROJECT_LAUNCH', 'TASK_AI_GENERATE', 'UI_EDIT', 'TEAM_MANAGE', 'VIEW_REPORTS', 'EDIT_STRATEGY'],
          ADMIN: ['PROJECT_CREATE', 'PROJECT_DELETE', 'PROJECT_LAUNCH', 'TASK_AI_GENERATE', 'TEAM_MANAGE'],
          TEAM_LEAD: ['PROJECT_CREATE', 'PROJECT_LAUNCH', 'TASK_AI_GENERATE'],
          EMPLOYEE: [],
        };
        setState(prev => ({
          ...prev,
            currentUser: {
              id: employee._id || employee.empId,
              name: employee.empName || 'Admin',
              role: roleMap[employee.role as keyof typeof roleMap] || 'Employee',
              email: employee.email || '',
              avatar:
                employee.avatar && typeof employee.avatar === 'string' && employee.avatar.trim()
                  ? employee.avatar
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${(employee.empName || 'Admin').replace(/\s/g, '')}`,
              status: 'Active',
              isVerified: true,
              powers: powersMap[employee.role as keyof typeof powersMap] || [],
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

  const [state, setState] = useState<PlanningState>({
    currentYear: 2026,
    currentUser: INITIAL_TEAM[0],
    profile: EMPTY_PROFILE,
    uiConfig: DEFAULT_UI_CONFIG,
    yearlyGoals: [
      { id: '1', text: 'Achieve $10M ARR', completed: false, level: 'year' },
      { id: '2', text: 'Expand to 3 Global Regions', completed: false, level: 'year' },
      { id: '3', text: 'Build Performance-First Culture', completed: false, level: 'year' },
    ],
    quarterlyGoals: [
      { id: 'q1', text: '', completed: false, level: 'quarter' },
      { id: 'q2', text: '', completed: false, level: 'quarter' },
      { id: 'q3', text: '', completed: false, level: 'quarter' },
    ],
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
  });

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
            const roleMap = { SUPER_ADMIN: 'Admin', ADMIN: 'Admin', TEAM_LEAD: 'Leader', EMPLOYEE: 'Employee' };
            const powersMap: Record<string, string[]> = {
              SUPER_ADMIN: ['PROJECT_CREATE', 'PROJECT_DELETE', 'PROJECT_LAUNCH', 'TASK_AI_GENERATE', 'UI_EDIT', 'TEAM_MANAGE', 'VIEW_REPORTS', 'EDIT_STRATEGY'],
              ADMIN: ['PROJECT_CREATE', 'PROJECT_DELETE', 'PROJECT_LAUNCH', 'TASK_AI_GENERATE', 'TEAM_MANAGE'],
              TEAM_LEAD: ['PROJECT_CREATE', 'PROJECT_LAUNCH', 'TASK_AI_GENERATE'],
              EMPLOYEE: [],
            };
            currentUser = {
              id: employee._id || employee.empId,
              name: employee.empName || 'Admin',
              role: roleMap[employee.role as keyof typeof roleMap] || 'Employee',
              email: employee.email || '',
              avatar:
                employee.avatar && typeof employee.avatar === 'string' && employee.avatar.trim()
                  ? employee.avatar
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${(employee.empName || 'Admin').replace(/\s/g, '')}`,
              status: 'Active',
              isVerified: true,
              powers: powersMap[employee.role as keyof typeof powersMap] || [],
            };
          } catch (_e) { /* ignore */ }
        }
        setState({ ...parsed, currentUser });
      } catch (e) {
        console.error("Restore failed", e);
      }
    }
  }, []);

  useEffect(() => {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem('rapidgrow-os-v1', serialized);
    } catch (e) {
      console.error('Failed to persist rapidgrow-os state', e);
    }
  }, [state]);

  const updateState = useCallback((updater: (prev: PlanningState) => PlanningState) => {
    setState(prev => {
      const next = updater(prev);
      const tIdx = next.team.findIndex(m => m.id === next.currentUser.id);
      if (tIdx !== -1) next.team[tIdx] = { ...next.currentUser };
      return next;
    });
  }, []);

  const isSuperAdmin = state.currentUser.role === 'Admin' && state.currentUser.powers?.includes('EDIT_STRATEGY');
  const isAdmin = state.currentUser.role === 'Admin';

  if (isAuthenticated === null) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
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
              <SidebarLink to="/" icon={<LayoutDashboard size={20} />} label={state.uiConfig.dashboardTitle} collapsed={false} />
              <SidebarLink to="/spaces" icon={<Database size={20} />} label="Spaces" collapsed={false} />
              <SidebarLink to="/attendance" icon={<Clock size={20} />} label="Manage Attendance" collapsed={false} />
              <div className="h-px bg-white/5 mx-4 my-6"></div>
              <button
                type="button"
                onClick={() => setIsVisionsOpen((v) => !v)}
                className="w-full text-left px-7 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-black hover:text-brand-red hover:bg-brand-red/5 rounded-lg"
              >
                Visions
              </button>
              {isVisionsOpen && (
                <>
                  <SidebarLink to="/yearly" icon={<Target size={20}/>} label={state.uiConfig.yearlyTitle} collapsed={false} />
                  <SidebarLink to="/quarterly" icon={<BarChart3 size={20}/>} label={state.uiConfig.quarterlyTitle} collapsed={false} />
                  <SidebarLink to="/monthly" icon={<Calendar size={20}/>} label={state.uiConfig.monthlyTitle} collapsed={false} />
                  <SidebarLink to="/weekly" icon={<CheckSquare size={20}/>} label={state.uiConfig.weeklyTitle} collapsed={false} />
                </>
              )}
              <div className="h-px bg-white/5 mx-4 my-6"></div>
              <SidebarLink to="/daily" icon={<Clock size={20}/>} label={state.uiConfig.dailyTitle} collapsed={false} />
              <SidebarLink to="/reflection" icon={<BrainCircuit size={20}/>} label={state.uiConfig.reflectionTitle} collapsed={false} />
              <div className="h-px bg-white/5 mx-4 my-6"></div>
              <SidebarLink to="/staff" icon={<ShieldCheck size={20} />} label="Staff" collapsed={false} />
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
                <Route path="/" element={<EmployeeDashboardView />} />
                <Route path="/spaces" element={<SpacesView mode="employee" />} />
                <Route path="/attendance" element={<AttendanceView mode="employee" />} />
                <Route path="/profile" element={<EmployeeProfileView state={state} updateState={updateState} />} />
                <Route path="/project/:projectId" element={<EmployeeProjectDetailView />} />
                <Route path="/workspaces/*" element={<WorkspacesView state={state} updateState={updateState} />} />
                <Route path="/yearly" element={<YearlyView state={state} updateState={updateState} />} />
                <Route path="/quarterly" element={<QuarterlyView state={state} updateState={updateState} />} />
                <Route path="/monthly" element={<MonthlyView state={state} updateState={updateState} />} />
                <Route path="/weekly" element={<WeeklyView state={state} updateState={updateState} />} />
                <Route path="/daily" element={<DailyView state={state} updateState={updateState} />} />
                <Route path="/reflection" element={<ReflectionView state={state} updateState={updateState} />} />
                <Route path="/staff" element={<StaffView />} />
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
            <SidebarLink to="/" icon={<LayoutDashboard size={20}/>} label={isSuperAdmin ? 'Dashboard' : state.uiConfig.dashboardTitle} collapsed={!isSidebarOpen} />
            {!isSuperAdmin && (
              <>
                <SidebarLink to="/workspaces" icon={<Briefcase size={20}/>} label={state.uiConfig.operationsTitle} collapsed={!isSidebarOpen} />
                <SidebarLink to="/spaces" icon={<Database size={20} />} label="Spaces" collapsed={!isSidebarOpen} />
                <SidebarLink to="/attendance" icon={<Clock size={20} />} label="Manage Attendance" collapsed={!isSidebarOpen} />
                <div className="h-px bg-white/5 mx-4 my-6"></div>
                <button
                  type="button"
                  onClick={() => setIsVisionsOpen((v) => !v)}
                  className={`w-full text-left px-7 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 hover:text-white/80 hover:bg-white/5 rounded-lg ${
                    !isSidebarOpen ? 'hidden' : ''
                  }`}
                >
                  Visions
                </button>
                {isVisionsOpen && (
                  <>
                    <SidebarLink to="/yearly" icon={<Target size={20}/>} label={state.uiConfig.yearlyTitle} collapsed={!isSidebarOpen} />
                    <SidebarLink to="/quarterly" icon={<BarChart3 size={20}/>} label={state.uiConfig.quarterlyTitle} collapsed={!isSidebarOpen} />
                    <SidebarLink to="/monthly" icon={<Calendar size={20}/>} label={state.uiConfig.monthlyTitle} collapsed={!isSidebarOpen} />
                    <SidebarLink to="/weekly" icon={<CheckSquare size={20}/>} label={state.uiConfig.weeklyTitle} collapsed={!isSidebarOpen} />
                  </>
                )}
                <SidebarLink to="/daily" icon={<Clock size={20}/>} label={state.uiConfig.dailyTitle} collapsed={!isSidebarOpen} />
                <SidebarLink to="/reflection" icon={<BrainCircuit size={20}/>} label={state.uiConfig.reflectionTitle} collapsed={!isSidebarOpen} />
                <div className="h-px bg-white/5 mx-4 my-6"></div>
              </>
            )}
            <SidebarLink to="/employees/add" icon={<UserPlus size={20}/>} label={isSuperAdmin ? 'Add Branch' : 'Add Employee'} collapsed={!isSidebarOpen} />
            {isAdmin && (
              <SidebarLink to="/feedback" icon={<Mail size={20}/>} label="Feedback" collapsed={!isSidebarOpen} />
            )}
            <SidebarLink to="/staff" icon={<ShieldCheck size={20} />} label="Staff" collapsed={!isSidebarOpen} />
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
              <Route path="/" element={<DashboardView state={state} />} />
              <Route path="/spaces" element={<SpacesView mode="manager" state={state} updateState={updateState} />} />
              <Route path="/attendance" element={<AttendanceView mode="manager" />} />
              <Route path="/employees/add" element={<AddEmployeeView state={state} />} />
              <Route path="/profile" element={<ProfileView state={state} updateState={updateState} />} />
              <Route path="/workspaces/*" element={<WorkspacesView state={state} updateState={updateState} />} />
              <Route path="/yearly" element={<YearlyView state={state} updateState={updateState} />} />
              <Route path="/quarterly" element={<QuarterlyView state={state} updateState={updateState} />} />
              <Route path="/monthly" element={<MonthlyView state={state} updateState={updateState} />} />
              <Route path="/weekly" element={<WeeklyView state={state} updateState={updateState} />} />
              <Route path="/daily" element={<DailyView state={state} updateState={updateState} />} />
              <Route path="/reflection" element={<ReflectionView state={state} updateState={updateState} />} />
              {isAdmin && <Route path="/feedback" element={<FeedbackView />} />}
              <Route path="/staff" element={<StaffView />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

const SidebarLink = ({ to, icon, label, collapsed }: { to: string, icon: any, label: string, collapsed: boolean }) => {
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
