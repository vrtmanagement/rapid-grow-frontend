import React, { useMemo, useRef, useState } from 'react';
import { ChatConversationSummary, ChatUser } from '../types';
import { Camera, Mail, MoreVertical, Plus, Trash2, UserPlus } from 'lucide-react';
import { MessageActionModal } from './MessageActionModal';
import { apiUploadFile } from '../api';
import { getDisplayAvatarUrl } from '../../utils/avatar';
import AvatarCropModal from '../../components/profile/AvatarCropModal';

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
  selectedConversationType,
  typingUserIds,
  onSelectTeam,
  onStartDmWithUser,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  onPreviewUser,
  onPreviewTeamAvatar,
}: {
  currentUserId: string;
  currentUserRole: string;
  users: ChatUser[];
  conversations: ChatConversationSummary[];
  loading?: boolean;
  selectedConversationKey: string | null;
  selectedConversationType?: ChatConversationSummary['type'] | null;
  typingUserIds?: Record<string, true>;
  onSelectTeam: (conversationKey: string) => Promise<void>;
  onStartDmWithUser: (otherUserId: string) => Promise<void>;
  onCreateTeam: (name: string, memberIds: string[], avatar?: string | null) => Promise<void>;
  onUpdateTeam: (conversationKey: string, payload: { name?: string; memberIds?: string[]; avatar?: string | null }) => Promise<void>;
  onDeleteTeam: (conversationKey: string) => Promise<void>;
  onPreviewUser: (user: ChatUser) => void;
  onPreviewTeamAvatar: (team: ChatConversationSummary) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [teamAvatar, setTeamAvatar] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [managingTeam, setManagingTeam] = useState<ChatConversationSummary | null>(null);
  const [teamMenuOpenKey, setTeamMenuOpenKey] = useState<string | null>(null);
  const [teamAvatarCropFile, setTeamAvatarCropFile] = useState<File | null>(null);
  const [teamManageIntent, setTeamManageIntent] = useState<'edit' | 'members'>('edit');
  const [teamToDelete, setTeamToDelete] = useState<ChatConversationSummary | null>(null);
  const [teamActionLoading, setTeamActionLoading] = useState<null | 'create' | 'save' | 'delete'>(null);
  const createAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const manageAvatarInputRef = useRef<HTMLInputElement | null>(null);

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
    setTeamAvatar(null);
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const upload = await apiUploadFile(file);
      setTeamAvatar(upload.fileUrl || upload.urlPath || null);
    } finally {
      setAvatarUploading(false);
    }
  };

  const openManageTeam = (team: ChatConversationSummary, intent: 'edit' | 'members' = 'edit') => {
    setTeamMenuOpenKey(null);
    setManagingTeam(team);
    setTeamName(team.title || '');
    setMemberIds((team.memberIds || []).filter((id) => id !== currentUserId));
    setTeamAvatar(team.avatar || null);
    setTeamManageIntent(intent);
    setManageOpen(true);
  };

  return (
    <div className="w-80 hidden lg:flex flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-900 font-bold">Communication</div>
            <div className="text-xs text-slate-500 mt-0.5">Teams and direct messaging</div>
          </div>
        </div>
        <Mail size={16} className="text-slate-400" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Teams</div>
            </div>
            {canManageTeams ? (
              <button
                type="button"
                onClick={() => {
                  resetTeamForm();
                  setCreateOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
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
              <div
                key={c.conversationKey}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border ${
                  active ? 'bg-[#eef4ff] border-[#d7e5fb] ring-1 ring-[#d7e5fb]' : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectTeam(c.conversationKey)}
                    className="min-w-0 flex flex-1 items-center gap-2 text-left"
                  >
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                      {c.avatar ? (
                        <img
                          src={getDisplayAvatarUrl(c.avatar, c.title)}
                          alt={c.title}
                          className="h-full w-full cursor-pointer object-cover"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewTeamAvatar(c);
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase text-slate-500">
                          {(c.title || 'T').slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{c.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500 truncate">{c.lastMessagePreview || 'No messages yet'}</div>
                    </div>
                  </button>
                  <div className="shrink-0 flex items-center gap-2">
                    {canManageTeams ? (
                      <div className="relative flex items-center gap-1">
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTeamMenuOpenKey((prev) => prev === c.conversationKey ? null : c.conversationKey);
                          }}
                        >
                          <MoreVertical size={14} />
                        </button>
                        {teamMenuOpenKey === c.conversationKey ? (
                          <div className="absolute right-0 top-8 z-40 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openManageTeam(c, 'edit');
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openManageTeam(c, 'members');
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Add member
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setTeamMenuOpenKey(null);
                                setTeamToDelete(c);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {typeof c.unreadCount === 'number' && c.unreadCount > 0 ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" aria-hidden />
                    ) : null}
                  </div>
                </div>
              </div>
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
                selectedConversationKey === selfDm.conversationKey ? 'bg-[#eef4ff] border-[#d7e5fb]' : 'border-transparent hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src={
                      getDisplayAvatarUrl(currentUser?.avatar, currentUser?.name || 'you')
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
            const showTypingStatus = !!active && selectedConversationType === 'dm' && !!typingUserIds?.[u.id];
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onStartDmWithUser(u.id)}
                className={`w-full text-left px-3 py-2 rounded-xl transition-all border ${
                  active ? 'bg-[#eef4ff] border-[#d7e5fb]' : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={
                        getDisplayAvatarUrl(u.avatar, u.name)
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
                    <div className={`text-xs truncate ${showTypingStatus ? 'font-medium text-emerald-600' : 'text-slate-500'}`}>
                      {showTypingStatus ? 'Typing...' : (dm?.lastMessagePreview || 'Start chat')}
                    </div>
                  </div>
                  {dm && typeof dm.unreadCount === 'number' && dm.unreadCount > 0 ? (
                    <span className="inline-flex min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => createAvatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="group relative h-14 w-14 overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-sm disabled:opacity-60"
              aria-label="Set team profile picture"
            >
              {teamAvatar ? (
                <img src={getDisplayAvatarUrl(teamAvatar, teamName || 'Team')} alt="Team avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-500">Team</div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-slate-950/35 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Camera size={17} />
              </span>
            </button>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">Team profile</div>
              <div className="text-xs text-slate-500">{avatarUploading ? 'Uploading...' : 'Click camera to adjust photo'}</div>
              <input
                ref={createAvatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  setTeamAvatarCropFile(e.target.files?.[0] || null);
                  e.currentTarget.value = '';
                }}
              />
            </div>
          </div>
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Team name"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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
                setTeamActionLoading('create');
                try {
                  await onCreateTeam(teamName, memberIds, teamAvatar);
                  setCreateOpen(false);
                } finally {
                  setTeamActionLoading(null);
                }
              }}
              disabled={!teamName.trim() || teamActionLoading === 'create'}
              className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {teamActionLoading === 'create' ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </MessageActionModal>

      <MessageActionModal
        open={manageOpen}
        title={managingTeam ? (teamManageIntent === 'members' ? `Add members to ${managingTeam.title}` : `Manage ${managingTeam.title}`) : 'Manage Team'}
        description={teamManageIntent === 'members' ? 'Select people to add or remove from this team.' : 'Edit team name, members, or profile photo.'}
        onClose={() => setManageOpen(false)}
      >
        <div className="space-y-3">
          {teamManageIntent === 'members' ? (
            <>
              <div className="text-xs text-slate-500">Select members to add/remove, then save.</div>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 p-2">
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
                <button type="button" onClick={() => setManageOpen(false)} disabled={teamActionLoading === 'save'} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!managingTeam) return;
                    setTeamActionLoading('save');
                    try {
                      await onUpdateTeam(managingTeam.conversationKey, { memberIds });
                      setManageOpen(false);
                    } finally {
                      setTeamActionLoading(null);
                    }
                  }}
                  disabled={teamActionLoading === 'save'}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {teamActionLoading === 'save' ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => manageAvatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="group relative h-14 w-14 overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-sm disabled:opacity-60"
                  aria-label="Set team profile picture"
                >
                  {teamAvatar ? (
                    <img src={getDisplayAvatarUrl(teamAvatar, teamName || 'Team')} alt="Team avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-500">Team</div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/35 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera size={17} />
                  </span>
                </button>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">Team profile</div>
                  <div className="text-xs text-slate-500">{avatarUploading ? 'Uploading...' : 'Click camera to adjust photo'}</div>
                  <input
                    ref={manageAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      setTeamAvatarCropFile(e.target.files?.[0] || null);
                      e.currentTarget.value = '';
                    }}
                  />
                </div>
              </div>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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
                  onClick={() => {
                    if (!managingTeam) return;
                    setTeamToDelete(managingTeam);
                  }}
                  disabled={teamActionLoading === 'delete'}
                  className="inline-flex items-center gap-1 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 size={13} />
                  Remove Team
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!managingTeam) return;
                    setTeamActionLoading('save');
                    try {
                      await onUpdateTeam(managingTeam.conversationKey, { name: teamName, memberIds, avatar: teamAvatar });
                      setManageOpen(false);
                    } finally {
                      setTeamActionLoading(null);
                    }
                  }}
                  disabled={teamActionLoading === 'save'}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <UserPlus size={13} />
                  {teamActionLoading === 'save' ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          )}
        </div>
      </MessageActionModal>

      <AvatarCropModal
        open={!!teamAvatarCropFile}
        file={teamAvatarCropFile}
        onClose={() => setTeamAvatarCropFile(null)}
        onConfirm={async (file) => {
          await handleAvatarUpload(file);
        }}
      />

      <MessageActionModal
        open={!!teamToDelete}
        title="Delete team"
        description={teamToDelete ? `Are you sure you want to delete ${teamToDelete.title}?` : 'Are you sure you want to delete this team?'}
        onClose={() => {
          if (teamActionLoading === 'delete') return;
          setTeamToDelete(null);
        }}
      >
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setTeamToDelete(null)}
            disabled={teamActionLoading === 'delete'}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            No
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!teamToDelete) return;
              setTeamActionLoading('delete');
              try {
                await onDeleteTeam(teamToDelete.conversationKey);
                setTeamToDelete(null);
                if (managingTeam?.conversationKey === teamToDelete.conversationKey) {
                  setManageOpen(false);
                }
              } finally {
                setTeamActionLoading(null);
              }
            }}
            disabled={teamActionLoading === 'delete'}
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            {teamActionLoading === 'delete' ? 'Deleting...' : 'Yes, delete'}
          </button>
        </div>
      </MessageActionModal>
    </div>
  );
}

