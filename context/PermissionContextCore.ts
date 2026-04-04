import { createContext } from 'react';
import { PermissionKey } from '../config/permissions';

export type BackendRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | '';

export interface PermissionState {
  role: BackendRole;
  permissions: PermissionKey[];
  loading: boolean;
  hasPermission: (permission: PermissionKey | string) => boolean;
  canAccess: (role: string | undefined, permission: PermissionKey | string) => boolean;
  refreshPermissions: () => Promise<void>;
}

export const PermissionContext = createContext<PermissionState>({
  role: '',
  permissions: [],
  loading: false,
  hasPermission: () => false,
  canAccess: () => false,
  refreshPermissions: async () => {},
});
