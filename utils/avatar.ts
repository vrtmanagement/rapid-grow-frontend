import { API_BASE, AUTH_STORAGE_KEY } from '../config/api';

export const PROFILE_AVATAR_UPDATED_EVENT = 'rapidgrow:profile-avatar-updated';

function isGeneratedAvatarUrl(avatar: string): boolean {
  return /dicebear\.com/i.test(avatar) || /avataaars/i.test(avatar);
}

export function getAvatarInitials(name?: string | null): string {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'U';
  const first = trimmed.charAt(0);
  return /[a-z]/i.test(first) ? first.toUpperCase() : first || 'U';
}

export function resolveAvatarUrl(rawAvatar?: string | null): string | undefined {
  const avatar = String(rawAvatar || '').trim();
  if (!avatar) return undefined;
  // Generated cartoon avatars are not real profile photos — treat as missing.
  if (isGeneratedAvatarUrl(avatar)) return undefined;
  if (/^(https?:)?\/\//i.test(avatar) || /^data:/i.test(avatar) || /^blob:/i.test(avatar)) {
    return avatar;
  }

  let apiOrigin = '';
  try {
    apiOrigin = new URL(API_BASE).origin;
  } catch {
    apiOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  }

  if (!apiOrigin) return avatar;
  if (avatar.startsWith('/')) return `${apiOrigin}${avatar}`;
  return `${apiOrigin}/${avatar.replace(/^\.?\//, '')}`;
}

const LIGHT_AVATAR_COLORS = [
  { bg: '#dbeafe', fg: '#1d4ed8' }, // blue
  { bg: '#dcfce7', fg: '#15803d' }, // green
  { bg: '#ffedd5', fg: '#c2410c' }, // orange
  { bg: '#fce7f3', fg: '#be185d' }, // pink
  { bg: '#ede9fe', fg: '#6d28d9' }, // violet
  { bg: '#cffafe', fg: '#0e7490' }, // cyan
  { bg: '#fef3c7', fg: '#b45309' }, // amber
  { bg: '#e0e7ff', fg: '#4338ca' }, // indigo
  { bg: '#fce7f3', fg: '#9d174d' }, // rose
  { bg: '#d1fae5', fg: '#047857' }, // emerald
  { bg: '#fee2e2', fg: '#b91c1c' }, // red
  { bg: '#e0f2fe', fg: '#0369a1' }, // sky
];

function hashNameForColor(name?: string | null): number {
  const value = String(name || 'User').trim().toLowerCase() || 'user';
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getAvatarLetterColors(name?: string | null): { bg: string; fg: string } {
  return LIGHT_AVATAR_COLORS[hashNameForColor(name) % LIGHT_AVATAR_COLORS.length];
}

/** Letter fallback used when the user has no uploaded profile photo. */
export function getFallbackAvatarUrl(name?: string | null): string {
  const letter = getAvatarInitials(name);
  const { bg, fg } = getAvatarLetterColors(name);
  const safeLetter = letter
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="${bg}"/><text x="64" y="68" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700" fill="${fg}">${safeLetter}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getDisplayAvatarUrl(rawAvatar?: string | null, name?: string | null): string {
  return resolveAvatarUrl(rawAvatar) || getFallbackAvatarUrl(name);
}

export function persistSessionEmployeeAvatar(avatar?: string | null, employeeUpdates: Record<string, unknown> = {}) {
  const nextAvatar = String(avatar || '').trim();
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.employee = {
      ...(parsed.employee || {}),
      ...employeeUpdates,
      avatar: nextAvatar,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage failures; server state remains the source of truth.
  }

  try {
    const rawAppState = localStorage.getItem('rapidgrow-os-v1');
    if (!rawAppState) return;

    const parsedAppState = JSON.parse(rawAppState);
    const nextEmpId = String(employeeUpdates.empId || '').trim();
    const nextUserId = String(employeeUpdates._id || employeeUpdates.id || '').trim();
    const nextName = String(employeeUpdates.empName || employeeUpdates.name || '').trim();
    const nextEmail = String(employeeUpdates.email || '').trim();

    if (parsedAppState?.currentUser) {
      parsedAppState.currentUser = {
        ...parsedAppState.currentUser,
        ...(nextName ? { name: nextName } : {}),
        ...(nextEmail ? { email: nextEmail } : {}),
        avatar: nextAvatar,
      };
    }

    if (Array.isArray(parsedAppState?.team)) {
      parsedAppState.team = parsedAppState.team.map((member: any) => {
        const memberId = String(member?.id || '').trim();
        const matchesMember =
          (nextUserId && memberId === nextUserId) ||
          (nextEmpId && memberId === nextEmpId) ||
          (parsedAppState?.currentUser?.id && memberId === String(parsedAppState.currentUser.id));

        if (!matchesMember) return member;

        return {
          ...member,
          ...(nextName ? { name: nextName } : {}),
          ...(nextEmail ? { email: nextEmail } : {}),
          avatar: nextAvatar,
        };
      });
    }

    localStorage.setItem('rapidgrow-os-v1', JSON.stringify(parsedAppState));
  } catch {
    // Ignore local app-state persistence failures.
  }
}

export function notifyProfileAvatarUpdated(payload: {
  avatar?: string | null;
  empId?: string | null;
  userId?: string | null;
}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, {
      detail: {
        avatar: String(payload.avatar || '').trim(),
        empId: String(payload.empId || '').trim(),
        userId: String(payload.userId || '').trim(),
      },
    }),
  );
}
