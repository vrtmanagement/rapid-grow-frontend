import React from 'react';
import { Plus, Trash2, Briefcase, ChevronDown, User, UserCircle2, Sparkles } from 'lucide-react';
import { TeamMember, WorkspaceProject } from '../../types';

interface ProjectCharterTeamSectionProps {
  activeProject: WorkspaceProject;
  updateProject: (updates: Partial<WorkspaceProject>) => void;
  team: TeamMember[];
}

export const ProjectCharterTeamSection: React.FC<ProjectCharterTeamSectionProps> = ({
  activeProject,
  updateProject,
  team,
}) => {
  return (
    <section className="bg-slate-50 p-10 rounded-5xl border border-slate-100 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 w-48 h-48 bg-brand-red/5 -mr-24 -mt-24 rounded-full" />
      <div className="flex items-center gap-4 mb-10 relative z-10">
        <div className="p-3 bg-brand-red text-white rounded-2xl shadow-lg">
          <User size={24} />
        </div>
        <div>
          <h2 className="text-3xl text-brand-navy leading-none">Project Team</h2>
          <p className="text-[15px] font-black text-brand-grey tracking-widest mt-1 opacity-50">
            Strategic unit assignment Matrix
          </p>
        </div>
      </div>

      <div className="space-y-8 relative z-10">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <label className="text-[15px] font-black text-slate-800 tracking-[0.2em]">
              Project Champion
            </label>
            <div className="w-1.5 h-1.5 bg-brand-red rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-white p-2 rounded-4xl shadow-sm border border-slate-100 group-within:border-brand-red/20 transition-all">
            <div className="flex items-center px-4 gap-3 py-2 border-b md:border-b-0 md:border-r border-slate-50">
              <UserCircle2 size={18} className="text-brand-red opacity-30" />
              <input
                value={activeProject.champion}
                onChange={e => updateProject({ champion: e.target.value })}
                className="w-full bg-transparent border-none p-0 text-brand-grey font-black text-md outline-none focus:ring-0 placeholder:font-medium placeholder:text-slate-300"
                placeholder="Assign identity"
              />
            </div>
            <div className="relative flex items-center px-4 gap-2 py-2">
              <Briefcase size={14} className="text-brand-navy opacity-30" />
              <input
                list="project-roles"
                value={activeProject.championRole || ''}
                onChange={e => updateProject({ championRole: e.target.value })}
                className="w-full bg-transparent border-none p-0 text-brand-red text-[15px] font-black tracking-widest outline-none focus:ring-0 placeholder:font-medium placeholder:text-slate-300"
                placeholder="Define mission role"
              />
              <ChevronDown size={14} className="text-slate-300 shrink-0" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <label className="text-[15px] font-black text-slate-800 tracking-[0.2em]">
              Project lead
            </label>
            <div className="w-1.5 h-1.5 bg-brand-cyan rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-white p-2 rounded-4xl shadow-sm border border-slate-100 group-within:border-brand-red/20 transition-all">
            <div className="flex items-center px-4 gap-3 py-2 border-b md:border-b-0 md:border-r border-slate-50">
              <Sparkles size={18} className="text-brand-cyan opacity-30" />
              <input
                value={activeProject.lead}
                onChange={e => updateProject({ lead: e.target.value })}
                className="w-full bg-transparent border-none p-0 text-brand-grey font-black text-md outline-none focus:ring-0 placeholder:font-medium placeholder:text-slate-300"
                placeholder="Assign Identity"
              />
            </div>
            <div className="relative flex items-center px-4 gap-2 py-2">
              <Briefcase size={14} className="text-brand-navy opacity-30" />
              <input
                list="project-roles"
                value={activeProject.leadRole || ''}
                onChange={e => updateProject({ leadRole: e.target.value })}
                className="w-full bg-transparent border-none p-0 text-brand-red text-[15px] font-black tracking-widest outline-none focus:ring-0 placeholder:font-medium placeholder:text-slate-300"
                placeholder="Define Mission Role"
              />
              <ChevronDown size={14} className="text-slate-300 shrink-0" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-200/50">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[15px] font-black text-slate-800 tracking-[0.2em]">
              Core Project Team
            </h3>
            <button
              onClick={() =>
                updateProject({
                  projectTeam: [
                    ...(activeProject.projectTeam || []),
                    { id: `pt-${Date.now()}`, name: '', role: '' },
                  ],
                })
              }
              className="text-white bg-brand-navy shadow-lg shadow-slate-200 p-2 rounded-2xl hover:scale-110 active:scale-95 transition-all"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-3 no-scrollbar custom-scrollbar-thin">
            {(activeProject.projectTeam || []).map(member => (
              <div
                key={member.id}
                className="flex flex-col md:flex-row gap-2 bg-white p-3 rounded-[2.5rem] border border-slate-100 group transition-all hover:border-brand-navy/40 shadow-sm"
              >
                <div className="flex-1 flex gap-3 items-center px-3 py-1">
                  <div className="w-2 h-2 rounded-full bg-slate-100 shrink-0 group-hover:bg-brand-navy transition-colors" />
                  <select
                    value={member.name}
                    onChange={e => {
                      const name = e.target.value;
                      updateProject({
                        projectTeam: (activeProject.projectTeam || []).map(m =>
                          m.id === member.id ? { ...m, name } : m
                        ),
                      });
                    }}
                    className="flex-1 bg-transparent border-none p-0 text-brand-grey font-bold text-md outline-none focus:ring-0 cursor-pointer"
                  >
                    <option value="">Select team member</option>
                    {team.map(tm => (
                      <option key={tm.id} value={tm.name}>
                        {tm.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 flex gap-3 items-center border-t md:border-t-0 md:border-l border-slate-50 pl-0 md:pl-4 pt-3 md:pt-0">
                  <div className="relative flex-1 flex items-center gap-2">
                    <Briefcase size={12} className="text-slate-300 shrink-0" />
                    <input
                      list="project-roles"
                      value={member.role}
                      onChange={e =>
                        updateProject({
                          projectTeam: (activeProject.projectTeam || []).map(m =>
                            m.id === member.id ? { ...m, role: e.target.value } : m
                          ),
                        })
                      }
                      className="flex-1 bg-transparent border-none p-0 text-brand-red text-[15px] font-black tracking-wider outline-none focus:ring-0 placeholder:text-slate-400"
                      placeholder="Assignment"
                    />
                  </div>
                  <button
                    onClick={() =>
                      updateProject({
                        projectTeam: (activeProject.projectTeam || []).filter(
                          m => m.id !== member.id
                        ),
                      })
                    }
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-brand-red transition-all p-2 bg-red-50/0 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {(!activeProject.projectTeam || activeProject.projectTeam.length === 0) && (
              <div className="text-center py-8 bg-white/50 border-2 border-dashed border-slate-200 rounded-5xl">
                <p className="text-[9px] text-slate-300 tracking-[0.2em] font-black leading-loose">
                  Awaiting Core Team <br /> Assignment
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-200/50">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[15px] font-black text-slate-800 tracking-[0.2em]">
              Deployment Units (SMEs)
            </h3>
            <button
              onClick={() =>
                updateProject({
                  smeList: [
                    ...activeProject.smeList,
                    { id: `sme-${Date.now()}`, name: '', role: '' },
                  ],
                })
              }
              className="text-white bg-brand-red shadow-lg shadow-red-100 p-2 rounded-2xl hover:scale-110 active:scale-95 transition-all"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-3 no-scrollbar custom-scrollbar-thin">
            {activeProject.smeList.map(sme => (
              <div
                key={sme.id}
                className="flex flex-col md:flex-row gap-2 bg-white p-3 rounded-[2.5rem] border border-slate-100 group transition-all hover:border-brand-red/30 shadow-sm"
              >
                <div className="flex-1 flex gap-3 items-center px-3 py-1">
                  <div className="w-2 h-2 rounded-full bg-slate-100 shrink-0 group-hover:bg-brand-red transition-colors" />
                  <input
                    value={sme.name}
                    onChange={e =>
                      updateProject({
                        smeList: activeProject.smeList.map(s =>
                          s.id === sme.id ? { ...s, name: e.target.value } : s
                        ),
                      })
                    }
                    className="flex-1 bg-transparent border-none p-0 text-brand-grey font-bold text-md outline-none focus:ring-0 placeholder:text-slate-400"
                    placeholder="Unit Identifier"
                  />
                </div>
                <div className="flex-1 flex gap-3 items-center border-t md:border-t-0 md:border-l border-slate-50 pl-0 md:pl-4 pt-3 md:pt-0">
                  <div className="relative flex-1 flex items-center gap-2">
                    <Briefcase size={12} className="text-slate-300 shrink-0" />
                    <input
                      list="project-roles"
                      value={sme.role}
                      onChange={e =>
                        updateProject({
                          smeList: activeProject.smeList.map(s =>
                            s.id === sme.id ? { ...s, role: e.target.value } : s
                          ),
                        })
                      }
                      className="flex-1 bg-transparent border-none p-0 text-brand-red text-[15px] font-black tracking-wider outline-none focus:ring-0 placeholder:text-slate-400"
                      placeholder="Assignment"
                    />
                  </div>
                  <button
                    onClick={() =>
                      updateProject({
                        smeList: activeProject.smeList.filter(s => s.id !== sme.id),
                      })
                    }
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-brand-red transition-all p-2 bg-red-50/0 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {activeProject.smeList.length === 0 && (
              <div className="text-center py-12 bg-white/50 border-2 border-dashed border-slate-200 rounded-5xl">
                <p className="text-[9px] text-slate-300 tracking-[0.2em] font-black leading-loose">
                  Awaiting Unit <br /> Deployment
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectCharterTeamSection;
