import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatWpm(wpm: number): string { return Math.round(wpm).toString(); }
export function wpmColor(wpm: number): string {
  if (wpm >= 120) return 'text-yellow-400';
  if (wpm >= 80)  return 'text-emerald-400';
  if (wpm >= 50)  return 'text-blue-400';
  if (wpm >= 30)  return 'text-orange-400';
  return 'text-red-400';
}
export function formatPercent(v: number): string { return `${Math.round(v)}%`; }
export function getInitials(name: string, n = 2): string { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, n); }
export function formatDuration(ms: number): string { const s=Math.floor(ms/1000),m=Math.floor(s/60); return m>0?`${m}m ${s%60}s`:`${s}s`; }
export function timeAgo(date: Date|string): string {
  const d=typeof date==='string'?new Date(date):date, diff=(Date.now()-d.getTime())/1000;
  if(diff<60) return `${Math.floor(diff)}s ago`;
  if(diff<3600) return `${Math.floor(diff/60)}m ago`;
  if(diff<86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}
export function ordinal(n: number): string { const s=['th','st','nd','rd'],v=n%100; return n+(s[(v-20)%10]??s[v]??s[0]); }
export function clamp(v: number, min: number, max: number): number { return Math.max(min,Math.min(max,v)); }
export function throttle<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let last=0; return ((...args:any[])=>{ const now=Date.now(); if(now-last>=ms){last=now;return fn(...args);} }) as T;
}
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let t:any; return ((...args:any[])=>{clearTimeout(t);t=setTimeout(()=>fn(...args),ms);}) as T;
}
export const storage = {
  get(k:string):string|null { if(typeof window==='undefined')return null; try{return localStorage.getItem(k);}catch{return null;} },
  set(k:string,v:string):void { if(typeof window==='undefined')return; try{localStorage.setItem(k,v);}catch{} },
  remove(k:string):void { if(typeof window==='undefined')return; try{localStorage.removeItem(k);}catch{} },
};
export function passwordStrength(pw:string):{score:number;label:string;color:string} {
  let s=0;
  if(pw.length>=8)s++; if(pw.length>=12)s++; if(/[A-Z]/.test(pw))s++; if(/[0-9]/.test(pw))s++; if(/[^a-zA-Z0-9]/.test(pw))s++;
  const labels=['Very weak','Weak','Fair','Strong','Very strong','Excellent'];
  const colors=['text-red-500','text-orange-500','text-yellow-500','text-emerald-400','text-emerald-400','text-emerald-400'];
  return {score:s,label:labels[s]??'Very weak',color:colors[s]??'text-red-500'};
}
