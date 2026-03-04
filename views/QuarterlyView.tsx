
import React from 'react';
import { PlanningState } from '../types';
import { BarChart3, Link2, CheckCircle2, Target, Boxes, Lock, Zap } from 'lucide-react';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const QuarterlyView: React.FC<Props> = ({ state, updateState }) => {
  const isAdmin = state.currentUser.role === 'Admin';

  const handleGoalChange = (id: string, text: string) => {
    if (!isAdmin) return;
    updateState(prev => ({
      ...prev,
      quarterlyGoals: prev.quarterlyGoals.map(g => g.id === id ? { ...g, text } : g)
    }));
  };

  const handleParentChange = (id: string, parentId: string) => {
    if (!isAdmin) return;
    updateState(prev => ({
      ...prev,
      quarterlyGoals: prev.quarterlyGoals.map(g => g.id === id ? { ...g, parentId } : g)
    }));
  };

  const getProgressData = (quarterId: string) => {
    const children = state.monthlyGoals.filter(m => m.parentId === quarterId);
    if (children.length === 0) return { progress: 0, count: 0 };
    const completedCount = children.filter(m => m.completed).length;
    return {
      progress: Math.round((completedCount / children.length) * 100),
      count: children.length
    };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-16">
      <div className="bg-slate-900 p-12 rounded-[2.5rem] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative border border-white/5">
        <div className="absolute top-0 left-0 w-full h-2 bg-brand-red"></div>
        <div className="relative z-10">
          <h2 className="text-4xl mb-2">Tactical Sprints</h2>
          <p className="text-slate-800 max-w-lg text-lg">
            {isAdmin 
              ? "Distill organizational strategy into quarterly performance sprints." 
              : "VRT performance architecture read-only protocol."}
          </p>
        </div>
        {!isAdmin && (
            <div className="absolute top-6 right-6 bg-white/10 px-4 py-2 rounded-xl flex items-center gap-3 border border-white/10 backdrop-blur-md">
            <Lock size={14} className="text-brand-red" />
            <span className="text-[15px] text-brand-red">System Locked</span>
          </div>
        )}
        <Zap className="absolute -right-10 -bottom-10 text-brand-red w-64 h-64 opacity-5 rotate-12" />
      </div>

      <div className="grid gap-10">
        {state.quarterlyGoals.map((goal, idx) => {
          const { progress, count } = getProgressData(goal.id);
          const parentGoal = state.yearlyGoals.find(y => y.id === goal.parentId);
          
          return (
            <div key={goal.id} className="bg-white p-10 rounded-[2rem] shadow-sm border border-slate-200 group transition-all hover:shadow-2xl hover:border-brand-red/30">
               <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                  <div className="flex items-center gap-8">
                    <span className="text-7xl text-slate-400 group-hover:text-brand-red/10 transition-colors select-none leading-none">Q{idx + 1}</span>
                    <div>
                      <h4 className="text-slate-900 text-2xl leading-none">Operational Sprint</h4>
                      <div className="flex items-center gap-3 mt-3">
                        <Link2 size={16} className="text-brand-red" />
                        <select 
                          disabled={!isAdmin}
                          value={goal.parentId || ''}
                          onChange={(e) => handleParentChange(goal.id, e.target.value)}
                          className={`text-[15px] rounded-xl px-4 py-2 outline-none transition-colors ${isAdmin ? 'bg-slate-50 hover:bg-brand-red/10 cursor-pointer text-slate-600' : 'bg-slate-50 text-slate-800 cursor-not-allowed'}`}
                        >
                          <option value="">Link Strategic Anchor</option>
                          {state.yearlyGoals.map((yg, yidx) => (
                            <option key={yg.id} value={yg.id}>
                              {yg.text ? `Anchor ${yidx + 1}: ${yg.text.substring(0, 30)}...` : `Anchor ${yidx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center min-w-[180px]">
                    <span className="text-[15px] text-slate-500 mb-3">{progress}% Completion</span>
                    <div className="w-full h-4 bg-white rounded-full overflow-hidden shadow-inner border border-slate-100">
                      <div 
                        className="h-full bg-brand-red transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(220,38,38,0.4)]" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <span className="mt-3 text-[15px] text-slate-800">{count} Linked Projects</span>
                  </div>
               </div>
               
               <textarea
                  readOnly={!isAdmin}
                  value={goal.text}
                  onChange={(e) => handleGoalChange(goal.id, e.target.value)}
                  placeholder={isAdmin ? `Primary performance outcome for Q${idx + 1}...` : "Strategic sprint focus pending..."}
                  className={`w-full border-4 rounded-[2rem] p-8 text-2xl transition-all outline-none resize-none min-h-[160px] leading-tight ${isAdmin ? 'bg-slate-50/50 border-slate-100 focus:border-brand-red focus:bg-white text-slate-800' : 'bg-slate-50 border-transparent text-slate-800'}`}
               />

               {parentGoal && (
                 <div className="mt-8 flex items-center gap-4 px-6 py-3 bg-brand-red/5 rounded-2xl border border-brand-red/10">
                   <Target size={18} className="text-brand-red" />
                   <div className="flex flex-col">
                      <span className="text-[15px] text-brand-red">Anchored Strategic Mission</span>
                      <span className="text-md text-slate-800 truncate max-w-lg">
                        {parentGoal.text || `Strategic Goal ${state.yearlyGoals.indexOf(parentGoal) + 1}`}
                      </span>
                   </div>
                 </div>
               )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuarterlyView;
