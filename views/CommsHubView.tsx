
import React from 'react';
import { PlanningState } from '../types';
import { Mail, ShieldAlert, Clock, Send, ShieldCheck, Zap } from 'lucide-react';

interface Props {
  state: PlanningState;
}

const CommsHubView: React.FC<Props> = ({ state }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="bg-slate-900 p-12 rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent opacity-50"></div>
        <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full w-fit">
            <Mail size={16} className="text-indigo-400" />
            <span className="text-[15px] text-indigo-300">Automated Communications Protocol</span>
          </div>
          <h2 className="text-5xl">OS Comms Hub</h2>
          <p className="text-slate-800 max-w-xl text-lg leading-relaxed font-medium ">
            Monitoring and logging all autonomous email transmissions sent by the rapid grow os regarding task deadlines and system alerts.
          </p>
        </div>
        <Mail className="absolute -right-12 -bottom-12 w-80 h-80 text-white opacity-5 rotate-12" />
      </div>

      <div className="space-y-6">
        {state.emailLogs.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-20 flex flex-col items-center justify-center text-center border border-slate-200 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <ShieldCheck size={40} className="text-slate-400" />
            </div>
            <h3 className="text-2xl">Static Equilibrium</h3>
            <p className="text-slate-800 max-w-sm mt-4 text-md leading-loose">No autonomous transmissions logged. All personnel are operating within defined temporal parameters.</p>
          </div>
        ) : (
          [...state.emailLogs].reverse().map((log) => (
            <div key={log.id} className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl hover:border-indigo-400 transition-all group animate-in slide-in-from-bottom-4">
              <div className="p-10 flex flex-col md:flex-row gap-10">
                <div className="md:w-64 space-y-4 shrink-0">
                  <div className={`px-4 py-2 rounded-xl text-[9px] w-fit flex items-center gap-2 ${log.type === 'overdue_alert' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                    {log.type === 'overdue_alert' ? <ShieldAlert size={12} /> : <Zap size={12} />}
                    {log.type.replace('_', ' ')}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[15px] text-slate-800">Recipient</div>
                    <div className="text-md font-bold text-slate-900 truncate">{log.recipientEmail}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[15px] text-slate-800">Timestamp</div>
                    <div className="text-md font-bold text-slate-500 flex items-center gap-2 ">
                       <Clock size={12} />
                       {new Date(log.sentAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="pt-4">
                     <div className="flex items-center gap-2 text-[15px] text-emerald-500">
                        <Send size={12} /> Status: Transmitted
                     </div>
                  </div>
                </div>
                
                <div className="flex-1 bg-slate-50 rounded-[2.5rem] p-10 space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                     <Mail size={120} className="text-slate-900" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-2xl text-slate-900 mb-6">{log.subject}</h4>
                    <div className="bg-white/50 backdrop-blur-sm rounded-[1.5rem] p-8 border border-white/80 shadow-inner">
                       <pre className="whitespace-pre-wrap text-md text-slate-600 leading-relaxed font-medium ">
                         {log.body}
                       </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommsHubView;