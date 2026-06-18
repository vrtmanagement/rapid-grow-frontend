import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { fetchAppBootstrap, type AppBootstrapResponse } from '../services/bootstrapApi';
import { PermissionKey } from '../config/permissions';
import { getSocket } from '../realtime/socket';
import { BackendRole, PermissionContext } from './PermissionContextCore';

const CACHE_KEY = 'rapidgrow-permissions-cache-v3';
const LEGACY_CACHE_KEYS = ['rapidgrow-permissions-cache-v2', 'rapidgrow-permissions-cache-v1'];
const PERMISSIONS_UPDATE_KEY = 'rapidgrow-permissions-updated-at';
const BROADCAST_CHANNEL = 'rapidgrow-permissions';

function getBackendRole(): BackendRole {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return (parsed?.employee?.role || '') as BackendRole;
  } catch {
    return '';
  }
}

function readCachedPermissions(role: BackendRole): PermissionKey[] {
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (!cachedRaw) return [];
    const cached = JSON.parse(cachedRaw);
    if (cached?.role === role && Array.isArray(cached?.permissions)) {
      return cached.permissions as PermissionKey[];
    }
  } catch {
    // Ignore cache parse errors.
  }
  return [];
}

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialRole = getBackendRole();
  const [role, setRole] = useState<BackendRole>(initialRole);
  const [permissions, setPermissions] = useState<PermissionKey[]>(() => readCachedPermissions(initialRole));
  const [loading, setLoading] = useState<boolean>(() => readCachedPermissions(initialRole).length === 0);

  const applyPermissions = useCallback((bootstrap: AppBootstrapResponse) => {
    const nextRole = (bootstrap.permissions?.role || getBackendRole()) as BackendRole;
    const nextPermissions = Array.isArray(bootstrap.permissions?.permissions)
      ? bootstrap.permissions.permissions
      : [];
    setRole(nextRole);
    setPermissions(nextPermissions as PermissionKey[]);
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ role: nextRole, permissions: nextPermissions, at: Date.now() }),
    );
    setLoading(false);
  }, []);

  const refreshPermissions = useCallback(async (options?: { lightweight?: boolean; force?: boolean }) => {
    const nextRole = getBackendRole();
    setRole(nextRole);
    if (!nextRole) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    if (!options?.force && !options?.lightweight && permissions.length > 0) {
      setLoading(false);
      return;
    }

    if (options?.force || options?.lightweight || permissions.length === 0) {
      setLoading(true);
    }
    try {
      if (options?.lightweight) {
        const res = await fetch(`${API_BASE}/permissions/me`, { headers: getAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const nextPermissions = Array.isArray(data?.permissions) ? data.permissions : [];
          setPermissions(nextPermissions);
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ role: nextRole, permissions: nextPermissions, at: Date.now() }),
          );
        }
        return;
      }

      const bootstrap = await fetchAppBootstrap({ force: options?.force });
      applyPermissions(bootstrap);
    } catch {
      const res = await fetch(`${API_BASE}/permissions/me`, { headers: getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const nextPermissions = Array.isArray(data?.permissions) ? data.permissions : [];
        setPermissions(nextPermissions);
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ role: nextRole, permissions: nextPermissions, at: Date.now() }),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [applyPermissions, permissions.length]);

  useEffect(() => {
    for (const legacyKey of LEGACY_CACHE_KEYS) {
      localStorage.removeItem(legacyKey);
    }

    const onBootstrap = (event: Event) => {
      const detail = (event as CustomEvent<AppBootstrapResponse>).detail;
      if (!detail?.permissions) return;
      applyPermissions(detail);
    };

    window.addEventListener('rapidgrow:app-bootstrap', onBootstrap as EventListener);

    if (permissions.length === 0) {
      void refreshPermissions();
    } else {
      setLoading(false);
    }

    return () => {
      window.removeEventListener('rapidgrow:app-bootstrap', onBootstrap as EventListener);
    };
  }, [applyPermissions, permissions.length, refreshPermissions]);

  useEffect(() => {
    const onUpdated = () => {
      refreshPermissions({ force: true });
    };
    window.addEventListener('rapidgrow-permissions-updated', onUpdated as EventListener);
    return () => {
      window.removeEventListener('rapidgrow-permissions-updated', onUpdated as EventListener);
    };
  }, [refreshPermissions]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === PERMISSIONS_UPDATE_KEY) {
        refreshPermissions({ force: true });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshPermissions]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(BROADCAST_CHANNEL);
    const onMessage = () => {
      refreshPermissions({ force: true });
    };
    channel.addEventListener('message', onMessage);
    return () => {
      channel.removeEventListener('message', onMessage);
      channel.close();
    };
  }, [refreshPermissions]);

  useEffect(() => {
    const socket = getSocket();
    const onPermissionsUpdate = () => {
      refreshPermissions({ force: true });
    };

    socket.on('permissions:update', onPermissionsUpdate);

    return () => {
      socket.off('permissions:update', onPermissionsUpdate);
    };
  }, [refreshPermissions]);

  const hasPermission = useCallback(
    (permission: PermissionKey | string) => permissions.includes(permission as PermissionKey),
    [permissions]
  );

  const canAccess = useCallback(
    (targetRole: string | undefined, permission: PermissionKey | string) =>
      !!targetRole && !!permission && hasPermission(permission),
    [hasPermission]
  );

  const value = useMemo(
    () => ({ role, permissions, loading, hasPermission, canAccess, refreshPermissions }),
    [role, permissions, loading, hasPermission, canAccess, refreshPermissions]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};
