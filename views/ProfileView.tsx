
import React, { useState } from 'react';
import { PlanningState, TeamMember, UserRole, UserPower, UIConfig } from '../types';
import { User, Shield, Key, Monitor, Palette, Trash2, Lock, ShieldCheck, UserPlus, Command, Eye, EyeOff, ShieldAlert, Zap, Check, Settings, Image as ImageIcon, X } from 'lucide-react';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

type TabKey = 'ME' | 'ADMIN' | 'ARCHITECTURE' | 'SECURITY';

const SUPER_ADMIN_EMAIL = 'akumar@vrt9.com';

const ALL_POWERS: { key: UserPower, label: string, sub: string }[] = [
  { key: 'PROJECT_CREATE', label: 'Create projects', sub: 'Deploy new mission projects.' },
  { key: 'PROJECT_DELETE', label: 'Delete projects', sub: 'Permanently remove projects.' },
  { key: 'PROJECT_LAUNCH', label: 'Launch controls', sub: 'Authorize active transitions.' },
  { key: 'TASK_AI_GENERATE', label: 'Ai synthesis', sub: 'Access Gemini tactical units.' },
  { key: 'UI_EDIT', label: 'Ui branding', sub: 'Modify system nomenclature.' },
  { key: 'TEAM_MANAGE', label: 'Team management', sub: 'Edit roles and permissions.' },
  { key: 'VIEW_REPORTS', label: 'System reports', sub: 'Access analytics and metrics.' },
  { key: 'EDIT_STRATEGY', label: 'Strategic anchors', sub: 'Edit vision and yearly goals.' },
];

