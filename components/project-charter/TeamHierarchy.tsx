import React from 'react';
import { Crown, Network, UsersRound } from 'lucide-react';
import { ProjectTeamHierarchy as ProjectTeamHierarchyType, ProjectTeamMember } from '../../types';

interface TeamHierarchyProps {
  team?: ProjectTeamHierarchyType;
}

function MemberAvatar({ member }: { member: ProjectTeamMember }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-3 rounded-[1.15rem] border border-slate-200/90 bg-white/90 px-3.5 py-3 shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
      <img
        src={member.avatar}
        alt={member.name}
        className="h-11 w-11 rounded-[1rem] border border-slate-200 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{member.name}</p>
        <p className="truncate text-xs text-slate-500">{member.role}</p>
      </div>
    </div>
  );
}

const TeamHierarchy: React.FC<TeamHierarchyProps> = ({ team }) => {
  const leadGroups = team?.teamLeads || [];
  const unassignedMembers = team?.unassignedMembers || [];

  if (!team?.projectManager && leadGroups.length === 0 && unassignedMembers.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white/80 p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
          <UsersRound size={24} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No team assigned</h3>
        <p className="mt-2 text-sm text-slate-500">
          Add a project manager, team leads, and members to unlock the full delivery hierarchy.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-50 to-red-100 text-brand-red">
          <Network size={20} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Team Hierarchy</h3>
          <p className="text-sm text-slate-500">Project manager at the top, lead pods beneath, and contributors attached by stream.</p>
        </div>
      </div>

      {team?.projectManager ? (
        <div className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/55 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <div className="mb-4 flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-rose-500">
            <Crown size={16} />
            Project Manager
          </div>
          <div className="flex items-center gap-4">
            <img
              src={team.projectManager.avatar}
              alt={team.projectManager.name}
              className="h-16 w-16 rounded-[1.4rem] border border-slate-200 object-cover shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
            />
            <div>
              <p className="text-xl font-semibold text-slate-950">{team.projectManager.name}</p>
              <p className="text-sm text-slate-600">{team.projectManager.role}</p>
              {team.projectManager.email ? <p className="mt-1 text-xs text-slate-500">{team.projectManager.email}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(380px,1fr))]">
        {leadGroups.map((group) => (
          <div key={group.id} className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={group.lead.avatar}
                  alt={group.lead.name}
                  className="h-14 w-14 rounded-[1.2rem] border border-slate-200 object-cover shadow-sm"
                />
                <div>
                  <p className="text-base font-semibold text-slate-900">{group.lead.name}</p>
                  <p className="text-sm text-slate-500">{group.lead.role}</p>
                </div>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                {group.members.length} Members
              </span>
            </div>

            {group.members.length > 0 ? (
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                {group.members.map((member) => (
                  <MemberAvatar key={`${group.id}-${member.id}`} member={member} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/90 px-4 py-6 text-center text-sm text-slate-500">
                No members assigned to this lead yet.
              </div>
            )}
          </div>
        ))}
      </div>

      {unassignedMembers.length > 0 ? (
        <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/80 p-6">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Awaiting Lead Assignment</p>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {unassignedMembers.map((member) => (
              <MemberAvatar key={`unassigned-${member.id}`} member={member} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TeamHierarchy;
