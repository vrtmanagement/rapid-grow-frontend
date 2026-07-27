import React from 'react';
import { Plus, Sparkles, CheckCircle2, Clock, User, ChevronDown, X } from 'lucide-react';
import { TeamMember, WorkspaceTask } from '../../types';

interface ProjectCharterTasksSectionProps {
  sortedTasks: WorkspaceTask[];
  isGenerating: boolean;
  team: TeamMember[];
  isPrivilegedCreator: (createdBy: unknown, createdByRole: unknown) => boolean;
  onOpenAiConfigModal: () => void;
  onOpenAddTaskModal: () => void;
  removeTask: (taskId: string) => void;
  toggleTaskStatus: (taskId: string) => void;
  handleAssignTask: (taskId: string, assigneeId: string) => void;
}

export const ProjectCharterTasksSection: React.FC<ProjectCharterTasksSectionProps> = ({
  sortedTasks,
  isGenerating,
  team,
  isPrivilegedCreator,
  onOpenAiConfigModal,
  onOpenAddTaskModal,
  removeTask,
  toggleTaskStatus,
  handleAssignTask,
}) => {
  return (
    <div className="mt-16 pt-24 border-t-8 border-brand-navy relative print:mt-12">
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-12 py-2.5 bg-brand-red text-white text-[12px] font-black tracking-[0.2em] rounded-full shadow-2xl shadow-brand-red/30 transform hover:scale-105 transition-transform cursor-default">
        Mission Throughput Matrix
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
        <div>
          <h2 className="text-5xl font-black text-brand-navy tracking-tighter leading-none">
            Project Tasks
          </h2>
          <p className="text-brand-grey font-bold tracking-[0.2em] text-[15px] mt-4 max-w-lg opacity-60">
            Critical work items required to deliver this project.
          </p>
        </div>
        <div className="flex items-center gap-6 print:hidden">
          <button
            onClick={onOpenAiConfigModal}
            disabled={isGenerating}
            className={`flex items-center gap-3 px-8 py-4 bg-brand-red text-white rounded-[2rem] text-[15px] font-black tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-red/20 ${
              isGenerating ? 'opacity-50 animate-pulse cursor-not-allowed' : ''
            }`}
          >
            <Sparkles size={18} /> {isGenerating ? 'Synthesizing...' : 'Generate Tasks'}
          </button>
          <button
            onClick={onOpenAddTaskModal}
            className="flex items-center gap-3 px-8 py-4 bg-brand-navy text-white rounded-[2rem] text-[15px] font-black tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-navy/20"
          >
            <Plus size={18} /> Add Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
      {sortedTasks.map(task => {
          const taskMessages = Array.isArray(task.messages) ? task.messages : [];
          const sortedMessages = [...taskMessages].sort(
            (a, b) =>
              new Date(b.createdAt || '').getTime() -
              new Date(a.createdAt || '').getTime()
          );
          const highlightGreen = isPrivilegedCreator((task as any).createdBy, (task as any).createdByRole);

          return (
          <div
            key={task.id}
            className={`p-10 rounded-5xl border-2 group hover:border-brand-red transition-all relative shadow-sm hover:shadow-3xl flex flex-col ${
              highlightGreen ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'
            }`}
          >
            <button
              onClick={() => removeTask(task.id)}
              className="absolute top-8 right-8 text-slate-300 hover:text-brand-red opacity-0 group-hover:opacity-100 transition-all print:hidden"
            >
              <X size={20} />
            </button>
            <div className="flex items-start gap-5 mb-8">
              <button
                onClick={() => toggleTaskStatus(task.id)}
                className={`shrink-0 mt-1 w-8 h-8 rounded-2xl border-2 flex items-center justify-center transition-all ${
                  task.status === 'done'
                    ? 'bg-brand-green border-brand-green text-white rotate-6 shadow-lg shadow-brand-green/20'
                    : 'border-slate-200 text-transparent hover:border-brand-red hover:bg-red-50'
                }`}
              >
                <CheckCircle2 size={18} />
              </button>
              <div className="flex-1">
                <h3
                  className={`text-xl font-black leading-tight tracking-tight ${
                    task.status === 'done'
                      ? 'text-slate-800 line-through opacity-50'
                      : 'text-slate-900'
                  }`}
                >
                  {task.title}
                </h3>
                {sortedMessages.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {sortedMessages.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="text-sm text-brand-grey font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity bg-slate-50 rounded-2xl px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-700">
                              {m.from || 'Employee'}
                            </span>
                            {m.status && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
                                {m.status}
                              </span>
                            )}
                          </div>
                          {m.createdAt && (
                            <span className="text-[10px] text-slate-400">
                              {new Date(m.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: true })}
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-slate-700 whitespace-pre-wrap">
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  task.description && (
                    <p className="text-md text-brand-grey font-medium mt-4 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                      {task.description}
                    </p>
                  )
                )}
              </div>
            </div>

            <div className="mt-auto pt-8 flex flex-col gap-4">
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-3xl border border-slate-100/50 group-hover:bg-white group-hover:border-slate-200 transition-all">
                <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-red group-hover:bg-slate-50">
                  <User size={14} />
                </div>
                <div className="flex-1 relative">
                  <select
                    value={task.assigneeId || ''}
                    onChange={e => handleAssignTask(task.id, e.target.value)}
                    className="w-full bg-transparent border-none text-[15px] font-black tracking-widest text-brand-navy outline-none focus:ring-0 cursor-pointer appearance-none pr-6"
                  >
                    <option value="">Unassigned</option>
                    {team.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={10}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[9px] font-black tracking-[0.2em] text-slate-800">
                  <Clock size={12} className="text-brand-red opacity-30" />{' '}
                  {task.status.replace('_', ' ')}
                </div>
                <div
                  className={`px-4 py-1.5 rounded-full text-[14px] font-black tracking-widest ${
                    task.priority === 'high'
                      ? 'bg-brand-red text-white'
                      : 'bg-slate-100 text-brand-grey shadow-inner'
                  }`}
                >
                  {task.priority} Priority
                </div>
              </div>
            </div>
          </div>
        )})}
        {sortedTasks.length === 0 && (
          <div className="col-span-full py-40 text-center bg-slate-50/30 border-4 border-dashed border-slate-100 rounded-5xl">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
              <Clock size={48} className="text-slate-400" />
            </div>
            <h3 className="text-2xl font-black text-slate-400 tracking-[0.2em]">
              No tasks yet
            </h3>
            <p className="text-[15px] text-slate-300 mt-4 tracking-[0.2em]">
              Use Generate Tasks or Add Task to create your first items.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCharterTasksSection;
