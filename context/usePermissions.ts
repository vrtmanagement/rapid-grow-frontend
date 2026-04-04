import { useContext } from 'react';
import { PermissionContext } from './PermissionContextCore';

export function usePermissions() {
  return useContext(PermissionContext);
}
