import axios from 'axios';
import { storage } from './utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const api = axios.create({ baseURL: `${API_URL}/api/v1`, timeout: 15_000, headers: {'Content-Type':'application/json'}, withCredentials: true });

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };
export const getAccessToken = () => accessToken;

let isRefreshing = false;
let queue: Array<(t:string)=>void> = [];

api.interceptors.request.use((cfg) => { if(accessToken) cfg.headers.Authorization=`Bearer ${accessToken}`; return cfg; });

api.interceptors.response.use(r=>r, async(err)=>{
  const orig = err.config as any;
  if(err.response?.status===401 && !orig?._retry) {
    if(isRefreshing) return new Promise(resolve=>queue.push(t=>{orig.headers.Authorization=`Bearer ${t}`;resolve(api(orig));}));
    orig._retry=true; isRefreshing=true;
    try {
      const rt=storage.get('qr_refresh'); if(!rt) throw new Error('No refresh token');
      const {data}=await axios.post(`${API_URL}/api/v1/auth/refresh`,{refreshToken:rt});
      const newToken=data?.data?.accessToken??data?.accessToken; if(!newToken) throw new Error();
      setAccessToken(newToken); if(data?.data?.refreshToken) storage.set('qr_refresh',data.data.refreshToken);
      queue.forEach(cb=>cb(newToken)); queue=[];
      orig.headers.Authorization=`Bearer ${newToken}`; return api(orig);
    } catch { setAccessToken(null); storage.remove('qr_refresh'); if(typeof window!=='undefined') window.location.href='/login'; return Promise.reject(err); }
    finally { isRefreshing=false; }
  }
  return Promise.reject(err);
});

async function get<T>(url:string, params?:any): Promise<T> { const r=await api.get(url,{params}); return (r.data?.data??r.data) as T; }
async function post<T>(url:string, body?:any): Promise<T> { const r=await api.post(url,body); return (r.data?.data??r.data) as T; }
async function patch<T>(url:string, body?:any): Promise<T> { const r=await api.patch(url,body); return (r.data?.data??r.data) as T; }
async function del<T>(url:string): Promise<T> { const r=await api.delete(url); return (r.data?.data??r.data) as T; }

export { get as apiGet, post as apiPost, patch as apiPatch, del as apiDelete };

export const authApi = {
  register:(dto:{email:string;username:string;displayName:string;password:string}) => post<any>('/auth/register',dto),
  login:(dto:{identifier:string;password:string}) => post<any>('/auth/login',dto),
  me:() => get<any>('/users/me'),
  logout:() => post<void>('/auth/logout'),
};
