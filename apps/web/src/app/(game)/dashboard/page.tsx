'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Zap, Trophy, Target, TrendingUp, Crown, Flame, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { apiGet } from '@/lib/api';
import { cn, formatWpm, formatPercent, wpmColor, timeAgo } from '@/lib/utils';

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const { data: stats } = useQuery({ queryKey:['my-stats'], queryFn:()=>apiGet<any>('/users/me'), staleTime:60_000 });
  const { data: races } = useQuery({ queryKey:['recent-races'], queryFn:()=>apiGet<any[]>('/users/me/races?limit=8'), staleTime:30_000 });
  const s = stats ?? {};
  const xpPct = s.xpToNextLevel ? Math.min(100,(s.xp??0)/(s.xpToNextLevel)*100) : 0;

  const statCards = [
    { label:'Best WPM',    value:formatWpm(s.bestWpm??0),   unit:'wpm', icon:Zap,        color:'text-brand-400',   bg:'bg-brand-600/10' },
    { label:'Avg WPM',     value:formatWpm(s.avgWpm??0),    unit:'wpm', icon:TrendingUp,  color:'text-emerald-400', bg:'bg-emerald-600/10' },
    { label:'Win Rate',    value:s.totalRaces?`${Math.round((s.wins??0)/s.totalRaces*100)}%`:'—', unit:'', icon:Trophy, color:'text-yellow-400', bg:'bg-yellow-600/10' },
    { label:'Total Races', value:(s.totalRaces??0).toLocaleString(), unit:'', icon:Crown, color:'text-cyan-400',    bg:'bg-cyan-600/10' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="game-panel p-5 relative overflow-hidden bg-gradient-to-br from-brand-600/10 to-transparent border-brand-500/20">
        <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-brand-600/5 -translate-y-1/4 translate-x-1/4 pointer-events-none"/>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Welcome back,</p>
            <h1 className="text-2xl font-bold text-white">{user?.displayName ?? 'Racer'} 👋</h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground flex-wrap">
              <span>Level <strong className="text-foreground">{s.level??1}</strong></span>
              <span className="text-muted-foreground/30">·</span>
              <span>Rank <strong className="text-yellow-400">#{s.globalRank??'—'}</strong></span>
              {(s.streak??0)>0&&<><span className="text-muted-foreground/30">·</span><span className="text-orange-400 flex items-center gap-1"><Flame className="w-3.5 h-3.5"/>{s.streak}-day streak</span></>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/lobby" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(99,102,241,.3)]"><Zap className="w-4 h-4"/>Quick Race</Link>
            <Link href="/lobby?mode=QUIZ_BATTLE" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-sm border border-border transition-all">🧠 Quiz</Link>
          </div>
        </div>
        <div className="mt-4 relative z-10">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5"><span>Level {s.level??1}</span><span>{(s.xp??0).toLocaleString()} / {(s.xpToNextLevel??100).toLocaleString()} XP</span></div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${xpPct}%`}} transition={{duration:1,delay:.3}} className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"/></div>
        </div>
      </motion.div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({label,value,unit,icon:Icon,color,bg},i)=>(
          <motion.div key={label} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.1+i*.05}} className="game-panel p-4">
            <div className="flex items-center justify-between mb-3"><p className="text-xs text-muted-foreground font-medium">{label}</p><div className={cn('w-7 h-7 rounded-lg flex items-center justify-center',bg)}><Icon className={cn('w-4 h-4',color)}/></div></div>
            <p className={cn('text-2xl font-bold font-mono',color)}>{value}</p>
            {unit&&<p className="text-xs text-muted-foreground mt-0.5">{unit}</p>}
          </motion.div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.3}} className="lg:col-span-2 game-panel overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground"/>Recent Races</h2>
            <Link href={`/profile/${user?.username}`} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">View all →</Link>
          </div>
          <div>
            {races?.length ? races.map((r:any,i:number)=>(
              <div key={r.id??i} className="flex items-center gap-3 px-5 py-3.5 border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0',r.position===1?'bg-yellow-500/20 text-yellow-400':r.position===2?'bg-slate-500/20 text-slate-300':r.position===3?'bg-orange-700/20 text-orange-400':'bg-secondary text-muted-foreground')}>
                  {r.position<=3?['🥇','🥈','🥉'][r.position-1]:r.position}
                </div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{r.roomName??'Race'}</p><p className="text-xs text-muted-foreground">{r.participantCount} players · {r.createdAt?timeAgo(r.createdAt):''}</p></div>
                <div className="text-right shrink-0">
                  {r.wpm!=null?<><p className={cn('text-sm font-bold font-mono',wpmColor(r.wpm))}>{formatWpm(r.wpm)} wpm</p><p className="text-xs text-muted-foreground">{formatPercent(r.accuracy??0)}</p></>:<span className="text-xs text-purple-400 bg-purple-600/15 px-2 py-0.5 rounded-full">Quiz</span>}
                </div>
              </div>
            )):(
              <div className="text-center py-10 text-muted-foreground text-sm"><p className="text-2xl mb-2">⌨️</p><p>No races yet. <Link href="/lobby" className="text-brand-400 hover:underline">Start your first!</Link></p></div>
            )}
          </div>
        </motion.div>
        <div className="space-y-3">
          <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:.35}} className="game-panel p-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1"><Flame className="w-4 h-4 text-orange-400"/>Daily Streak</p>
            <p className="text-3xl font-black text-orange-400">{s.streak??0} <span className="text-sm font-normal text-muted-foreground">days</span></p>
            <p className="text-xs text-muted-foreground mt-1">Race daily to keep it going!</p>
          </motion.div>
          <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:.4}} className="game-panel p-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1"><Crown className="w-4 h-4 text-yellow-400"/>Coins</p>
            <p className="text-3xl font-black text-yellow-400">{(s.coins??0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{(s.gems??0)} gems · <Link href="/shop" className="text-brand-400 hover:underline">Visit shop</Link></p>
          </motion.div>
          <Link href="/lobby" className="block game-panel p-4 hover:border-brand-500/40 transition-all bg-gradient-to-br from-brand-600/10 to-transparent border-brand-500/20">
            <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-foreground">Ready to race? ⚡</p><p className="text-xs text-muted-foreground mt-0.5">Join a match now</p></div><div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shrink-0"><Zap className="w-5 h-5 text-white"/></div></div>
          </Link>
        </div>
      </div>
    </div>
  );
}
