import { create } from "zustand";
import { api } from "@/lib/api";

interface AuthState {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  login: async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password });
    if (res.data?.accessToken) {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      set({ user: res.data.user, token: res.data.accessToken, isLoading: false });
      return res.data;
    }
    throw new Error('Login failed');
  },
  register: async (data) => {
    const res = await api.post('/auth/register', data);
    if (res.data?.accessToken) {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      set({ user: res.data.user, token: res.data.accessToken, isLoading: false });
      return res.data;
    }
    throw new Error('Registration failed');
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, token: null, isLoading: false });
    window.location.href = '/login';
  },
  initialize: async () => {
    set({ isLoading: true });
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const res = await api.get('/users/me');
        set({ user: res.data, token, isLoading: false });
        return;
      } catch {}
    }
    set({ isLoading: false });
  },
}));
