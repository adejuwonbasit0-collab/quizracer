import { create } from 'zustand';
import { authApi, setAccessToken } from '@/lib/api';
import { storage } from '@/lib/utils';
import type { UserPrivateProfile } from '@/lib/types';

interface AuthState {
  user: UserPrivateProfile | null; isLoading: boolean; isAuthenticated: boolean;
  initialize:()=>Promise<void>; login:(id:string,pw:string)=>Promise<void>;
  register:(email:string,username:string,displayName:string,password:string)=>Promise<void>;
  logout:()=>Promise<void>; setUser:(u:UserPrivateProfile)=>void;
}

export const useAuthStore = create<AuthState>((set,get)=>({
  user:null, isLoading:true, isAuthenticated:false,

  initialize: async() => {
    if(get().isAuthenticated){set({isLoading:false});return;}
    set({isLoading:true});
    try {
      const rt=storage.get('qr_refresh'); if(!rt){set({isLoading:false});return;}
      const apiUrl=process.env.NEXT_PUBLIC_API_URL??'http://localhost:4000';
      const res=await fetch(`${apiUrl}/api/v1/auth/refresh`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:rt})});
      if(!res.ok) throw new Error('Refresh failed');
      const json=await res.json(); const tokens=json?.data??json;
      if(!tokens?.accessToken) throw new Error('No token');
      setAccessToken(tokens.accessToken); if(tokens.refreshToken) storage.set('qr_refresh',tokens.refreshToken);
      const user=await authApi.me(); set({user,isAuthenticated:true});
    } catch { setAccessToken(null); storage.remove('qr_refresh'); set({user:null,isAuthenticated:false}); }
    finally { set({isLoading:false}); }
  },

  login: async(identifier,password) => {
    const r=await authApi.login({identifier,password});
    setAccessToken(r.accessToken); storage.set('qr_refresh',r.refreshToken);
    set({user:r.user as UserPrivateProfile,isAuthenticated:true});
  },

  register: async(email,username,displayName,password) => {
    const r=await authApi.register({email,username,displayName,password});
    setAccessToken(r.accessToken); storage.set('qr_refresh',r.refreshToken);
    set({user:r.user as UserPrivateProfile,isAuthenticated:true});
  },

  logout: async() => {
    try{await authApi.logout();}catch{}
    setAccessToken(null); storage.remove('qr_refresh');
    set({user:null,isAuthenticated:false});
  },

  setUser:(user)=>set({user}),
}));
