
import React, { useState } from 'react';
import { PlanningState, Goal } from '../types';
import { ListTodo, Brain, CheckSquare, CalendarDays, Link2, Plus, Trash2, Lock, Target, Zap } from 'lucide-react';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const WeeklyView: React.FC<Props> = ({ state, updateState }) => {
  const [activeTab, setActiveTab] = useState<'brainstorm' | 'selection' | 'timeline'>('brainstorm');
  const isAdmin = state.currentUser.role === 'Admin';

  // Updated to length 5 as requested
  const [weeklyLocalGoals, setWeeklyLocalGoals] = useState<Partial<Goal>[]>(
    Array.from({ length: 5 }, () => ({ text: '', parentId: '', completed: false }))
  );

  const updateLocalGoal = (idx: number, updates: Partial<Goal>) => {
    const newGoals = [...weeklyLocalGoals];
    newGoals[idx] = { ...newGoals[idx], ...updates };
    setWeeklyLocalGoals(newGoals);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="bg-brand-navy rounded-[3rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 left-0 w-full h-1 bg-brand-red"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <CalendarDays size={28} className="text-brand-red" />
            <h2 className="text-3xl">Weekly Focus</h2>
          </div>
          <p className="text-slate-300 max-w-lg">
            Bridge the gap between strategy and execution. All weekly goals must pull from the <span className="text-white underline decoration-brand-red decoration-2">Monthly Strategy</span>.
          </p>
        </div>
        <div className="relative z-10 flex flex-col items-end gap-2">
            <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md flex items-center gap-2">
            <Target size={14} className="text-brand-red" />
            <span className="text-[15px] text-brand-red">Aligning With March {state.currentYear}</span>
          </div>
        </div>
        <Zap className="absolute -right-8 -bottom-8 w-64 h-64 text-brand-red opacity-5 rotate-12" />
      </div>

      <div className="flex items-center justify-center p-2 bg-white rounded-3xl shadow-sm border border-slate-200 gap-2">
        <button 
          onClick={() => setActiveTab('brainstorm')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl transition-all ${activeTab === 'brainstorm' ? 'bg-brand-red text-white shadow-xl' : 'text-brand-grey hover:bg-slate-50'}`}
        >
          <Brain size={18} />
          <span className="text-md">01. Brainstorm</span>
          <span className="ml-2 text-[15px] opacity-60 bg-black/20 px-1.5 py-0.5 rounded">10m</span>
        </button>
        <button 
          onClick={() => setActiveTab('selection')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl transition-all ${activeTab === 'selection' ? 'bg-brand-red text-white shadow-xl' : 'text-brand-grey hover:bg-slate-50'}`}
        >
          <CheckSquare size={18} />
          <span className="text-md">02. Top 5 Selection</span>
          <span className="ml-2 text-[15px] opacity-60 bg-black/20 px-1.5 py-0.5 rounded">10m</span>
        </button>
        <button 
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl transition-all ${activeTab === 'timeline' ? 'bg-brand-red text-white shadow-xl' : 'text-brand-grey hover:bg-slate-50'}`}
        >
          <CalendarDays size={18} />
          <span className="text-md">03. High-Performance Timeline</span>
          <span className="ml-2 text-[15px] opacity-60 bg-black/20 px-1.5 py-0.5 rounded">10m</span>
        </button>
      </div>

      {activeTab === 'brainstorm' && (
        <div className="grid md:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-300">
          <div className="md:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
               <h3 className="text-xl text-slate-800">Monthly Context</h3>
               <p className="text-[15px] text-brand-grey border-b pb-2">Projects For This Month:</p>
               <div className="space-y-3">
                 {state.monthlyGoals.map((mg, i) => mg.text && (
                   <div key={mg.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-red mt-1.5 shrink-0"></div>
                      <span className="text-md font-bold text-slate-700">{mg.text}</span>
                   </div>
                 ))}
                 {!state.monthlyGoals.some(g => g.text) && <p className="text-md text-brand-grey ">No monthly projects defined.</p>}
               </div>
            </div>
          </div>
          <div className="md:col-span-8 bg-brand-navy p-8 rounded-[2.5rem] text-white shadow-2xl space-y-6 relative overflow-hidden border border-white/5">
            <div className="relative z-10">
              <h3 className="text-2xl text-white mb-2">Open Brainstorm List</h3>
              <p className="text-slate-800 text-md">Dump every operational task. Clear the mental cache before prioritizing.</p>
              <div className="space-y-4 mt-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="flex items-center gap-4 group">
                    <span className="text-brand-red text-md w-4">{i}</span>
                    <input type="text" className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-md text-white focus:bg-white/10 focus:ring-4 focus:ring-brand-red/30 outline-none transition-all placeholder:text-slate-500" placeholder="Operational task or milestone..." />
                  </div>
                ))}
              </div>
            </div>
            <Brain size={120} className="absolute -right-10 -bottom-10 text-white opacity-5" />
          </div>
        </div>
      )}

      {activeTab === 'selection' && (
        <div className="space-y-8 animate-in zoom-in-95 duration-300">
           <div className="text-center">
             <h3 className="text-2xl text-slate-800">Strategic Distillation</h3>
             <p className="text-brand-grey text-md">Select the 5 most impactful moves for this specific week.</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {weeklyLocalGoals.map((goal, idx) => (
              <div key={idx} className="bg-white p-6 rounded-[2rem] border-t-4 border-brand-red shadow-lg space-y-4 relative group hover:border-brand-navy transition-all hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-2xl text-brand-red leading-none">0{idx + 1}</span>
                    <span className="text-[8px] text-brand-grey mt-1">Weekly Pillar</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link2 size={12} className="text-brand-red" />
                    <select 
                      value={goal.parentId || ''}
                      onChange={(e) => updateLocalGoal(idx, { parentId: e.target.value })}
                    className="text-[8px] bg-slate-50 border-none rounded-lg px-2 py-1 text-slate-600 outline-none cursor-pointer hover:bg-brand-red/10 transition-all max-w-[80px] truncate"
                    >
                      <option value="">Link monthly</option>
                      {state.monthlyGoals.map((mg, midx) => (
                        <option key={mg.id} value={mg.id}>
                          {mg.text ? `Project ${midx + 1}: ${mg.text.substring(0, 15)}...` : `Project ${midx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <textarea 
                  value={goal.text}
                  onChange={(e) => updateLocalGoal(idx, { text: e.target.value })}
                  placeholder="Non-negotiable goal..." 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-md text-slate-800 outline-none focus:bg-white focus:border-brand-red h-24 resize-none shadow-inner"
                />
                <div className="space-y-2">
                  <label className="text-[9px] text-brand-grey flex items-center gap-2">
                    <ListTodo size={10} className="text-brand-red" /> Milestones
                  </label>
                  <textarea 
                    placeholder="Breakdown..." 
                    className="w-full bg-slate-50 border-slate-100 border p-3 rounded-xl text-[15px] font-medium text-slate-600 h-24 resize-none outline-none focus:bg-white focus:border-brand-red shadow-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl animate-in fade-in duration-500">
           <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h3 className="text-2xl text-slate-800">Execution Timeline</h3>
                <p className="text-brand-grey text-md">Lock in Focus Blocks for your 5 Strategic Pillars.</p>
              </div>
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-[15px] text-brand-grey">
                Protects Strategy Integrity
              </div>
           </div>
           
           <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
             <table className="w-full border-collapse">
               <thead>
                 <tr>
                   <th className="p-5 border-b border-r border-slate-100 bg-slate-50 text-[15px] text-brand-grey text-left">Pillar / Block</th>
                   {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                     <th key={day} className="p-5 border-b border-r border-slate-100 bg-slate-50 text-[15px] text-brand-grey text-center">{day}</th>
                   ))}
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {[1, 2, 3, 4, 5].map(row => (
                   <tr key={row} className="hover:bg-slate-50 transition-colors">
                     <td className="p-4 border-r border-slate-100 w-48 bg-slate-50/50">
                        <input type="text" className="w-full p-2 text-md border-none outline-none font-black text-brand-red bg-transparent  tracking-tight" placeholder={`Strategic block ${row}...`} />
                     </td>
                     {['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => (
                        <td key={day} className="p-3 border-r border-slate-100 min-w-[140px]">
                           <textarea className="w-full p-3 text-[15px] border-none outline-none bg-red-50 rounded-2xl resize-none text-brand-red focus:bg-red-100 focus:ring-2 focus:ring-brand-red/10 transition-all" rows={4} placeholder="Activities..." />
                        </td>
                     ))}
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyView;
