'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Activity, Settings, AlertTriangle, BarChart2, Shield, Search, RefreshCw, Ban, CheckCircle, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import { cn, formatWpm, wpmColor } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Tab = 'overview'|'users'|'moderation'|'settings'|'analytics';
const ADMIN_ROLES = ['ADMIN','SUPERADMIN','MODERATOR'];

export default function AdminPage() {
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');

  useEffect(() => {
    if (user && !ADMIN_ROLES.includes((user as any).role)) router.replace('/dashboard');
  }, [user, router]);

  const { data: overview, refetch: refetchOverview } = useQuery({ queryKey:['admin-overview'], queryFn:()=>apiGet<any>('/admin/analytics/overview'), enabled:tab==='overview', refetchInterval:30_000 });
  const { data: usersData, isFetching:uFetching } = useQuery({ queryKey:['admin-users',userSearch,userFilter], queryFn:()=>apiGet<any>(`/admin/users?search=${encodeURIComponent(userSearch)}&filter=${userFilter}&limit=50`), enabled:tab==='users', staleTime:10_000 });
  const { data: flags, refetch:refetchFlags } = useQuery({ queryKey:['admin-flags'], queryFn:()=>apiGet<any[]>('/admin/anti-cheat/flags?limit=50'), enabled:tab==='moderation' });
  const { data: features, refetch:refetchFeatures } = useQuery({ queryKey:['admin-features'], queryFn:()=>apiGet<any[]>('/admin/features'), enabled:tab==='settings' });
  const { data: analytics } = useQuery({ queryKey:['admin-analytics'], queryFn:()=>apiGet<any>('/admin/analytics/detailed'), enabled:tab==='analytics' });

  const banMutation    = useMutation({ mutationFn:({id,reason}:{id:string;reason:string})=>apiPatch(`/admin/users/${id}/ban`,{reason}), onSuccess:()=>qc.invalidateQueries({queryKey:['admin-users']}) });
  const unbanMutation  = useMutation({ mutationFn:(id:string)=>apiPatch(`/admin/users/${id}/unban`,{}), onSuccess:()=>qc.invalidateQueries({queryKey:['admin-users']}) });
  const roleMutation   = useMutation({ mutationFn:({id,role}:{id:string;role:string})=>apiPatch(`/admin/users/${id}/role`,{role}), onSuccess:()=>qc.invalidateQueries({queryKey:['admin-users']}) });
  const featureMutation= useMutation({ mutationFn:({key,enabled}:{key:string;enabled:boolean})=>apiPatch(`/admin/features/${key}`,{enabled}), onSuccess:()=>refetchFeatures() });
  const dismissMutation= useMutation({ mutationFn:(id:string)=>apiDelete(`/admin/anti-cheat/flags/${id}`), onSuccess:()=>refetchFlags() });

  const tabs = [{key:'overview',label:'Overview',icon:BarChart2},{key:'users',label:'Users',icon:Users},{key:'moderation',label:'Moderation',icon:Shield},{key:'settings',label:'Settings',icon:Settings},{key:'analytics',label:'Analytics',icon:TrendingUp}];
  const overviewCards = overview?[
    {label:'Total Users',value:(overview.totalUsers??0).toLocaleString(),icon:Users,color:'text-brand-400'},
    {label:'Online Now',value:(overview.onlineNow??0).toLocaleString(),icon:Activity,color:'text-emerald-400'},
    {label:'Races Today',value:(overview.racesToday??0).toLocaleString(),icon:BarChart2,color:'text-yellow-400'},
    {label:'Anti-cheat Flags',value:(overview.openFlags??0).toLocaleString(),icon:AlertTriangle,color:'text-red-400'},
  ]:[];

  if (!user || !ADMIN_ROLES.includes((user as any).role)) return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="text-center"><Shield className="w-12 h-12 text-red-500 mx-auto mb-3"/><h1 className="text-xl font-bold text-white mb-1">Access Denied</h1><p className="text-muted-foreground text-sm">Admin privileges required.</p></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Shield className="w-6 h-6 text-brand-400"/>Admin Panel</h1>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium',(user as any)?.role==='SUPERADMIN'?'bg-purple-500/20 text-purple-400 border-purple-500/30':(user as any)?.role==='ADMIN'?'bg-red-500/20 text-red-400 border-red-500/30':'bg-yellow-500/20 text-yellow-400 border-yellow-500/30')}>{(user as any)?.role}</span>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-secondary w-fit overflow-x-auto">
        {tabs.map(({key,label,icon:Icon})=>(
          <button key={key} onClick={()=>setTab(key as Tab)} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',tab===key?'bg-brand-600 text-white':'text-muted-foreground hover:text-foreground')}>
            <Icon className="w-4 h-4"/>{label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab==='overview'&&(
          <motion.div key="overview" initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {overviewCards.map(({label,value,icon:Icon,color})=>(
                <div key={label} className="game-panel p-4">
                  <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">{label}</p><Icon className={cn('w-4 h-4',color)}/></div>
                  <p className={cn('text-2xl font-bold font-mono',color)}>{value}</p>
                </div>
              ))}
            </div>
            <div className="game-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground text-sm">Recent Activity</h2>
                <button onClick={()=>refetchOverview()} className="text-muted-foreground hover:text-foreground transition-colors"><RefreshCw className="w-4 h-4"/></button>
              </div>
              {overview?.recentActivity?.map((a:any,i:number)=>(
                <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-border/20 last:border-0">
                  <span className="text-muted-foreground text-xs w-20 shrink-0">{a.time}</span>
                  <span className="text-foreground/80">{a.description}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab==='users'&&(
          <motion.div key="users" initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/><input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Search…" className="w-full pl-9 pr-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"/></div>
              <select value={userFilter} onChange={e=>setUserFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground outline-none">
                <option value="all">All</option><option value="active">Active</option><option value="banned">Banned</option><option value="admin">Staff</option>
              </select>
              {uFetching&&<RefreshCw className="w-4 h-4 text-muted-foreground animate-spin self-center"/>}
            </div>
            <div className="game-panel overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead><tr className="border-b border-border/50">{['User','Email','WPM','Races','Role','Status','Actions'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>)}</tr></thead>
                <tbody>
                  {usersData?.users?.map((u:any)=>(
                    <tr key={u.id} className={cn('border-b border-border/20 last:border-0 hover:bg-secondary/30 transition-colors',u.isBanned&&'opacity-50')}>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-300 shrink-0">{u.displayName?.[0]??'?'}</div><div><p className="text-sm font-medium">{u.displayName}</p><p className="text-xs text-muted-foreground">@{u.username}</p></div></div></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{u.email}</td>
                      <td className={cn('px-4 py-3 text-sm font-mono font-bold',wpmColor(u.bestWpm??0))}>{formatWpm(u.bestWpm??0)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{(u.totalRaces??0).toLocaleString()}</td>
                      <td className="px-4 py-3"><select defaultValue={u.role??'USER'} onChange={e=>roleMutation.mutate({id:u.id,role:e.target.value})} className="text-xs bg-input border border-border rounded-md px-2 py-1 text-foreground outline-none" disabled={u.id===user?.id}><option value="USER">User</option><option value="MODERATOR">Mod</option><option value="ADMIN">Admin</option></select></td>
                      <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full',u.isBanned?'bg-red-500/20 text-red-400':'bg-emerald-500/20 text-emerald-400')}>{u.isBanned?'Banned':'Active'}</span></td>
                      <td className="px-4 py-3">
                        {u.id!==user?.id&&(!u.isBanned?(
                          <button onClick={()=>banMutation.mutate({id:u.id,reason:'Admin action'})} disabled={banMutation.isPending} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20">
                            <Ban className="w-3 h-3"/>Ban
                          </button>
                        ):(
                          <button onClick={()=>unbanMutation.mutate(u.id)} disabled={unbanMutation.isPending} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20">
                            <CheckCircle className="w-3 h-3"/>Unban
                          </button>
                        ))}
                      </td>
                    </tr>
                  ))}
                  {!usersData?.users?.length&&!uFetching&&<tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab==='moderation'&&(
          <motion.div key="moderation" initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400"/>Anti-Cheat Flags</h2><button onClick={()=>refetchFlags()} className="text-muted-foreground hover:text-foreground"><RefreshCw className="w-4 h-4"/></button></div>
            <div className="game-panel divide-y divide-border/30">
              {flags?.map((f:any,i:number)=>(
                <div key={f.id??i} className="flex items-center gap-3 px-4 py-3.5">
                  <div className={cn('w-2.5 h-2.5 rounded-full shrink-0',f.severity==='critical'?'bg-red-500':f.severity==='high'?'bg-orange-500':'bg-yellow-500')}/>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">@{f.username}</p><p className="text-xs text-muted-foreground">{f.reason} · {f.count} flag{f.count!==1?'s':''}</p></div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={()=>banMutation.mutate({id:f.userId,reason:f.reason})} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors">Ban</button>
                    <button onClick={()=>dismissMutation.mutate(f.id)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors">Dismiss</button>
                  </div>
                </div>
              ))}
              {!flags?.length&&<div className="text-center py-8 text-muted-foreground text-sm">✅ No active flags</div>}
            </div>
          </motion.div>
        )}

        {tab==='settings'&&(
          <motion.div key="settings" initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">
            <h2 className="font-semibold text-foreground">Feature Flags</h2>
            <div className="game-panel divide-y divide-border/30">
              {features?.map((f:any)=>(
                <div key={f.key} className="flex items-center justify-between px-4 py-3.5">
                  <div><p className="text-sm font-medium text-foreground">{f.name??f.key}</p>{f.description&&<p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}</div>
                  <button onClick={()=>featureMutation.mutate({key:f.key,enabled:!f.enabled})} disabled={featureMutation.isPending} className={cn('w-10 h-5 rounded-full transition-all relative shrink-0 ml-4',f.enabled?'bg-brand-600':'bg-border')}>
                    <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',f.enabled?'left-5':'left-0.5')}/>
                  </button>
                </div>
              ))}
              {!features?.length&&<div className="text-center py-8 text-muted-foreground text-sm px-4">No feature flags configured</div>}
            </div>
          </motion.div>
        )}

        {tab==='analytics'&&(
          <motion.div key="analytics" initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {label:'Platform Avg WPM',value:`${formatWpm(analytics?.avgWpm??0)} wpm`,color:'text-brand-400'},
                {label:'New Users (7d)',value:(analytics?.newUsers7d??0).toLocaleString(),color:'text-emerald-400'},
                {label:'Races (7d)',value:(analytics?.races7d??0).toLocaleString(),color:'text-yellow-400'},
                {label:'Total Users',value:(analytics?.totalUsers??0).toLocaleString(),color:'text-cyan-400'},
              ].map(({label,value,color})=>(
                <div key={label} className="game-panel p-4"><p className="text-xs text-muted-foreground mb-2">{label}</p><p className={cn('text-xl font-bold font-mono',color)}>{value}</p></div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
