import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userName: string | null;
  fullName: string | null;
  roles: string[];
  setAuth: (token: string, userName: string, fullName: string, roles?: string[]) => void;
  logout: () => void;
  isAdmin: () => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (...roles: string[]) => boolean;
  isTreasurer: () => boolean;
  canManageSessions: () => boolean;
  canManagePlayers: () => boolean;
  canManageCourts: () => boolean;
  canManageBookings: () => boolean;
  canManageFund: () => boolean;
  canExport: () => boolean;
  canManageTemplates: () => boolean;
  canManageUsers: () => boolean;
  canViewAuditLog: () => boolean;
  canMaintain: () => boolean;
}

function readRoles(): string[] {
  try {
    const raw = localStorage.getItem('user_roles');
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  token: localStorage.getItem('access_token'),
  userName: localStorage.getItem('user_name'),
  fullName: localStorage.getItem('full_name'),
  roles: readRoles(),
  setAuth: (token, userName, fullName, roles = []) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_name', userName);
    localStorage.setItem('full_name', fullName);
    localStorage.setItem('user_roles', JSON.stringify(roles));
    set({ token, userName, fullName, roles });
  },
  logout: () => {
    localStorage.clear();
    set({ token: null, userName: null, fullName: null, roles: [] });
  },
  isAdmin: () => get().roles.includes('Admin'),
  hasRole: (role) => get().roles.includes(role),
  hasAnyRole: (...roles) => {
    const userRoles = get().roles;
    return roles.some(r => userRoles.includes(r));
  },
  isTreasurer: () => get().roles.includes('Treasurer'),
  canManageSessions: () => {
    const r = get().roles;
    return r.includes('Admin') || r.includes('Treasurer');
  },
  canManagePlayers: () => {
    const r = get().roles;
    return r.includes('Admin') || r.includes('Treasurer');
  },
  canManageCourts: () => {
    const r = get().roles;
    return r.includes('Admin') || r.includes('Treasurer');
  },
  canManageBookings: () => {
    const r = get().roles;
    return r.includes('Admin') || r.includes('Treasurer');
  },
  canManageFund: () => {
    const r = get().roles;
    return r.includes('Admin') || r.includes('Treasurer');
  },
  canExport: () => {
    const r = get().roles;
    return r.includes('Admin') || r.includes('Treasurer');
  },
  canManageTemplates: () => get().roles.includes('Admin'),
  canManageUsers: () => get().roles.includes('Admin'),
  canViewAuditLog: () => get().roles.includes('Admin'),
  canMaintain: () => get().roles.includes('Admin')
}));
