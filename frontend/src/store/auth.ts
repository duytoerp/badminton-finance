import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userName: string | null;
  fullName: string | null;
  roles: string[];
  setAuth: (token: string, userName: string, fullName: string, roles?: string[]) => void;
  logout: () => void;
  isAdmin: () => boolean;
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
  isAdmin: () => get().roles.includes('Admin')
}));
