import React, { useMemo, useState } from 'react';
import { ChatConversationSummary, ChatUser } from '../types';
import { Mail, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { MessageActionModal } from './MessageActionModal';

function roleLabel(roleGroup: string) {
  if (roleGroup === 'admin') return 'Admin';
  if (roleGroup === 'team_lead') return 'Team Lead';
  return 'Employee';
}

export function ChatSidebar({
  currentUserId,
  currentUserRole,
  users,
  conversations,
  loading,
  selectedConversationKey,
  onSelectTeam,
  onStartDmWithUser,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  onPreviewUser,
}: {
  currentUserId: string;
  currentUserRole: string;
  users: ChatUser[];
  conversations: ChatConversationSummary[];
  loading?: boolean;
  selectedConversationKey: string | null;
  onSelectTeam: (conversationKey: string) => Promise<void>;
  onStartDmWithUser: (otherUserId: string) => Promise<void>;
  onCreateTeam: (name: string, memberIds: string[]) => Promise<void>;
  onUpdateTeam: (conversationKey: string, payload: { name?: string; memberIds?: string[] }) => Promise<void>;
  onDeleteTeam: (conversationKey: string) => Promise<void>;
  onPreviewUser: (user: ChatUser) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [managingTeam, setManagingTeam] = useState<ChatConversationSummary | null>(null);

  const canManageTeams = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'ADMIN' || currentUserRole === 'TEAM_LEAD';

  const dmByUserId = useMemo(() => {
    const map = new Map<string, ChatConversationSummary>();
    for (const c of conversations) {
      if (c.type !== 'dm' || !c.otherUser) continue;
      map.set(c.otherUser.id, c);
    }
    return map;
  }, [conversations]);

  const teamConversations = useMemo(() => {
    return conversations
      .filter((c) => c.type === 'channel')
      .slice()
      .sort((a, b) => {
        const atA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const atB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return atB - atA;
      });
  }, [conversations]);

  const people = useMemo(() => {
    return users
      .filter((u) => u.id !== currentUserId)
      .slice()
      .sort((a, b) => {
        const dmA = dmByUserId.get(a.id);
        const dmB = dmByUserId.get(b.id);
        const atA = dmA?.lastMessageAt ? new Date(dmA.lastMessageAt).getTime() : 0;
        const atB = dmB?.lastMessageAt ? new Date(dmB.lastMessageAt).getTime() : 0;
        if (atA !== atB) return atB - atA;
        return a.name.localeCompare(b.name);
      });
  }, [users, currentUserId, dmByUserId]);

  const sortedUsersForSelection = useMemo(() => {
    return users.filter((u) => u.id !== currentUserId).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [users, currentUserId]);

  const selfDm = useMemo(() => dmByUserId.get(currentUserId) || null, [dmByUserId, currentUserId]);
  const currentUser = useMemo(() => users.find((u) => u.id === currentUserId) || null, [users, currentUserId]);
  const resetTeamForm = () => {
    setTeamName('');
    setMemberIds([]);
  };

  return (
    <div className="w-80 hidden lg:flex flex-col border-r border-slate-200 bg-white">
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="text-slate-900 font-bold">Communication</div>
          <Mail size={16} className="text-slate-400" />
        </div>
        <div className="text-xs text-slate-500 mt-1">Teams and direct messaging</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Teams</div>
              <div className="mt-1 text-[11px] text-slate-400">Private group chats by membership</div>
            </div>
            {canManageTeams ? (
              <button
                type="button"
                onClick={() => {
                  resetTeamForm();
                  setCreateOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus size={12} />
                Create Team
              </button>
            ) : null}
          </div>
        </div>
        <div className="px-2 pb-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`team-skeleton-${index}`}
                className="w-full px-3 py-2.5 rounded-xl border border-transparent animate-pulse"
              >
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded-full bg-slate-200" />
                  <div className="h-3 w-44 rounded-full bg-slate-100" />
                </div>
              </div>
            ))
          ) : teamConversations.map((c) => {
            const active = selectedConversationKey === c.conversationKey;
            return (
              <button
                key={c.conversationKey}
                type="button"
                onClick={() => onSelectTeam(c.conversationKey)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border ${
                  active ? 'bg-brand-red/10 border-brand-red/30 ring-1 ring-brand-red/20' : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{c.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500 truncate">{c.lastMessagePreview || 'No messages yet'}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {canManageTeams ? (
                      <div className="flex items-center gap-1">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setManagingTeam(c);
                            setTeamName(c.title || '');
                            setMemberIds((c.memberIds || []).filter((id) => id !== currentUserId));
                            setManageOpen(true);
                          }}
                        >
                          <Pencil size={11} />
                        </span>
                      </div>
                    ) : null}
                    {typeof c.unreadCount === 'number' && c.unreadCount > 0 ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-red" aria-hidden />
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
          {!loading && !teamConversations.length ? (
            <div className="px-3 py-5 text-sm text-slate-500">
              {canManageTeams ? 'No teams yet. Create one to start group chat.' : 'You are not part of any team yet.'}
            </div>
          ) : null}
        </div>

        <div className="px-4 pt-4 pb-2 border-t border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">People</div>
        </div>
        <div className="px-2 pb-10">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`people-skeleton-${index}`}
                className="w-full px-3 py-2 rounded-xl border border-transparent animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-4 w-28 rounded-full bg-slate-200" />
                      <div className="h-3 w-16 rounded-full bg-slate-100" />
                    </div>
                    <div className="h-3 w-32 rounded-full bg-slate-100" />
                  </div>
                </div>
              </div>
            ))
          ) : selfDm ? (
            <button
              key="self-chat"
              type="button"
              onClick={() => onStartDmWithUser(currentUserId)}
              className={`w-full text-left px-3 py-2 rounded-xl transition-all border ${
                selectedConversationKey === selfDm.conversationKey ? 'bg-brand-red/10 border-brand-red/30' : 'border-transparent hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src={
                      currentUser?.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent((currentUser?.name || 'you').replace(/\s/g, ''))}`
                    }
                    alt=""
                    className="w-9 h-9 rounded-full border border-slate-200 bg-slate-50 object-cover cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentUser) onPreviewUser(currentUser);
                    }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-emerald-500" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 truncate">{currentUser?.name || 'You'} (You)</div>
                  <div className="text-xs text-slate-500 truncate">{selfDm.lastMessagePreview || 'Message yourself'}</div>
                </div>
              </div>
            </button>
          ) : null}
          {!loading && people.map((u) => {
            const active =
              selectedConversationKey &&
              dmByUserId.get(u.id)?.conversationKey === selectedConversationKey;

            const dm = dmByUserId.get(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onStartDmWithUser(u.id)}
                className={`w-full text-left px-3 py-2 rounded-xl transition-all border ${
                  active ? 'bg-brand-red/10 border-brand-red/30' : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={
                        u.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name.replace(/\s/g, ''))}`
                      }
                      alt=""
                      className="w-9 h-9 rounded-full border border-slate-200 bg-slate-50 object-cover cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewUser(u);
                      }}
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        u.online ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900 truncate">{u.name}</div>
                      <div className="text-[11px] text-slate-500 shrink-0">{roleLabel(u.roleGroup)}</div>
                    </div>
                    <div className="text-xs text-slate-500 truncate">{dm?.lastMessagePreview || 'Start chat'}</div>
                  </div>
                  {dm && typeof dm.unreadCount === 'number' && dm.unreadCount > 0 ? (
                    <span className="inline-flex min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-brand-red px-2 py-0.5 text-[11px] font-bold text-white">
                      {dm.unreadCount}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
          {!loading && people.length === 0 && (
            <div className="px-3 py-5 text-sm text-slate-500">No users found.</div>
          )}
        </div>
      </div>

      <MessageActionModal
        open={createOpen}
        title="Create Team"
        description="Admins and Team Leads can create team chats and add members."
        onClose={() => setCreateOpen(false)}
      >
        <div className="space-y-3">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Team name"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
          />
          <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 p-2">
            {sortedUsersForSelection.map((u) => (
              <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={memberIds.includes(u.id)}
                  onChange={(e) => {
                    setMemberIds((prev) => (e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)));
                  }}
                />
                <span>{u.name}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button
              type="button"
              onClick={async () => {
                await onCreateTeam(teamName, memberIds);
                setCreateOpen(false);
              }}
              disabled={!teamName.trim()}
              className="rounded-xl border border-brand-red/30 bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      </MessageActionModal>

      <MessageActionModal
        open={manageOpen}
        title={managingTeam ? `Manage ${managingTeam.title}` : 'Manage Team'}
        description="Edit team name, members, or remove team."
        onClose={() => setManageOpen(false)}
      >
        <div className="space-y-3">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Team name"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
          />
          <div className="text-xs text-slate-500">Select members to add/remove, then save.</div>
          <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 p-2">
            {sortedUsersForSelection.map((u) => (
              <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={memberIds.includes(u.id)}
                  onChange={(e) => {
                    setMemberIds((prev) => (e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)));
                  }}
                />
                <span>{u.name}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={async () => {
                if (!managingTeam) return;
                await onDeleteTeam(managingTeam.conversationKey);
                setManageOpen(false);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              <Trash2 size={13} />
              Remove Team
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!managingTeam) return;
                await onUpdateTeam(managingTeam.conversationKey, { name: teamName, memberIds });
                setManageOpen(false);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-brand-red/30 bg-brand-red px-4 py-2 text-sm font-semibold text-white"
            >
              <UserPlus size={13} />
              Save
            </button>
          </div>
        </div>
      </MessageActionModal>
    </div>
  );
}

