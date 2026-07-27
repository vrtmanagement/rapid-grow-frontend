import React from 'react';
import { Plus, Trash2, User } from 'lucide-react';
import { ProjectPhases, WorkspaceProject } from '../../types';
import { Employee } from '../WorkspaceP1Detail';

interface WorkspaceP1TeamSectionProps {
  activeProject: WorkspaceProject;
  employees: Employee[];
  updateProject: (updates: Partial<WorkspaceProject>) => void;
  phaseCount: number;
  setPhaseCount: React.Dispatch<React.SetStateAction<number>>;
  updatePhase: (key: keyof ProjectPhases, val: string) => void;
  removePhase: (num: number) => void;
}

const WorkspaceP1TeamSection: React.FC<WorkspaceP1TeamSectionProps> = ({
  activeProject,
  employees,
  updateProject,
  phaseCount,
  setPhaseCount,
  updatePhase,
  removePhase,
}) => {
  return (
    <div className="space-y-8">
      <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-brand-red text-white flex items-center justify-center">
            <User size={18} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-brand-navy">Project Team</h2>
            <p className="text-[13px] text-brand-grey">
              Identification of team lead, members, and stakeholders.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">
              Project Champion
            </label>
            <select
              value={activeProject.champion}
              onChange={e => updateProject({ champion: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
            >
              <option value="">Select project champion</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp.empName}>
                  {emp.empName} ({emp.designation} - {emp.department})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">
              Project Lead
            </label>
            <select
              value={activeProject.lead}
              onChange={e => updateProject({ lead: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
            >
              <option value="">Select project lead</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp.empName}>
                  {emp.empName} ({emp.designation} - {emp.department})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-slate-200 mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-slate-700">
                Project Team Members
              </span>
              <button
                onClick={() =>
                  updateProject({
                    projectTeam: [
                      ...(activeProject.projectTeam || []),
                      { id: `pt-${Date.now()}`, name: '', role: '' },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] bg-brand-navy text-white hover:bg-brand-red transition-colors"
              >
                <Plus size={14} /> Add member
              </button>
            </div>

            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
              {(activeProject.projectTeam || []).map(member => (
                <div
                  key={member.id}
                  className="flex flex-col gap-2 bg-white border border-slate-100 rounded-2xl p-3"
                >
                  <select
                    value={member.name}
                    onChange={e => {
                      const selectedEmp = employees.find(emp => emp.empName === e.target.value);
                      updateProject({
                        projectTeam: (activeProject.projectTeam || []).map(m =>
                          m.id === member.id
                            ? {
                                ...m,
                                id: selectedEmp ? selectedEmp.empId : m.id,
                                name: e.target.value,
                                role: selectedEmp ? selectedEmp.designation : m.role,
                              }
                            : m
                        ),
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                  >
                    <option value="">Select team member</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp.empName}>
                        {emp.empName} ({emp.designation} - {emp.department})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      value={member.role}
                      onChange={e =>
                        updateProject({
                          projectTeam: (activeProject.projectTeam || []).map(m =>
                            m.id === member.id ? { ...m, role: e.target.value } : m
                          ),
                        })
                      }
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                      placeholder="Role / stakeholder type"
                    />
                    <button
                      onClick={() =>
                        updateProject({
                          projectTeam: (activeProject.projectTeam || []).filter(
                            m => m.id !== member.id
                          ),
                        })
                      }
                      className="px-3 py-2 rounded-xl border border-red-100 text-[13px] text-brand-red hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {(!activeProject.projectTeam || activeProject.projectTeam.length === 0) && (
                <div className="text-[13px] text-slate-400 border border-dashed border-slate-200 rounded-2xl px-4 py-6 text-center">
                  No team members added yet. Use &quot;Add member&quot; to start building the
                  project team.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-brand-navy">Project Review Timeline</h2>
          <button
            type="button"
            onClick={() => setPhaseCount(c => c + 1)}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] bg-brand-navy text-white hover:bg-brand-red transition-colors"
          >
            <Plus size={14} /> Add phase
          </button>
        </div>
        <div className="space-y-3">
          {Array.from({ length: Math.max(1, phaseCount) }).map((_, idx) => {
            const num = idx + 1;
            const key = `phase${num}` as keyof ProjectPhases;
            return (
              <div key={num} className="flex items-start gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[13px] font-semibold text-slate-700">
                    Phase {num}
                  </label>
                  <input
                    value={(activeProject.phases as any)?.[key] || ''}
                    onChange={e => updatePhase(key, e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-[15px] text-brand-grey outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    placeholder={`Describe Phase ${num}...`}
                  />
                </div>
                {phaseCount > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhase(num)}
                    className="mt-6 inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-100 text-brand-red hover:bg-red-50"
                    title="Delete phase"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default WorkspaceP1TeamSection;
