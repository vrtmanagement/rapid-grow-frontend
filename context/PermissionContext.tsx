import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { PermissionKey } from '../config/permissions';
import { getSocket } from '../realtime/socket';

type BackendRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | '';

interface PermissionState {
  role: BackendRole;
  permissions: PermissionKey[];
  loading: boolean;
  hasPermission: (permission: PermissionKey | string) => boolean;
  canAccess: (role: string | undefined, permission: PermissionKey | string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionState>({
  role: '',
  permissions: [],
  loading: false,
  hasPermission: () => false,
  canAccess: () => false,
  refreshPermissions: async () => {},
});

const CACHE_KEY = 'rapidgrow-permissions-cache-v1';
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

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<BackendRole>(getBackendRole());
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshPermissions = useCallback(async () => {
    const nextRole = getBackendRole();
    setRole(nextRole);
    if (!nextRole) {
      setPermissions([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/permissions/me`, { headers: getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const nextPermissions = Array.isArray(data?.permissions) ? data.permissions : [];
        setPermissions(nextPermissions);
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ role: nextRole, permissions: nextPermissions, at: Date.now() })
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached?.role === role && Array.isArray(cached?.permissions)) {
          setPermissions(cached.permissions);
        }
      }
    } catch {
      // Ignore cache parse errors.
    }
    refreshPermissions();
  }, [refreshPermissions, role]);

  useEffect(() => {
    const onUpdated = () => {
      refreshPermissions();
    };
    window.addEventListener('rapidgrow-permissions-updated', onUpdated as EventListener);
    return () => {
      window.removeEventListener('rapidgrow-permissions-updated', onUpdated as EventListener);
    };
  }, [refreshPermissions]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === PERMISSIONS_UPDATE_KEY) {
        refreshPermissions();
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
      refreshPermissions();
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
      refreshPermissions();
    };

    socket.on('permissions:update', onPermissionsUpdate);

    return () => {
      socket.off('permissions:update', onPermissionsUpdate);
    };
  }, [refreshPermissions]);

  useEffect(() => {
    // Refresh on route changes inside current session.
    const onRouteChange = () => {
      refreshPermissions();
    };
    window.addEventListener('hashchange', onRouteChange);
    return () => {
      window.removeEventListener('hashchange', onRouteChange);
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

export function usePermissions() {
  return useContext(PermissionContext);
}

