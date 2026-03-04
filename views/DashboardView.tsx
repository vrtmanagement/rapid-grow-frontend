import React, { useState, useEffect } from 'react';
import { PlanningState, WorkspaceTask } from '../types';
import { Target, Calendar, Clock, BarChart3, TrendingUp, Award, Users, CheckCircle2, Zap, User, Sparkles, Diamond, UserPlus, Shield, Mail, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { API_BASE, getAuthHeaders } from '../config/api';

interface Props {
  state: PlanningState;
}

interface EmployeeRow {
  _id: string;
  empId: string;
  empName: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

const DashboardView: React.FC<Props> = ({ state }) => {
  const [viewScope, setViewScope] = useState<'individual' | 'team'>('individual');
  const [allAdmins, setAllAdmins] = useState<EmployeeRow[]>([]);
  const [adminsLoaded, setAdminsLoaded] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<EmployeeRow | null>(null);
  const isSuperAdmin = state.currentUser.role === 'Admin' && state.currentUser.powers?.includes('EDIT_STRATEGY');

  useEffect(() => {
    if (!isSuperAdmin) return;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const list: EmployeeRow[] = Array.isArray(data) ? data : [];
          const adminsOnly = list.filter(
            (e) => (e.role || '').toUpperCase() === 'SUPER_ADMIN' || (e.role || '').toUpperCase() === 'ADMIN'
          );
          setAllAdmins(adminsOnly);
        }
      } catch (e) {
        console.error('Failed to load employees', e);
      } finally {
        setAdminsLoaded(true);
      }
    };
    load();
  }, [isSuperAdmin]);

  const allTasks: WorkspaceTask[] = state.workspaces.flatMap(ws => 
    ws.projects.flatMap(p => p.tasks)
  );

  const myTasks = allTasks.filter(t => t.assigneeId === state.currentUser.id);
  const currentScopeTasks = viewScope === 'individual' ? myTasks : allTasks;

  const completedCount = currentScopeTasks.filter(t => t.status === 'done').length;
  const totalCount = currentScopeTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const teamStats = state.team.map(member => {
    const memberTasks = allTasks.filter(t => t.assigneeId === member.id);
    const completedTasks = memberTasks.filter(t => t.status === 'done');
    return {
      name: member.name.split(' ')[0],
      tasks: memberTasks.length,
      completed: completedTasks.length,
      rate: memberTasks.length > 0 ? Math.round((completedTasks.length / memberTasks.length) * 100) : 0
    };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
            <div className="flex items-center gap-2 mb-3">
            <div className="h-1.5 w-8 bg-brand-red rounded-full"></div>
            <span className="text-[15px] text-slate-500">Executive Performance Hub</span>
          </div>
          <h2 className="text-4xl text-slate-900 leading-none">{isSuperAdmin ? 'Dashboard' : state.uiConfig.dashboardTitle}</h2>
          <p className="text-slate-500 text-lg mt-3">{state.uiConfig.dashboardSub}</p>
        </div>
        
        <div className="flex items-center gap-4">
           <Link
             to="/employees/add"
             className="flex items-center gap-3 px-8 py-3 rounded-xl bg-brand-red text-white text-[15px] font-bold shadow-lg hover:bg-brand-navy transition-all"
           >
             <UserPlus size={18} /> {isSuperAdmin ? 'Add Branch' : 'Add Emp'}
           </Link>
           {!isSuperAdmin && (
           <div className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xl">
           <button 
            onClick={() => setViewScope('individual')}
            className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[15px] transition-all ${viewScope === 'individual' ? 'bg-brand-red text-white shadow-lg' : 'text-slate-800 hover:text-brand-red'}`}
           >
             <User size={16} /> Individual
           </button>
           <button 
            onClick={() => setViewScope('team')}
            className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[15px] transition-all ${viewScope === 'team' ? 'bg-brand-red text-white shadow-lg' : 'text-slate-800 hover:text-brand-red'}`}
           >
             <Users size={16} /> Team Dynamics
           </button>
           </div>
           )}
        </div>
      </div>

      {isSuperAdmin && (
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-red/10 flex items-center justify-center">
              <Shield className="text-brand-red" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Admins & Super Admins</h3>
              <p className="text-sm text-slate-500">Super Admins and Admins only</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {!adminsLoaded && (
              <p className="col-span-full text-slate-500 py-8 text-center">Loading…</p>
            )}
            {adminsLoaded && allAdmins.length === 0 && (
              <p className="col-span-full text-slate-500 py-8 text-center">No admins found.</p>
            )}
            {allAdmins.map((emp) => (
              <button
                key={emp._id}
                type="button"
                onClick={() => setSelectedAdmin(emp)}
                className="w-full text-left flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-brand-red/30 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-red/30"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-brand-red font-bold text-lg shrink-0">
                  {(emp.empName || emp.empId || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">{emp.empName || emp.empId}</p>
                  <p className="text-xs text-slate-500 truncate">{emp.empId}</p>
                  {(emp.role || emp.designation) && (
                    <p className="text-xs text-brand-red font-medium mt-0.5">{emp.role || emp.designation}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isSuperAdmin && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedAdmin(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Admin Details</h3>
              <button
                type="button"
                onClick={() => setSelectedAdmin(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red font-bold text-2xl">
                  {(selectedAdmin.empName || selectedAdmin.empId || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{selectedAdmin.empName || selectedAdmin.empId}</p>
                  <p className="text-sm text-brand-red font-semibold">{selectedAdmin.role || '—'}</p>
                </div>
              </div>
              {[
                { label: 'Employee ID', value: selectedAdmin.empId },
                { label: 'Email', value: selectedAdmin.email },
                { label: 'Phone', value: selectedAdmin.phone },
                { label: 'Designation', value: selectedAdmin.designation },
                { label: 'Department', value: selectedAdmin.department },
                { label: 'Status', value: selectedAdmin.status },
                { label: 'Created At', value: selectedAdmin.createdAt ? new Date(selectedAdmin.createdAt).toLocaleString() : null },
              ].filter((r) => r.value).map((row) => (
                <div key={row.label} className="flex justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">{row.label}</span>
                  <span className="text-sm font-medium text-slate-900 text-right">{String(row.value)}</span>
                </div>
              ))}
              {Object.entries(selectedAdmin)
                .filter(([k]) => !['_id', 'empId', 'empName', 'email', 'phone', 'designation', 'department', 'role', 'status', 'createdAt'].includes(k))
                .filter(([, v]) => v != null && v !== '')
                .map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-500">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</span>
                    <span className="text-sm font-medium text-slate-900 text-right">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {!isSuperAdmin && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard icon={<CheckCircle2 className="text-brand-red" />} label="Mission Cleared" value={completedCount} sub="Units Resolved" color="bg-red-50" />
            <StatCard icon={<TrendingUp className="text-slate-600" />} label="Active Pipeline" value={currentScopeTasks.length} sub="Deployed Units" color="bg-slate-100" />
            <StatCard icon={<Award className="text-brand-red" />} label="Critical Path" value={currentScopeTasks.filter(t => t.priority === 'high').length} sub="High Value" color="bg-red-50" />
            <StatCard icon={<Zap className="text-amber-500" />} label="VRT Velocity" value={`${progressPercent}%`} sub="System Rating" color="bg-amber-50" />
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 bg-white p-12 rounded-[2rem] shadow-2xl border border-slate-200 relative overflow-hidden">
              <div className="flex items-center justify-between mb-12">
                <div>
                   <h3 className="text-2xl text-slate-900">Execution Matrix</h3>
                   <p className="text-[15px] text-slate-800 mt-1">Real-Time Performance Throughput</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-100">
                   <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></div>
                   <span className="text-[15px] text-slate-600">Live Feed Active</span>
                </div>
              </div>
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontWeight: 800}} />
                    <Bar dataKey="rate" fill="#dc2626" radius={[8, 8, 0, 0]} barSize={50} name="Velocity %">
                      {teamStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.rate > 80 ? '#dc2626' : '#475569'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-900 p-12 rounded-[2rem] text-white shadow-2xl relative overflow-hidden flex flex-col group">
               <div className="absolute top-0 right-0 w-full h-1.5 bg-brand-red"></div>
               <div className="relative z-10 flex-1">
                <div className="flex items-center justify-between mb-10">
                   <h3 className="text-xl tracking-tighter">Strategic ops</h3>
                   <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-brand-red">
                      <Target size={16} />
                   </div>
                 </div>
                 <div className="space-y-6">
                   {currentScopeTasks.slice(-7).reverse().map((task, i) => (
                     <div key={i} className="flex items-center justify-between group/item border-b border-white/5 pb-4">
                       <div className="flex items-center gap-4">
                         <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-brand-red' : 'bg-slate-600'}`}></div>
                         <span className="text-md truncate max-w-[150px] text-slate-300 group-hover/item:text-white transition-colors">{task.title}</span>
                       </div>
                       <span className="text-[9px] text-slate-500">{task.status}</span>
                     </div>
                   ))}
                   {currentScopeTasks.length === 0 && (
                    <p className="text-slate-600 text-md text-center py-12">No Deployed Units</p>
                   )}
                 </div>
               </div>
               <div className="mt-10 pt-10 border-t border-white/10 relative z-10">
                  <button className="w-full py-5 bg-brand-red text-white rounded-xl text-[15px] shadow-xl hover:bg-white hover:text-brand-red transition-all">
                     Personnel Audit Log
                  </button>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, sub, color }: any) => (
      <div className={`bg-white p-10 rounded-3xl shadow-sm border border-slate-200 flex items-start gap-8 transition-all hover:shadow-2xl hover:border-brand-red group`}>
    <div className={`p-5 ${color} rounded-2xl group-hover:scale-110 transition-transform`}>{icon}</div>
      <div className="flex flex-col">
      <p className="text-[15px] text-slate-800 mb-3">{label}</p>
      <p className="text-3xl text-slate-900 leading-none">{value}</p>
      <p className="text-[15px] font-bold text-slate-500 mt-3">{sub}</p>
    </div>
  </div>
);

export default DashboardView;
