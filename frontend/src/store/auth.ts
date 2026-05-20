import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userName: string | null;
  fullName: string | null;
  setAuth: (token: string, userName: string, fullName: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem('access_token'),
  userName: localStorage.getItem('user_name'),
  fullName: localStorage.getItem('full_name'),
  setAuth: (token, userName, fullName) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_name', userName);
    localStorage.setItem('full_name', fullName);
    set({ token, userName, fullName });
  },
  logout: () => {
    localStorage.clear();
    set({ token: null, userName: null, fullName: null });
  }
}));
