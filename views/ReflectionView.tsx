
import React from 'react';
import { PlanningState } from '../types';
import { BrainCircuit, Zap, AlertCircle, Sparkles, Send, ShieldCheck } from 'lucide-react';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
}

const ReflectionView: React.FC<Props> = ({ state, updateState }) => {
  const handleChange = (key: keyof typeof state.reflection, val: string) => {
    updateState(prev => ({
      ...prev,
      reflection: { ...prev.reflection, [key]: val }
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in duration-700">
      <div className="bg-slate-900 text-white p-8 rounded-2xl flex items-center justify-center gap-8 text-[12px] shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-red"></div>
        <span className="text-brand-red">VRT Review Protocol</span>
        <div className="h-1 w-16 bg-brand-red/20 rounded-full"></div>
        <span className="opacity-60">{state.uiConfig.reflectionSub}</span>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-16 rounded-[3rem] border border-slate-200 shadow-sm space-y-12 group hover:border-brand-red/30 transition-all">
            <h2 className="text-4xl text-slate-900 flex items-center gap-6">
              Executive Debrief
              <Sparkles className="text-brand-red" size={32} />
            </h2>

            <ReflectionField 
              label="Mission Accomplishments + Strategy Validation"
              helper="Quantifiable progress leads to momentum"
              value={state.reflection.accomplishments}
              onChange={(v) => handleChange('accomplishments', v)}
              icon={<Zap className="text-brand-red" size={24} />}
            />

            <ReflectionField 
              label="Operational Errors + Learning Synthesis"
              value={state.reflection.mistakes}
              onChange={(v) => handleChange('mistakes', v)}
              icon={<AlertCircle className="text-brand-red" size={24} />}
            />

            <ReflectionField 
              label="Deferred Tasks + System Failures"
              value={state.reflection.forgotten}
              onChange={(v) => handleChange('forgotten', v)}
              icon={<ShieldCheck className="text-slate-800" size={24} />}
            />

            <ReflectionField 
              label="Peak Energy Analysis"
              value={state.reflection.energyPeaks}
              onChange={(v) => handleChange('energyPeaks', v)}
              icon={<BrainCircuit className="text-brand-red" size={24} />}
            />

            <div className="bg-red-50 p-10 rounded-[2.5rem] border-4 border-brand-red/10">
               <label className="flex items-center gap-3 text-md text-brand-red mb-6">
                 <Send className="text-brand-red -rotate-45" size={20} />
                 Tactical Prioritization For Next Cycle
               </label>
               <textarea 
                 value={state.reflection.bigRocksTomorrow}
                 onChange={(e) => handleChange('bigRocksTomorrow', e.target.value)}
                 className="w-full bg-white border-2 border-brand-red/10 rounded-2xl p-8 text-lg text-slate-800 focus:border-brand-red focus:ring-[16px] focus:ring-brand-red/5 outline-none h-48 transition-all shadow-sm"
                 placeholder="Identify the high-value movers for the next 24 hours..."
               />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 p-12 rounded-[2.5rem] text-white space-y-12 shadow-2xl relative overflow-hidden border border-white/5 group">
            <div className="absolute top-0 right-0 w-2 h-full bg-brand-red"></div>
            <h3 className="text-2xl text-brand-red relative z-10">Standard Protocol</h3>
            <div className="flex items-center gap-8 relative z-10">
              <div className="w-24 h-24 rounded-2xl border-4 border-brand-red flex items-center justify-center text-3xl shadow-2xl bg-white/5">25m</div>
              <p className="text-[15px] leading-loose text-slate-800">Tactical <br/> Daily Review</p>
            </div>
            <div className="h-px bg-white/10 w-full relative z-10"></div>
            <h3 className="text-2xl text-slate-300 relative z-10">Deep Synthesis</h3>
            <div className="flex items-center gap-8 relative z-10">
              <div className="w-24 h-24 rounded-2xl border-4 border-slate-700 flex items-center justify-center text-3xl shadow-2xl bg-white/5">45m</div>
              <p className="text-[15px] leading-loose text-slate-800">Advanced <br/> Architecture</p>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10">
            <h3 className="text-xl text-slate-900">Performance Habits</h3>
            <ul className="space-y-8">
              <HabitItem text="Verify next day strategy twice before cycle close." />
              <HabitItem text="Mentally simulate successful mission completion." />
              <HabitItem text="Transmit gratitude alert to high-impact personnel." />
            </ul>
            <button className="w-full mt-6 flex items-center justify-center gap-4 bg-brand-red text-white py-6 rounded-2xl text-md shadow-2xl hover:bg-slate-900 transition-all active:scale-95">
              <Send size={24} className="-rotate-45" />
              Transmit Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReflectionField = ({ label, helper, value, onChange, icon }: any) => (
    <div className="space-y-6">
    <label className="flex items-center gap-4 text-md text-slate-800">
      <div className="p-3 bg-slate-50 rounded-xl text-brand-red">{icon}</div>
      {label}
    </label>
    {helper && <p className="text-[15px] text-slate-800 ml-16 opacity-70">({helper})</p>}
    <textarea 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-8 text-lg text-slate-700 focus:bg-white focus:border-brand-red focus:ring-[16px] focus:ring-red-50 transition-all outline-none h-40 resize-none shadow-inner"
      placeholder="Execute deep thought process here..."
    />
  </div>
);

const HabitItem = ({ text }: { text: string }) => (
  <li className="flex gap-6 text-md text-slate-600 font-medium leading-relaxed ">
    <div className="w-2.5 h-2.5 rounded-full bg-brand-red shrink-0 mt-2 shadow-sm"></div>
    {text}
  </li>
);

export default ReflectionView;