const ProfileView: React.FC<Props> = ({ state, updateState }) => {
  const isSuperAdmin = state.currentUser.email === SUPER_ADMIN_EMAIL;
  const [activeTab, setActiveTab] = useState<TabKey>(isSuperAdmin ? 'ADMIN' : 'ME');
  const [showPassword, setShowPassword] = useState(false);
  const [infoDialogMessage, setInfoDialogMessage] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{ id: string; email: string } | null>(null);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');

  const handleUserRecordChange = (updates: Partial<TeamMember>) => {
    updateState(prev => {
      const updatedUser = { ...prev.currentUser, ...updates };
      const updatedTeam = prev.team.map(m => m.id === prev.currentUser.id ? updatedUser : m);
      return { ...prev, currentUser: updatedUser, team: updatedTeam };
    });
  };

  const togglePower = (memberId: string, power: UserPower) => {
    if (!isSuperAdmin) return;
    updateState(prev => ({
      ...prev,
      team: prev.team.map(m => m.id === memberId ? { ...m, powers: m.powers.includes(power) ? m.powers.filter(p => p !== power) : [...m.powers, power] } : m)
    }));
  };

  const handleAddEmployee = () => {
    const email = newEmployeeEmail.trim();
    const name = newEmployeeName.trim();
    if (!email || !name) return;

    const newUnit: TeamMember = {
      id: `u-${Date.now()}`,
      name,
      email,
      role: 'Employee',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      status: 'Active',
      isVerified: true,
      powers: []
    };
    updateState(prev => ({ ...prev, team: [...prev.team, newUnit] }));
    setInfoDialogMessage("Identity synchronized. New unit is now ready for deployment.");
    setIsAddEmployeeModalOpen(false);
    setNewEmployeeEmail('');
    setNewEmployeeName('');
  };

  const handleRemoveEmployee = (id: string, email: string) => {
    if (email === SUPER_ADMIN_EMAIL) return;
    setPendingRemove({ id, email });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pb-24 relative">
      <div className="bg-white p-16 rounded-[4rem] shadow-xl border border-slate-200 overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 border-b border-slate-50 pb-16 mb-16">
           <div className="flex items-center gap-10">
              <div className="w-24 h-24 bg-indigo-950 rounded-[3rem] flex items-center justify-center text-white shadow-3xl rotate-6 group">
                 <Settings size={48} className="group-hover:rotate-180 transition-all duration-1000" />
              </div>
              <div>
                 <h2 className="text-6xl text-slate-900 leading-none">{state.uiConfig.profileTitle}</h2>
                 <p className="text-slate-500 text-xl mt-3">{state.uiConfig.profileSub}</p>
              </div>
           </div>
           {isSuperAdmin && (
             <div className="px-10 py-5 bg-indigo-600 text-white rounded-3xl flex items-center gap-5 shadow-2xl shadow-indigo-100">
                <Command size={24} />
                <span className="text-[12px]">Super Admin (Sovereign)</span>
             </div>
           )}
        </div>

        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar mb-16">
           {(['ME', ...(isSuperAdmin ? ['ADMIN', 'ARCHITECTURE'] : []), 'SECURITY'] as TabKey[]).map(t => (
              <button 
              key={t} 
              onClick={() => setActiveTab(t)} 
              className={`flex items-center gap-5 px-10 py-6 rounded-[2.5rem] text-[12px] transition-all shrink-0 ${activeTab === t ? 'bg-indigo-950 text-white shadow-3xl scale-105' : 'bg-slate-50 text-slate-800 hover:bg-slate-100 hover:text-slate-600'}`}
             >
               {t === 'ME' ? <User size={20}/> : t === 'ADMIN' ? <Shield size={20}/> : t === 'ARCHITECTURE' ? <Monitor size={20}/> : <Key size={20}/>}
              {t === 'ME' ? 'Identity Protocol' : t === 'ADMIN' ? 'Personnel Matrix' : t === 'ARCHITECTURE' ? 'Branding Sovereign' : 'Access History'}
             </button>
           ))}
        </div>

        {isAddEmployeeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
            <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
              <button 
                className="absolute top-4 right-4 text-slate-300 hover:text-indigo-500 transition-colors"
                onClick={() => setIsAddEmployeeModalOpen(false)}
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">Add New Unit</h3>
                  <p className="text-[13px] text-slate-500 font-medium tracking-[0.15em] mt-1 uppercase">
                    Personnel identity provisioning
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-black tracking-[0.2em] text-slate-500 uppercase">
                    Personnel email ID (Unique)
                  </label>
                  <input
                    autoFocus
                    type="email"
                    value={newEmployeeEmail}
                    onChange={e => setNewEmployeeEmail(e.target.value)}
                    className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-slate-900 text-[15px] font-medium outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-slate-50/40"
                    placeholder="name@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-black tracking-[0.2em] text-slate-500 uppercase">
                    Personnel full name
                  </label>
                  <input
                    value={newEmployeeName}
                    onChange={e => setNewEmployeeName(e.target.value)}
                    className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-slate-900 text-[15px] font-medium outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-slate-50/40"
                    placeholder="Full legal name"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  className="px-5 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors uppercase"
                  onClick={() => setIsAddEmployeeModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  disabled={!newEmployeeEmail.trim() || !newEmployeeName.trim()}
                  onClick={handleAddEmployee}
                  className={`px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-indigo-600 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors uppercase ${
                    !newEmployeeEmail.trim() || !newEmployeeName.trim() ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  Save Unit
                </button>
              </div>
            </div>
          </div>
        )}

        {infoDialogMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
            <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
              <button 
                className="absolute top-4 right-4 text-slate-300 hover:text-emerald-500 transition-colors"
                onClick={() => setInfoDialogMessage(null)}
              >
                <Check size={20} />
              </button>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">Identity Synchronized</h3>
                  <p className="text-[13px] text-slate-500 font-medium tracking-[0.15em] mt-1 uppercase">
                    New unit ready for deployment
                  </p>
                </div>
              </div>
              <p className="text-[15px] text-slate-700 mb-8">
                {infoDialogMessage}
              </p>
              <div className="flex justify-end">
                <button
                  className="px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-emerald-500 shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-colors uppercase"
                  onClick={() => setInfoDialogMessage(null)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
            <div className="bg-white rounded-4xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
              <button 
                className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors"
                onClick={() => setPendingRemove(null)}
              >
                <Trash2 size={18} />
              </button>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-md">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">Purge Personnel Unit</h3>
                  <p className="text-[13px] text-slate-500 font-medium tracking-[0.15em] mt-1 uppercase">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <p className="text-[15px] text-slate-700 mb-8">
                Permanently purge this unit from the system architecture? This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-5 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors uppercase"
                  onClick={() => setPendingRemove(null)}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!pendingRemove) return;
                    updateState(prev => ({
                      ...prev,
                      team: prev.team.filter(m => m.id !== pendingRemove.id)
                    }));
                    setPendingRemove(null);
                  }}
                  className="px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-rose-600 shadow-lg shadow-rose-200 hover:bg-rose-700 transition-colors uppercase"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="min-h-[600px] animate-in slide-in-from-bottom-6">
          {activeTab === 'ME' ? (
            <div className="flex flex-col md:flex-row gap-20 items-start">
               <div className="w-full md:w-1/3 flex flex-col items-center gap-12">
                  <div className="aspect-square bg-slate-100 rounded-[4rem] border-[12px] border-white shadow-3xl overflow-hidden relative group">
                     <img src={state.currentUser.avatar} className="w-full h-full object-cover transition-all group-hover:scale-110" alt="Identity visual" />
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-[12px] text-center p-8">
                        Update Avatar URL Below
                     </div>
                  </div>
                  <div className="w-full space-y-6">
                    <label className="text-[15px] text-slate-800 px-4 block text-center">Sovereign Display Name</label>
                    <input 
                      type="text" 
                      value={state.currentUser.name} 
                      onChange={e => handleUserRecordChange({ name: e.target.value })} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-10 py-6 text-center text-2xl text-slate-900 shadow-inner outline-none focus:bg-white focus:border-indigo-500 transition-all" 
                    />
                  </div>
               </div>
               <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-10">
                  <UIField label="Email identification" value={state.currentUser.email} readOnly />
                  <div className="space-y-4">
                     <label className="text-[15px] text-slate-800 px-4">Access Key (Password)</label>
                     <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={state.currentUser.password || ''} 
                          onChange={e => handleUserRecordChange({ password: e.target.value })} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-10 py-6 text-md font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner focus:ring-8 focus:ring-indigo-50" 
                        />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-800">
                          {showPassword ? <EyeOff size={22}/> : <Eye size={22}/>}
                        </button>
                     </div>
                  </div>
                  <div className="col-span-2">
                    <UIField label="Direct avatar image URL" value={state.currentUser.avatar} onChange={(v:any) => handleUserRecordChange({ avatar: v })} />
                    <p className="mt-3 px-4 text-[15px] text-slate-800 opacity-60">Synchronizes your visual signature across the entire OS environment.</p>
                  </div>
                  <div className="col-span-2 p-12 bg-indigo-950 text-white rounded-[4rem] flex items-center justify-between shadow-3xl border border-white/5 relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-transparent"></div>
                     <div className="flex items-center gap-10 relative z-10">
                        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform"><ShieldCheck size={44}/></div>
                        <div>
                           <div className="text-4xl">Assigned Rank: {state.currentUser.role}</div>
                           <div className="text-[15px] text-indigo-400 mt-2">{state.currentUser.powers.length} Active Operational Powers</div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          ) : activeTab === 'ADMIN' ? (
            <div className="space-y-16">
               <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-4xl text-slate-900">Personnel Matrix</h3>
                    <p className="text-slate-500 text-lg  mt-2">Manage the lifecycle of all organizational units.</p>
                  </div>
                  <button onClick={() => { setNewEmployeeEmail(''); setNewEmployeeName(''); setIsAddEmployeeModalOpen(true); }} className="px-10 py-6 bg-indigo-600 text-white rounded-[3rem] shadow-2xl hover:bg-indigo-700 transition-all flex items-center gap-4">
                    <UserPlus size={24}/> Add new unit
                  </button>
               </div>
               <div className="grid grid-cols-1 gap-10">
                 {state.team.map(m => (
                   <div key={m.id} className="bg-white rounded-[5rem] p-16 border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-16 relative overflow-hidden group hover:shadow-2xl transition-all">
                      <div className="absolute top-0 left-0 w-3 h-full bg-indigo-600"></div>
                      <div className="lg:w-80 space-y-10 shrink-0">
                         <div className="relative">
                            <img src={m.avatar} className="w-32 h-32 rounded-[3rem] border-8 border-slate-50 shadow-3xl group-hover:rotate-6 transition-transform" alt={m.name} />
                         </div>
                         <div className="space-y-2">
                            <h4 className="text-3xl text-slate-900 leading-none">{m.name}</h4>
                            <p className="text-[15px] font-bold text-slate-800  tracking-widest">{m.email}</p>
                         </div>
                         <div className="space-y-4">
                            <label className="text-[15px] text-slate-800 block px-2">Assigned Unit Rank</label>
                            <select 
                              value={m.role} 
                              onChange={e => updateState(p => ({ ...p, team: p.team.map(um => um.id === m.id ? { ...um, role: e.target.value as UserRole } : um) }))} 
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[12px] outline-none focus:ring-8 focus:ring-indigo-50 transition-all"
                            >
                               <option value="Admin">Super admin / admin</option>
                               <option value="Leader">Team leader</option>
                               <option value="Employee">Employee unit</option>
                            </select>
                         </div>
                         <div className="flex flex-col gap-3">
                           {m.email !== SUPER_ADMIN_EMAIL && (
                            <button onClick={() => handleRemoveEmployee(m.id, m.email)} className="w-full py-5 bg-rose-50 text-rose-600 rounded-2xl text-[15px] hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-3">
                               <Trash2 size={20}/> Purge unit
                             </button>
                           )}
                           <button onClick={() => updateState(p => ({ ...p, team: p.team.map(um => um.id === m.id ? { ...um, status: um.status === 'Active' ? 'Inactive' : 'Active' } : um) }))} className="w-full py-5 bg-slate-100 text-slate-600 rounded-2xl text-[15px] hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-3">
                              {m.status === 'Active' ? <Lock size={20}/> : <ShieldCheck size={20}/>}
                              {m.status === 'Active' ? 'Deauthorize unit' : 'Reauthorize unit'}
                           </button>
                         </div>
                      </div>
                      <div className="flex-1">
                         <div className="text-[15px] text-slate-800 mb-10 flex items-center gap-3"><Zap size={18} className="text-indigo-600"/> Sovereignty Matrix Delegation</div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {ALL_POWERS.map(p => (
                               <div 
                                key={p.key} 
                                onClick={() => togglePower(m.id, p.key)} 
                                className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer flex items-center gap-6 ${m.powers.includes(p.key) ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100' : 'bg-slate-50 text-slate-800 border-slate-100 opacity-60 hover:opacity-100'}`}
                               >
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${m.powers.includes(p.key) ? 'bg-white/20' : 'bg-slate-200'}`}>
                                     {m.powers.includes(p.key) ? <Check size={20}/> : <Zap size={20}/>}
                                  </div>
                                  <div>
                                     <div className="text-[13px]">{p.label}</div>
                                     <div className={`text-[15px] font-bold leading-none mt-2 ${m.powers.includes(p.key) ? 'text-indigo-100' : 'text-slate-800'}`}>{p.sub}</div>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          ) : activeTab === 'ARCHITECTURE' ? (
            <div className="space-y-16">
               <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-4xl text-slate-900">System Nomenclature Sovereign</h3>
                    <p className="text-slate-500 text-lg mt-2 ">Redefine every system heading to align with organizational branding.</p>
                  </div>
                  <div className="p-6 bg-indigo-950 text-indigo-400 rounded-3xl shadow-3xl"><Monitor size={48}/></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                 {Object.keys(state.uiConfig).map(k => (
                   <UIField 
                    key={k} 
                    label={k.replace(/([A-Z])/g, ' $1').toLowerCase()} 
                    value={(state.uiConfig as any)[k]} 
                    onChange={(v:any) => updateState(p => ({ ...p, uiConfig: { ...p.uiConfig, [k]: v } }))} 
                   />
                 ))}
               </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto py-20 text-center space-y-10">
               <div className="w-40 h-40 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl"><ShieldCheck size={80}/></div>
               <h4 className="text-5xl text-slate-900">Access Protocol: SOVEREIGN</h4>
               <p className="text-slate-500 text-xl font-medium ">Identity verified. Your session is secured with end-to-end personnel encryption.</p>
               <div className="p-10 bg-slate-900 rounded-[4rem] text-white flex items-center justify-between border border-white/5 shadow-3xl">
                  <div className="flex items-center gap-6 text-left">
                     <Lock className="text-indigo-400" size={32} />
                    <div><div className="text-[15px] text-slate-500">Global Sync Point</div><div className="text-lg font-bold">{new Date().toLocaleString()}</div></div>
                  </div>
                  <div className="px-8 py-3 bg-emerald-500 text-white rounded-2xl text-[12px] shadow-xl">SECURE</div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UIField = ({ label, value, onChange, readOnly = false }: any) => (
  <div className="space-y-4">
    <label className="text-[15px] text-slate-800 px-4 flex items-center gap-3">
       <Palette size={16} className="text-indigo-400" /> {label}
    </label>
    <input 
      type="text" 
      value={value || ''} 
      readOnly={readOnly} 
      onChange={e => onChange?.(e.target.value)} 
      className={`w-full bg-slate-50 border border-slate-200 rounded-[2.5rem] px-10 py-6 text-md font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner ${readOnly ? 'opacity-50 cursor-not-allowed' : 'focus:ring-8 focus:ring-indigo-50 border-indigo-100'}`} 
    />
  </div>
);

export default ProfileView;