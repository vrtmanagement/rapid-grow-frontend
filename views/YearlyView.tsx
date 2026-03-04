
import React, { useState } from 'react';
import { PlanningState, Goal } from '../types';
import { Target, CheckCircle2, Layers, Activity, Edit3, Lock, ShieldCheck, Shield } from 'lucide-react';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const YearlyView: React.FC<Props> = ({ state, updateState }) => {
  const [isEditingYear, setIsEditingYear] = useState(false);
  
  const hasStrategicPower = state.currentUser.powers.includes('EDIT_STRATEGY') || state.currentUser.role === 'Admin';

  const handleGoalChange = (id: string, text: string) => {
    if (!hasStrategicPower) return;
    updateState(prev => ({
      ...prev,
      yearlyGoals: prev.yearlyGoals.map(g => g.id === id ? { ...g, text } : g)
    }));
  };

  const handleYearChange = (newYear: number) => {
    if (!hasStrategicPower) return;
    updateState(prev => ({ ...prev, currentYear: newYear }));
    setIsEditingYear(false);
  };

  const getGoalData = (yearlyGoalId: string) => {
    const children = state.quarterlyGoals.filter(q => q.parentId === yearlyGoalId);
    if (children.length === 0) return { progress: 0, childCount: 0 };
    const totalProgress = children.reduce((acc, q) => {
      const grandchildren = state.monthlyGoals.filter(m => m.parentId === q.id);
      if (grandchildren.length === 0) return acc + (q.completed ? 100 : 0);
      const completedGrandchildren = grandchildren.filter(m => m.completed).length;
      return acc + (completedGrandchildren / grandchildren.length) * 100;
    }, 0);
    return { progress: Math.round(totalProgress / children.length), childCount: children.length };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in duration-700 pb-24">
      <div className="bg-slate-900 p-20 rounded-[3rem] text-white relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute top-0 left-0 w-full h-2 bg-brand-red"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              {isEditingYear && hasStrategicPower ? (
                  <input 
                  type="number" autoFocus defaultValue={state.currentYear}
                  onBlur={(e) => handleYearChange(parseInt(e.target.value) || state.currentYear)}
                  onKeyDown={(e) => e.key === 'Enter' && handleYearChange(parseInt((e.target as HTMLInputElement).value) || state.currentYear)}
                  className="bg-white/10 border border-white/20 rounded-2xl px-10 py-5 text-7xl outline-none focus:bg-white/20 transition-all w-56 shadow-inner"
                />
              ) : (
                  <div className="flex items-center gap-8">
                  <h2 className="text-8xl leading-none">
                    {state.currentYear} <span className="text-brand-red">Strategy</span>
                  </h2>
                  {hasStrategicPower && (
                    <button onClick={() => setIsEditingYear(true)} className="p-4 bg-white/5 hover:bg-brand-red rounded-xl transition-all"><Edit3 size={28} /></button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-5 px-8 py-3 bg-brand-red/10 border border-brand-red/20 rounded-full w-fit">
               <ShieldCheck size={20} className="text-brand-red" />
               <span className="text-[12px] text-brand-red">Strategic Authority Verified</span>
            </div>
            <p className="text-slate-800 max-w-2xl text-2xl leading-relaxed font-medium ">
              {state.uiConfig.yearlySub}
            </p>
          </div>
          <div className="shrink-0">
             <div className="w-48 h-48 rounded-[2rem] border-8 border-brand-red/20 flex items-center justify-center text-brand-red/10 rotate-12">
                <Shield size={160} />
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {state.yearlyGoals.map((goal, idx) => {
          const { progress, childCount } = getGoalData(goal.id);
          return (
            <div key={goal.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden hover:shadow-2xl transition-all group flex flex-col md:flex-row relative">
              <div className="absolute top-0 left-0 w-2.5 h-full bg-brand-red"></div>
              
              <div className="md:w-[28rem] p-16 bg-slate-50/50 border-r border-slate-100 flex flex-col justify-between space-y-12">
                <div className="space-y-8">
                  <div className="w-24 h-24 bg-brand-red text-white rounded-2xl flex items-center justify-center text-5xl shadow-2xl group-hover:scale-110 transition-transform">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="text-slate-900 text-3xl leading-none">Strategic Anchor</h3>
                    <p className="text-[12px] text-slate-800 mt-4">{childCount} Tactical Units Linked</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                     <span className="text-[12px] text-brand-red">{progress}% Integrity</span>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner border border-slate-100 p-1">
                    <div className="h-full bg-brand-red rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(220,38,38,0.3)]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex-1 p-16 flex flex-col">
                <div className="flex items-center justify-between mb-10">
                   <span className="text-[15px] text-slate-800">Executive Definition</span>
                   {hasStrategicPower ? (
                     <div className="p-4 bg-red-50 rounded-xl text-brand-red"><Edit3 size={20}/></div>
                   ) : (
                     <div className="p-4 bg-slate-50 rounded-xl text-slate-300"><Lock size={20}/></div>
                   )}
                </div>
                <textarea
                  readOnly={!hasStrategicPower}
                  value={goal.text}
                  onChange={(e) => handleGoalChange(goal.id, e.target.value)}
                  placeholder={hasStrategicPower ? "Define the strategic mission..." : "Strategic anchor pending..."}
                  className={`w-full bg-transparent p-6 text-5xl transition-all outline-none min-h-[220px] resize-none leading-tight text-slate-900 ${hasStrategicPower ? 'focus:text-brand-red' : 'cursor-default opacity-80'}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YearlyView;
