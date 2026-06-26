'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { apiGet } from '@/lib/api';
import { cn, formatWpm, formatPercent, wpmColor, timeAgo, getInitials } from '@/lib/utils';

interface Props { params: Promise<{ username: string }> }

export default function ProfilePage({ params }: Props) {
  const { username } = use(params);
  const me = useAuthStore(s => s.user);
  const isMe = me?.username === username;

  const { data: profile, isLoading, isError } = useQuery({ queryKey:['profile',username], queryFn:()=>apiGet<any>(`/users/${username}/profile`), staleTime:60_000, retry:1 });
  const { data: races } = useQuery({ queryKey:['profile-races',username], queryFn:()=>apiGet<any[]>(`/users/${username}/races?limit=10`), staleTime:60_000, enabled:!!profile });
  const { data: ach } = useQuery({ queryKey:['profile-ach',profile?.id], queryFn:()=>apiGet<any>(`/achievements/users/${profile?.id}`), staleTime:60_000, enabled:!!profile?.id });

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 animate-pulse">{[1,2,3].map(i=><div key={i} className="h-32 rounded-xl bg-secondary"/>)}</div>;
  if (isError||!profile) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <p className="text-5xl mb-4">😢</p>
      <h1 className="text-xl font-bold text-white mb-2">User not found</h1>
      <p className="text-muted-foreground text-sm">@{username} doesn't exist or has a private profile.</p>
      <Link href="/leaderboard" className="text-brand-400 text-sm hover:underline mt-4 block">← Back to Leaderboard</Link>
    </div>
  );

  const xpPct = profile.xpToNextLevel ? Math.min(100,(profile.xp??0)/profile.xpToNextLevel*100) : 0;
  const statItems = [
    { label:'Best WPM',value:formatWpm(profile.bestWpm??0),unit:'wpm',color:wpmColor(profile.bestWpm??0) },
    { label:'Avg WPM', value:formatWpm(profile.avgWpm??0), unit:'wpm',color:wpmColor(profile.avgWpm??0) },
    { label:'Accuracy',value:formatPercent(profile.accuracy??0),unit:'',color:'text-cyan-400' },
    { label:'Races',   value:(profile.totalRaces??0).toLocaleString(),unit:'',color:'text-foreground' },
    { label:'Wins',    value:(profile.wins??0).toLocaleString(),unit:'',color:'text-yellow-400' },
    { label:'Win Rate',value:profile.totalRaces?formatPercent((profile.wins/profile.totalRaces)*100):'—',unit:'',color:'text-emerald-400' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="game-panel p-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-brand-600/5 -translate-y-1/4 translate-x-1/4 pointer-events-none"/>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-brand-600/25 border-2 border-brand-500/40 flex items-center justify-center text-3xl font-bold text-brand-300 overflow-hidden">
              {profile.avatar?<img src={profile.avatar} alt={profile.displayName} className="w-full h-full object-cover"/>:getInitials(profile.displayName??username)}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-card border border-border rounded-lg px-2 py-0.5 text-xs font-bold text-yellow-400">Lv.{profile.level??1}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-white">{profile.displayName}</h1>
              {profile.isPremium&&<span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">PRO</span>}
              {isMe&&<span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/20 text-brand-400 border border-brand-500/30">You</span>}
            </div>
            <p className="text-sm text-muted-foreground mb-1">@{profile.username}</p>
            {profile.bio&&<p className="text-sm text-foreground/80 mb-3">{profile.bio}</p>}
            {profile.createdAt&&<p className="text-xs text-muted-foreground">Joined {timeAgo(profile.createdAt)}</p>}
            <div className="mt-3 max-w-xs">
              <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Level {profile.level??1}</span><span>{(profile.xp??0).toLocaleString()} XP</span></div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all" style={{width:`${xpPct}%`}}/></div>
            </div>
          </div>
          <div className="text-center shrink-0">
            <p className="text-4xl font-black text-yellow-400 font-mono">#{profile.globalRank??'—'}</p>
            <p className="text-xs text-muted-foreground">Global</p>
            {profile.rating&&<p className="text-sm text-brand-400 font-semibold mt-1">{profile.rating} ELO</p>}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {statItems.map(({label,value,unit,color},i)=>(
          <motion.div key={label} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.1+i*.04}} className="game-panel p-3 text-center">
            <p className={cn('text-lg font-bold font-mono',color)}>{value}{unit&&<span className="text-xs text-muted-foreground"> {unit}</span>}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 game-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50"><h2 className="font-semibold text-foreground text-sm">🕐 Recent Races</h2></div>
          <div>
            {races?.length ? races.map((r:any,i:number)=>(
              <div key={r.id??i} className="flex items-center gap-3 px-5 py-3.5 border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',r.position===1?'bg-yellow-500/20 text-yellow-400':r.position===2?'bg-slate-500/20 text-slate-300':r.position===3?'bg-orange-700/20 text-orange-400':'bg-secondary text-muted-foreground')}>
                  {r.position<=3?['🥇','🥈','🥉'][r.position-1]:r.position}
                </div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{r.roomName??'Race'}</p><p className="text-xs text-muted-foreground">{r.participantCount} players · {r.createdAt?timeAgo(r.createdAt):''}</p></div>
                <div className="text-right shrink-0">
                  {r.wpm!=null?<><p className={cn('text-sm font-bold font-mono',wpmColor(r.wpm))}>{formatWpm(r.wpm)} wpm</p><p className="text-xs text-muted-foreground">{formatPercent(r.accuracy??0)}</p></>:<span className="text-xs text-purple-400 bg-purple-600/15 px-2 py-0.5 rounded-full">Quiz</span>}
                </div>
              </div>
            )):<div className="text-center py-8 text-muted-foreground text-sm">No races yet</div>}
          </div>
        </div>
        <div className="game-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50"><h2 className="font-semibold text-foreground text-sm">⭐ Achievements ({ach?.unlockedCount??0}/{ach?.total??0})</h2></div>
          <div className="p-4 grid grid-cols-4 gap-2">
            {ach?.unlocked?.slice(0,16).map((a:any)=>(
              <div key={a.key} title={a.name} className="flex flex-col items-center gap-1 p-2 rounded-xl text-center bg-brand-600/15 border border-brand-500/20 cursor-default hover:bg-brand-600/25 transition-colors">
                <span className="text-2xl">{a.icon??'⭐'}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{a.name}</span>
              </div>
            ))}
            {!ach?.unlocked?.length&&<div className="col-span-4 text-center py-4 text-muted-foreground text-xs">No achievements yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
