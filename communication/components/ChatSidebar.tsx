import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChatConversationSummary, ChatUser } from '../types';
import { Camera, Mail, MoreVertical, Plus, Trash2, UserPlus } from 'lucide-react';
import { MessageActionModal } from './MessageActionModal';
import { apiUploadFile } from '../api';
import { getDisplayAvatarUrl } from '../../utils/avatar';
import AvatarCropModal from '../../components/profile/AvatarCropModal';

function formatMessageTimestamp(value?: string | null) {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} Min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} Hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} Day ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  const [peopleFilter, setPeopleFilter] = useState<'all' | 'unread'>('all');
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
  const teamMenuRef = useRef<HTMLDivElement | null>(null);

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
  const unreadPeopleCount = useMemo(() => {
    let count = 0;
    if ((selfDm?.unreadCount || 0) > 0) count += 1;
    people.forEach((user) => {
      const dm = dmByUserId.get(user.id);
      if ((dm?.unreadCount || 0) > 0) count += 1;
    });
    return count;
  }, [dmByUserId, people, selfDm]);
  const showSelfDm = !!selfDm && (peopleFilter === 'all' || (selfDm.unreadCount || 0) > 0);
  const filteredPeople = useMemo(() => {
    if (peopleFilter === 'all') return people;
    return people.filter((user) => (dmByUserId.get(user.id)?.unreadCount || 0) > 0);
  }, [dmByUserId, people, peopleFilter]);
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

  useEffect(() => {
    if (!teamMenuOpenKey) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (teamMenuRef.current?.contains(target)) return;
      setTeamMenuOpenKey(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTeamMenuOpenKey(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [teamMenuOpenKey]);

  return (
    <div className="communication-sidebar w-80 hidden lg:flex flex-col border-r border-slate-200 bg-white">
      <div className="communication-sidebar-header flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-900 font-bold">Communication</div>
            <div className="text-xs text-slate-500 mt-0.5">Teams and direct messaging</div>
          </div>
        </div>
        <Mail size={16} className="text-slate-400" />
      </div>

      <div className="flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="px-4 pt-3 pb-1.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="communication-sidebar-section-label text-xs font-semibold text-slate-500 uppercase tracking-wide">Teams</div>
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
        <div className="pb-2.5">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`team-skeleton-${index}`}
                className="w-full px-4 py-1.5 rounded-xl border border-transparent animate-pulse"
              >
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded-full bg-slate-200" />
                  <div className="h-3.5 w-44 rounded-full bg-slate-100" />
                </div>
              </div>
            ))
          ) : teamConversations.map((c) => {
            const active = selectedConversationKey === c.conversationKey;
            return (
              <div
                key={c.conversationKey}
                className={`communication-sidebar-item relative w-full text-left px-0 py-2 transition-all border-y ${
                  teamMenuOpenKey === c.conversationKey ? 'z-30 overflow-visible ' : 'overflow-hidden '
                }${
                  active ? 'communication-sidebar-item-active border-brand-red/10 bg-[#fff1f1] shadow-none' : 'border-transparent hover:bg-slate-50'
                }`}
              >
                {active ? (
                  <span className="absolute inset-y-0 left-0 w-1 bg-brand-red" aria-hidden />
                ) : null}
                <div className="flex w-full items-center justify-between gap-2.5 px-4">
                  <button
                    type="button"
                    onClick={() => onSelectTeam(c.conversationKey)}
                    className="min-w-0 flex flex-1 items-center gap-2 text-left"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
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
                        <div className="flex h-full w-full items-center justify-center text-[9px] font-bold uppercase text-slate-500">
                          {(c.title || 'T').slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="communication-sidebar-title truncate text-[12px] font-semibold text-slate-900">{c.title}</div>
                      <div className="communication-sidebar-preview mt-0.5 truncate text-[9px] text-slate-500">{c.lastMessagePreview || 'No messages yet'}</div>
                    </div>
                  </button>
                  <div className="shrink-0 flex items-center gap-2">
                    {canManageTeams ? (
                      <div
                        ref={teamMenuOpenKey === c.conversationKey ? teamMenuRef : null}
                        className="relative flex items-center gap-1"
                      >
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTeamMenuOpenKey((prev) => prev === c.conversationKey ? null : c.conversationKey);
                          }}
                        >
                          <MoreVertical size={14} />
                        </button>
                        {teamMenuOpenKey === c.conversationKey ? (
                          <div className="absolute right-0 top-8 z-50 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
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
                      <span className="inline-flex h-6.5 min-w-[1.65rem] items-center justify-center rounded-full bg-brand-red px-1.5 text-[10px] font-bold text-white">
                        {c.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
          {!loading && !teamConversations.length ? (
            <div className="communication-sidebar-preview px-3 py-5 text-sm text-slate-500">
              {canManageTeams ? 'No teams yet. Create one to start group chat.' : 'You are not part of any team yet.'}
            </div>
          ) : null}
        </div>

        <div className="px-4 pt-3 pb-1.5 border-t border-slate-200">
          <div className="flex items-center justify-between gap-2">
            <div className="communication-sidebar-section-label text-xs font-semibold text-slate-500 uppercase tracking-wide">People</div>
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setPeopleFilter('all')}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                  peopleFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setPeopleFilter('unread')}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                  peopleFilter === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {unreadPeopleCount > 0 ? `Unread (${unreadPeopleCount})` : 'Unread'}
              </button>
            </div>
          </div>
        </div>
        <div className="pb-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`people-skeleton-${index}`}
                className="w-full px-4 py-2 rounded-xl border border-transparent animate-pulse"
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
          ) : showSelfDm ? (
            <button
              key="self-chat"
              type="button"
              onClick={() => onStartDmWithUser(currentUserId)}
              className={`communication-sidebar-item relative w-full overflow-hidden text-left px-0 py-2 transition-all border-y ${
                selectedConversationKey === selfDm.conversationKey
                  ? 'communication-sidebar-item-active border-brand-red/10 bg-[#fff1f1] shadow-none'
                  : 'border-transparent hover:bg-slate-50'
              }`}
            >
              {selectedConversationKey === selfDm.conversationKey ? (
                <span className="absolute inset-y-0 left-0 w-1 bg-brand-red" aria-hidden />
              ) : null}
              <div className="flex items-start gap-2 px-4">
                <div className="relative shrink-0">
                  <img
                    src={
                      getDisplayAvatarUrl(currentUser?.avatar, currentUser?.name || 'you')
                    }
                    alt=""
                    className="h-10 w-10 rounded-full border border-slate-200 bg-slate-50 object-cover cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentUser) onPreviewUser(currentUser);
                    }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" aria-hidden />
                </div>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="communication-sidebar-title truncate text-[12px] font-semibold text-slate-900">{currentUser?.name || 'You'} (You)</div>
                    <div className="communication-sidebar-preview mt-0.5 truncate text-[9px] text-slate-500">{selfDm.lastMessagePreview || 'Message yourself'}</div>
                  </div>
                  <div className="flex shrink-0 min-w-[64px] flex-col items-end gap-2 pt-0.5">
                    <span className="text-[9px] font-medium text-slate-700">{formatMessageTimestamp(selfDm.lastMessageAt)}</span>
                    {typeof selfDm.unreadCount === 'number' && selfDm.unreadCount > 0 ? (
                      <span className="inline-flex h-6.5 min-w-[1.65rem] items-center justify-center rounded-full bg-brand-red px-1.5 text-[10px] font-bold text-white">
                        {selfDm.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          ) : null}
          {!loading && filteredPeople.map((u) => {
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
              className={`communication-sidebar-item relative w-full overflow-hidden text-left px-0 py-2 transition-all border-y ${
                  active ? 'communication-sidebar-item-active border-brand-red/10 bg-[#fff1f1] shadow-none' : 'border-transparent hover:bg-slate-50'
                }`}
              >
                {active ? (
                  <span className="absolute inset-y-0 left-0 w-1 bg-brand-red" aria-hidden />
                ) : null}
                <div className="flex items-start gap-2 px-4">
                  <div className="relative shrink-0">
                    <img
                      src={
                        getDisplayAvatarUrl(u.avatar, u.name)
                      }
                      alt=""
                      className="h-10 w-10 rounded-full border border-slate-200 bg-slate-50 object-cover cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewUser(u);
                      }}
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                        u.online ? 'bg-emerald-400' : 'bg-slate-300'
                      }`}
                      aria-hidden
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="communication-sidebar-title truncate text-[12px] font-semibold text-slate-900">{u.name}</div>
                      <div className={`communication-sidebar-preview mt-0.5 truncate text-[9px] ${showTypingStatus ? 'font-medium text-emerald-600' : 'text-slate-500'}`}>
                        {showTypingStatus ? 'Typing...' : (dm?.lastMessagePreview || 'Start chat')}
                      </div>
                    </div>
                    <div className="flex shrink-0 min-w-[64px] flex-col items-end gap-2 pt-0.5">
                      <span className="text-[9px] font-medium text-slate-700">{formatMessageTimestamp(dm?.lastMessageAt)}</span>
                      {dm && typeof dm.unreadCount === 'number' && dm.unreadCount > 0 ? (
                        <span className="inline-flex h-6.5 min-w-[1.65rem] items-center justify-center rounded-full bg-brand-red px-1.5 text-[10px] font-bold text-white">
                          {dm.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {!loading && !showSelfDm && filteredPeople.length === 0 && (
            <div className="communication-sidebar-preview px-3 py-5 text-sm text-slate-500">
              {peopleFilter === 'unread' ? 'No unread chats.' : 'No users found.'}
            </div>
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

