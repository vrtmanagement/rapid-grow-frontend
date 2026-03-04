
import React, { useState } from 'react';
import { PlanningState, Goal, UserPower } from '../types';
import { Calendar, Briefcase, Link2, CheckCircle2, Circle, Lock, Plus, Trash2, ShieldAlert, Settings } from 'lucide-react';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const MonthlyView: React.FC<Props> = ({ state, updateState }) => {
  const hasAdminPower = state.currentUser.powers.includes('PROJECT_CREATE') || 
                        state.currentUser.role === 'Admin' || 
                        state.currentUser.role === 'Leader';
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleAddProject = () => {
    if (!hasAdminPower) return;
    const newProject: Goal = {
      id: `m-${Date.now()}`,
      text: '',
      completed: false,
      level: 'month',
      details: '',
      parentId: ''
    };
    updateState(prev => ({
      ...prev,
      monthlyGoals: [...prev.monthlyGoals, newProject]
    }));
  };

  const handleRemoveProject = (id: string) => {
    if (!hasAdminPower) return;
    setPendingDeleteId(id);
  };

  const handleGoalChange = (id: string, text: string) => {
    if (!hasAdminPower) return;
    updateState(prev => ({
      ...prev,
      monthlyGoals: prev.monthlyGoals.map(g => g.id === id ? { ...g, text } : g)
    }));
  };

  const handleDetailsChange = (id: string, details: string) => {
    if (!hasAdminPower) return;
    updateState(prev => ({
      ...prev,
      monthlyGoals: prev.monthlyGoals.map(g => g.id === id ? { ...g, details } : g)
    }));
  };

  const handleParentChange = (id: string, parentId: string) => {
    if (!hasAdminPower) return;
    updateState(prev => ({
      ...prev,
      monthlyGoals: prev.monthlyGoals.map(g => g.id === id ? { ...g, parentId } : g)
    }));
  };

  const toggleCompletion = (id: string) => {
    if (!hasAdminPower) return;
    updateState(prev => ({
      ...prev,
      monthlyGoals: prev.monthlyGoals.map(g => g.id === id ? { ...g, completed: !g.completed } : g)
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 pb-24 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-8">
          <div className="p-5 bg-brand-red rounded-2xl shadow-2xl shadow-brand-red/20 text-white">
            <Settings size={40} className="rotate-12" />
          </div>
          <div>
            <h2 className="text-4xl text-slate-900 leading-none">Tactical Anchor Projects</h2>
            <p className="text-slate-500 mt-3 text-xl">
              {hasAdminPower ? "Define Organizational Mission Projects For The 30-Day Performance Cycle." : "Operational Read-Only Cycle."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {hasAdminPower ? (
            <button 
              onClick={handleAddProject}
              className="flex items-center gap-4 px-10 py-5 bg-brand-red text-white rounded-2xl text-md shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={20} /> Deploy Mission Project
            </button>
          ) : (
            <div className="flex items-center gap-3 px-8 py-4 bg-slate-100 rounded-xl border border-slate-200 text-[15px] text-slate-800">
               <ShieldAlert size={16} className="text-brand-red" /> Rank Authorization Required
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {state.monthlyGoals.map((goal, idx) => (
          <div key={goal.id} className={`bg-white rounded-[2.5rem] shadow-sm border ${goal.completed ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200'} overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-2xl hover:border-brand-red/30 group relative`}>
            
            <div className={`md:w-96 p-12 border-r border-slate-100 flex flex-col ${goal.completed ? 'bg-emerald-50/30' : 'bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4 text-brand-red">
                  <div className="w-10 h-10 rounded-xl bg-brand-red text-white flex items-center justify-center text-xl">
                    {idx + 1}
                  </div>
                  <span className="text-[12px]">Project Anchor</span>
                </div>
                {hasAdminPower && (
                  <button 
                    onClick={() => handleRemoveProject(goal.id)}
                    className="p-3 text-slate-300 hover:text-brand-red transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>

              <div className="space-y-8 flex-1">
                <div className="space-y-3">
                  <label className="text-[15px] text-slate-800 px-2">Mission Identifier</label>
                  <textarea
                    readOnly={!hasAdminPower}
                    value={goal.text}
                    onChange={(e) => handleGoalChange(goal.id, e.target.value)}
                    placeholder={hasAdminPower ? "Enter mission name..." : "Project ID pending..."}
                    className={`w-full border-2 rounded-2xl p-6 text-xl outline-none transition-all resize-none leading-tight ${goal.completed ? 'bg-white border-emerald-100 text-slate-500 line-through' : 'bg-white border-slate-200 text-slate-900'} ${hasAdminPower ? 'focus:border-brand-red shadow-inner' : 'cursor-default border-transparent'}`}
                    rows={2}
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-[15px] text-slate-800 px-2">Strategic Sync</label>
                  <div className="relative">
                    <Link2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-red" />
                    <select 
                        disabled={!hasAdminPower}
                        value={goal.parentId || ''}
                        onChange={(e) => handleParentChange(goal.id, e.target.value)}
                        className={`w-full text-[15px] bg-white border-2 border-slate-100 rounded-xl pl-12 pr-4 py-4 outline-none cursor-pointer hover:border-brand-red transition-all ${!hasAdminPower ? 'opacity-50 cursor-not-allowed border-transparent' : ''}`}
                      >
                        <option value="">Link Quarterly Sprint</option>
                        {state.quarterlyGoals.map((qg, qidx) => (
                          <option key={qg.id} value={qg.id}>
                            {qg.text ? `Sprint Q${qidx + 1}: ${qg.text.substring(0, 30)}...` : `Sprint Q${qidx + 1}`}
                          </option>
                        ))}
                      </select>
                  </div>
                </div>
              </div>

                  <div className="mt-12 pt-10 border-t border-slate-200 flex items-center justify-between">
                 <button 
                  disabled={!hasAdminPower}
                  onClick={() => toggleCompletion(goal.id)}
                  className={`flex items-center gap-4 px-8 py-4 rounded-xl text-[15px] transition-all shadow-lg ${goal.completed ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-slate-900 text-white hover:bg-brand-red'} ${!hasAdminPower ? 'cursor-not-allowed opacity-50' : ''}`}
                 >
                   {goal.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                   {goal.completed ? 'Verified' : 'Finalize'}
                 </button>
                 <div className="flex flex-col items-end">
                    <div className="text-[15px] text-slate-800 mb-2">Throughput</div>
                    <div className={`h-2 w-20 rounded-full overflow-hidden ${goal.completed ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                        <div className={`h-full transition-all duration-1000 ${goal.completed ? 'bg-emerald-500 w-full' : 'bg-brand-red w-0'}`}></div>
                    </div>
                 </div>
              </div>
            </div>
            
            <div className={`flex-1 p-16 bg-white ${goal.completed ? 'opacity-60' : ''} flex flex-col`}>
              <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-brand-red rounded-full"></div>
                  <h3 className="text-2xl text-slate-900">Operational Brief / Tactical Parameters</h3>
                </div>
                {!hasAdminPower && <Lock size={18} className="text-slate-300" />}
              </div>
              <textarea
                readOnly={!hasAdminPower}
                value={goal.details}
                onChange={(e) => handleDetailsChange(goal.id, e.target.value)}
                placeholder={hasAdminPower ? "Define tactical path, resource allocation, and critical milestones..." : "Briefing Restricted."}
                className={`flex-1 w-full border-4 border-slate-50 rounded-[2rem] p-10 text-slate-800 text-lg leading-relaxed outline-none transition-all resize-none shadow-inner ${hasAdminPower ? 'bg-slate-50/30 focus:bg-white focus:border-brand-red focus:ring-[12px] focus:ring-red-50' : 'bg-slate-50/50 cursor-default'}`}
              />
              <div className="mt-8 flex items-center justify-between text-[15px] text-slate-800">
                <span>VRT Management Matrix Hub</span>
                <span>Authorized Personnel Only</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 relative">
            <button 
              className="absolute top-4 right-4 text-slate-300 hover:text-brand-red transition-colors"
              onClick={() => setPendingDeleteId(null)}
            >
              <Trash2 size={18} />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-md">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-2xl text-slate-900 leading-tight">Delete Mission Project</h3>
                <p className="text-[13px] text-slate-500 font-medium tracking-[0.15em] mt-1 uppercase">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-[15px] text-slate-700 mb-8">
              Purge this tactical mission project?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-5 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors uppercase"
                onClick={() => setPendingDeleteId(null)}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!pendingDeleteId) return;
                  updateState(prev => ({
                    ...prev,
                    monthlyGoals: prev.monthlyGoals.filter(g => g.id !== pendingDeleteId)
                  }));
                  setPendingDeleteId(null);
                }}
                className="px-7 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] text-white bg-brand-red shadow-lg shadow-brand-red/30 hover:bg-slate-900 transition-colors uppercase"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyView;
