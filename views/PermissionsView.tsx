import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { BACKEND_ROLES, BackendRole, PermissionKey, ROLE_LABELS } from '../config/permissions';
import { PageHeaderSkeleton, PermissionsMatrixSkeleton } from '../components/ui/Skeleton';

type Matrix = Record<BackendRole, PermissionKey[]>;

interface PermissionMeta {
  key: PermissionKey;
  label: string;
}

interface PermissionsViewProps {
  canEdit: boolean;
}

const EMPTY_MATRIX: Matrix = {
  SUPER_ADMIN: [],
  ADMIN: [],
  TEAM_LEAD: [],
  EMPLOYEE: [],
};
const PERMISSIONS_UPDATE_KEY = 'rapidgrow-permissions-updated-at';
const BROADCAST_CHANNEL = 'rapidgrow-permissions';

function toPermissionArray(value: unknown): PermissionKey[] {
  if (Array.isArray(value)) return value.filter(Boolean) as PermissionKey[];
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).filter(Boolean) as PermissionKey[];
  }
  return [];
}

const PermissionsView: React.FC<PermissionsViewProps> = ({ canEdit }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<PermissionMeta[]>([]);
  const [matrix, setMatrix] = useState<Matrix>(EMPTY_MATRIX);
  const [editableRoles, setEditableRoles] = useState<BackendRole[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/permissions`, { headers: getAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to fetch permissions');
        if (cancelled) return;
        setMetadata(Array.isArray(data.metadata) ? data.metadata : []);
        setEditableRoles(Array.isArray(data.editableRoles) ? data.editableRoles : []);
        setMatrix({
          SUPER_ADMIN: toPermissionArray(data.rolePermissions?.SUPER_ADMIN),
          ADMIN: toPermissionArray(data.rolePermissions?.ADMIN),
          TEAM_LEAD: toPermissionArray(data.rolePermissions?.TEAM_LEAD),
          EMPLOYEE: toPermissionArray(data.rolePermissions?.EMPLOYEE),
        });
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Unable to load permissions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const orderedPermissions = useMemo(() => metadata, [metadata]);
  const visibleRoles = useMemo<BackendRole[]>(() => {
    // Admin portal should not show SUPER_ADMIN/ADMIN columns.
    if (!editableRoles.includes('SUPER_ADMIN')) {
      return ['TEAM_LEAD', 'EMPLOYEE'];
    }
    return BACKEND_ROLES;
  }, [editableRoles]);
  const canEditRole = (role: BackendRole) => canEdit && editableRoles.includes(role);

  const toggle = (role: BackendRole, permission: PermissionKey) => {
    if (!canEditRole(role)) return;
    setSuccess(null);
    setMatrix(prev => {
      const exists = prev[role].includes(permission);
      return {
        ...prev,
        [role]: exists
          ? prev[role].filter(p => p !== permission)
          : [...prev[role], permission],
      };
    });
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/permissions`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rolePermissions: matrix }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update permissions');
      setMatrix({
        SUPER_ADMIN: toPermissionArray(data.rolePermissions?.SUPER_ADMIN),
        ADMIN: toPermissionArray(data.rolePermissions?.ADMIN),
        TEAM_LEAD: toPermissionArray(data.rolePermissions?.TEAM_LEAD),
        EMPLOYEE: toPermissionArray(data.rolePermissions?.EMPLOYEE),
      });
      setEditableRoles(Array.isArray(data.editableRoles) ? data.editableRoles : editableRoles);
      setSuccess('Permissions updated successfully.');
      window.dispatchEvent(new CustomEvent('rapidgrow-permissions-updated'));
      localStorage.setItem(PERMISSIONS_UPDATE_KEY, String(Date.now()));
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL);
        channel.postMessage({ updatedAt: Date.now() });
        channel.close();
      }
    } catch (err: any) {
      setError(err.message || 'Unable to update permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <PermissionsMatrixSkeleton roleColumns={3} rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl text-slate-900">Permissions</h2>
        <p className="text-slate-500 mt-2">Manage role-based feature access for the system.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">{error}</div>}
      {success && <div className="rounded-xl border border-green-200 bg-green-50 text-green-700 px-4 py-3">{success}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Permission</th>
              {visibleRoles.map(role => (
                <th key={role} className="px-4 py-3 text-sm font-semibold text-slate-700 text-center">{ROLE_LABELS[role]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orderedPermissions.map(permission => (
              <tr key={permission.key} className="border-b last:border-b-0 border-slate-100">
                <td className="px-4 py-3 text-sm text-slate-800">{permission.label}</td>
                {visibleRoles.map(role => (
                  <td key={`${permission.key}-${role}`} className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={matrix[role].includes(permission.key)}
                      onChange={() => toggle(role, permission.key)}
                      disabled={!canEditRole(role)}
                      className="h-4 w-4 accent-brand-red disabled:opacity-60"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={!canEdit || saving || editableRoles.length === 0}
          className="px-6 py-3 rounded-xl bg-brand-red text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default PermissionsView;
