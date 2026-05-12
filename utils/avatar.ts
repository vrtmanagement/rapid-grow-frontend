import { API_BASE, AUTH_STORAGE_KEY } from '../config/api';

export const PROFILE_AVATAR_UPDATED_EVENT = 'rapidgrow:profile-avatar-updated';

export function resolveAvatarUrl(rawAvatar?: string | null): string | undefined {
  const avatar = String(rawAvatar || '').trim();
  if (!avatar) return undefined;
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

export function getFallbackAvatarUrl(name?: string | null): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    String(name || 'User').replace(/\s/g, ''),
  )}`;
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
      ...(nextAvatar ? { avatar: nextAvatar } : {}),
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage failures; server state remains the source of truth.
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
