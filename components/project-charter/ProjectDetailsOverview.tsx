import React from 'react';
import { BarChart3, CalendarRange, Check, Clock3, FileText, Target, UsersRound } from 'lucide-react';
import { WorkspaceProject } from '../../types';
import { formatProjectDate, formatProjectDateTime } from './projectCharterUtils';
import { ProjectTeamTableRow } from './projectDetailsTypes';

interface ProjectDetailsOverviewProps {
  project: WorkspaceProject;
  projectLeadName: string;
  latestUpdatedAt: string;
  displayedTeamMemberCount: number;
  projectMembers: number;
  problemLines: string[];
  objectiveLines: string[];
  keyResultLines: string[];
  orderedTeamRows: ProjectTeamTableRow[];
  inScopeLines: string[];
  outOfScopeLines: string[];
  benefitLines: string[];
  timelineRows: { label: string; value: string }[];
}

export const ProjectDetailsOverview: React.FC<ProjectDetailsOverviewProps> = ({
  project,
  projectLeadName,
  latestUpdatedAt,
  displayedTeamMemberCount,
  projectMembers,
  problemLines,
  objectiveLines,
  keyResultLines,
  orderedTeamRows,
  inScopeLines,
  outOfScopeLines,
  benefitLines,
  timelineRows,
}) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-brand-red">
          <CalendarRange size={20} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Project Overview</h2>
        </div>
      </div>

      <div className="space-y-5 px-5">
        <div className="rounded-[1.55rem] border border-slate-200 bg-white px-6 py-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_290px] xl:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-slate-950 via-[#162554] to-[#1f2e68] text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]">
                <FileText size={26} />
              </div>
              <div className="min-w-0">
                <h1 className="text-[1.65rem] font-semibold tracking-[-0.02em] text-slate-950">{project.name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15px] text-slate-600">
                  <span>
                    <span className="font-medium text-slate-500">Project Lead:</span>{' '}
                    <span className="font-semibold text-slate-900">{projectLeadName}</span>
                  </span>
                  <span>
                    <span className="font-medium text-slate-500">Created:</span>{' '}
                    <span className="text-slate-900">{formatProjectDate(project.dateCreated)}</span>
                  </span>
                  <span>
                    <span className="font-medium text-slate-500">Last updated:</span>{' '}
                    <span className="text-slate-900">{formatProjectDateTime(latestUpdatedAt)}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.05rem] border border-slate-200 bg-slate-50/65 px-4 py-3">
                <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Project Lead</p>
                <p className="mt-2 whitespace-nowrap text-[0.95rem] font-semibold text-slate-950">{projectLeadName}</p>
              </div>
              <div className="rounded-[1.05rem] border border-slate-200 bg-slate-50/65 px-4 py-3">
                <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Team Members</p>
                <p className="mt-2 whitespace-nowrap text-[0.95rem] font-semibold text-slate-950">{displayedTeamMemberCount || projectMembers}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-[1.55rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                <FileText size={18} />
              </div>
              <h3 className="text-lg font-semibold text-slate-950">Business Case</h3>
            </div>

            <div className="mt-5 border-t border-slate-100">
              <div className="pt-6">
                <p className="text-sm font-semibold text-slate-950">Problem / Opportunity Statement</p>
                <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                  {problemLines.length > 0 ? problemLines.map((line, index) => <p key={`problem-${index}`}>{line}</p>) : <p>Not provided.</p>}
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <p className="text-sm font-semibold text-slate-950">Objective</p>
                <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                  {objectiveLines.length > 0 ? objectiveLines.map((line, index) => <p key={`objective-${index}`}>{line}</p>) : <p>Not provided.</p>}
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <p className="text-sm font-semibold text-slate-950">Key Results</p>
                {keyResultLines.length > 0 ? (
                  <ul className="mt-3 space-y-2.5 text-sm leading-7 text-slate-600">
                    {keyResultLines.map((line, index) => (
                      <li key={`key-result-${index}`} className="flex items-start gap-2.5">
                        <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <Check size={12} />
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm leading-7 text-slate-600">Not provided.</p>
                )}
              </div>
            </div>
          </section>

          <section className="flex h-full min-h-[420px] flex-col rounded-[1.55rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                <UsersRound size={18} />
              </div>
              <h3 className="text-lg font-semibold text-slate-950">Project Team</h3>
            </div>

            <div className="mt-5 min-h-0 flex-1">
              <div className="grid grid-cols-[1.25fr_0.95fr] gap-4 rounded-t-[1rem] bg-slate-50 px-6 py-4 text-[0.92rem] font-semibold text-slate-600">
                <span>Role</span>
                <span>Name</span>
              </div>
              <div className="min-h-0 max-h-[292px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {orderedTeamRows.length > 0 ? (
                  orderedTeamRows.map((member, index) => (
                    <div
                      key={`team-row-${member.role}-${member.name}-${index}`}
                      className={`grid grid-cols-[1.25fr_0.95fr] gap-4 px-6 py-4 text-[0.95rem] text-slate-700 ${index === 0 ? 'border-t border-slate-200' : 'border-t border-slate-100'}`}
                    >
                      <span className="font-semibold text-slate-800">{member.role}</span>
                      <span className="font-medium text-slate-900">{member.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="border-t border-slate-200 px-6 py-5 text-sm text-slate-500">No team members added yet.</div>
                )}
              </div>
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-[1.55rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                  <Target size={18} />
                </div>
                <h3 className="text-lg font-semibold text-slate-950">Project Scope</h3>
              </div>

              <div className="mt-5 border-t border-slate-100">
                <div className="pt-6">
                  <p className="text-sm font-semibold text-slate-950">In Scope</p>
                  {inScopeLines.length > 0 ? (
                    <ul className="mt-3 space-y-2.5 text-sm leading-7 text-slate-600">
                      {inScopeLines.map((line, index) => (
                        <li key={`in-scope-${index}`} className="flex items-start gap-2.5">
                          <span className="mt-2.5 h-2 w-2 rounded-full bg-emerald-400" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-slate-600">Not provided.</p>
                  )}
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6">
                  <p className="text-sm font-semibold text-slate-950">Out of Scope</p>
                  {outOfScopeLines.length > 0 ? (
                    <ul className="mt-3 space-y-2.5 text-sm leading-7 text-slate-600">
                      {outOfScopeLines.map((line, index) => (
                        <li key={`out-scope-${index}`} className="flex items-start gap-2.5">
                          <span className="mt-2.5 h-2 w-2 rounded-full bg-rose-400" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-slate-600">Not provided.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[1.55rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                  <BarChart3 size={18} />
              </div>
              <h3 className="text-lg font-semibold text-slate-950">Project Benefits / Revenue</h3>
            </div>

              <div className="mt-6">
                {benefitLines.length > 0 ? (
                  <div className="space-y-2 text-sm leading-7 text-slate-600">
                    {benefitLines.map((line, index) => (
                      <p key={`benefit-${index}`}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-slate-600">Not provided.</p>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-[1.55rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                <Clock3 size={18} />
              </div>
              <h3 className="text-lg font-semibold text-slate-950">Project Review Timeline</h3>
            </div>

            <div
              className="relative mt-5 max-h-[350px] overflow-y-auto border-t border-slate-100 pt-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {timelineRows.length > 0 ? (
                <div className="relative">
                  <div className="absolute bottom-[28px] left-[13px] top-[28px] w-px bg-rose-100" />
                  {timelineRows.map((phase, index) => (
                    <div
                      key={`${phase.label}-${index}`}
                      className={`relative flex items-start gap-4 py-3 ${index === timelineRows.length - 1 ? '' : 'border-b border-slate-100/90'}`}
                    >
                      <div className="relative z-[1] w-8 shrink-0">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-white text-[11px] font-semibold text-brand-red shadow-[0_2px_6px_rgba(255,255,255,0.95)]">
                          {index}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 text-sm leading-7 text-slate-600">
                        <span className="font-semibold text-slate-950">{phase.label}:</span> {phase.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-5 text-sm text-slate-500">No review timeline saved yet.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsOverview;
