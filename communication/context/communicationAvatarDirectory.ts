import { fetchTabEndpoint } from '../../services/tabSessionCache';
import { getStoredAuth, resolveAvatarUrl } from './communicationContextHelpers';

export type EmployeeAvatarDirectory = {
  byId: Map<string, string>;
  byEmpId: Map<string, string>;
  byName: Map<string, string>;
};

function createEmptyAvatarDirectory(): EmployeeAvatarDirectory {
  return {
    byId: new Map<string, string>(),
    byEmpId: new Map<string, string>(),
    byName: new Map<string, string>(),
  };
}

function addAvatarToDirectory(
  directory: EmployeeAvatarDirectory,
  input: { id?: unknown; _id?: unknown; empId?: unknown; name?: unknown; empName?: unknown; avatar?: unknown },
) {
  const avatar = resolveAvatarUrl(typeof input.avatar === 'string' ? input.avatar : '');
  if (!avatar) return;
  const id = String(input.id || input._id || '').trim();
  const empId = String(input.empId || '').trim();
  const name = String(input.name || input.empName || '').trim().toLowerCase();
  if (id) directory.byId.set(id, avatar);
  if (empId) directory.byEmpId.set(empId, avatar);
  if (name) directory.byName.set(name, avatar);
}

function loadStoredAvatarDirectory(): EmployeeAvatarDirectory {
  const directory = createEmptyAvatarDirectory();
  try {
    const auth = getStoredAuth();
    if (auth?.employee) {
      addAvatarToDirectory(directory, {
        _id: auth.employee._id,
        empId: auth.employee.empId,
        empName: auth.employee.empName || auth.employee.name,
        avatar: auth.employee.avatar,
      });
    }
  } catch {
    // Ignore malformed auth storage.
  }

  try {
    const raw = localStorage.getItem('rapidgrow-os-v1');
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.currentUser) {
      addAvatarToDirectory(directory, parsed.currentUser);
    }
    if (Array.isArray(parsed?.team)) {
      parsed.team.forEach((member: any) => addAvatarToDirectory(directory, member));
    }
  } catch {
    // Ignore stale app state storage.
  }

  return directory;
}

function mergeAvatarDirectories(...directories: EmployeeAvatarDirectory[]): EmployeeAvatarDirectory {
  const merged = createEmptyAvatarDirectory();
  directories.forEach((directory) => {
    directory.byId.forEach((avatar, key) => merged.byId.set(key, avatar));
    directory.byEmpId.forEach((avatar, key) => merged.byEmpId.set(key, avatar));
    directory.byName.forEach((avatar, key) => merged.byName.set(key, avatar));
  });
  return merged;
}

export async function loadEmployeeAvatarDirectory(): Promise<EmployeeAvatarDirectory> {
  const byId = new Map<string, string>();
  const byEmpId = new Map<string, string>();
  const byName = new Map<string, string>();
  const apiDirectory = { byId, byEmpId, byName };
  try {
    const employees = await fetchTabEndpoint<unknown[]>('communication', '/employees');
    if (!Array.isArray(employees)) return mergeAvatarDirectories(loadStoredAvatarDirectory(), apiDirectory);
    employees.forEach((employee: any) => {
      addAvatarToDirectory(apiDirectory, employee);
    });
  } catch {
    // Communication can still render fallbacks if the broader directory is unavailable.
  }
  return mergeAvatarDirectories(loadStoredAvatarDirectory(), apiDirectory);
}

export function avatarFromDirectory(directory: EmployeeAvatarDirectory, id?: string, empId?: string, name?: string) {
  const normalizedId = String(id || '').trim();
  const normalizedEmpId = String(empId || '').trim();
  const normalizedName = String(name || '').trim().toLowerCase();
  return (
    (normalizedId ? directory.byId.get(normalizedId) : '') ||
    (normalizedEmpId ? directory.byEmpId.get(normalizedEmpId) : '') ||
    (normalizedName ? directory.byName.get(normalizedName) : '') ||
    ''
  );
}
