'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, Search } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { apiGet } from '@/lib/api';
import { cn, formatWpm, wpmColor, debounce } from '@/lib/utils';

type Sort = 'bestWpm'|'avgWpm'|'wins'|'totalRaces'|'rating';
const MEDALS = ['🥇','🥈','🥉'];
const SORT_LABELS:Record<Sort,string> = { bestWpm:'Best WPM', avgWpm:'Avg WPM', wins:'Wins', totalRaces:'Races', rating:'ELO' };

export default function LeaderboardPage() {
  const user = useAuthStore(s => s.user);
  const [sortBy, setSortBy] = useState<Sort>('bestWpm');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const onSearch = debounce((v:string)=>{setSearch(v);setPage(1);},350);

  const { data, isFetching } = useQuery({
    queryKey:['leaderboard',sortBy,search,page],
    queryFn:()=>apiGet<any>(`/leaderboard?sortBy=${sortBy}&search=${encodeURIComponent(search)}&page=${page}&limit=20`),
    staleTime:30_000,
  });

  const entries:any[] = data?.entries ?? [];
  const total:number  = data?.total ?? 0;
  const totalPages    = Math.ceil(total / 20);
  const top3 = entries.slice(0,3);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-400"/>Leaderboard</h1><p className="text-sm text-muted-foreground mt-1">Top racers worldwide</p></div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/><input onChange={e=>onSearch(e.target.value)} placeholder="Search player…" className="w-full pl-9 pr-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"/></div>
        <div className="flex gap-1 p-1 rounded-xl bg-secondary overflow-x-auto">
          {(Object.keys(SORT_LABELS) as Sort[]).map(k=>(
            <button key={k} onClick={()=>{setSortBy(k);setPage(1);}} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',sortBy===k?'bg-brand-600 text-white':'text-muted-foreground hover:text-foreground')}>{SORT_LABELS[k]}</button>
          ))}
        </div>
      </div>

      {top3.length===3&&page===1&&!search&&(
        <div className="flex items-end justify-center gap-4 py-4">
          {[top3[1],top3[0],top3[2]].map((e,i)=>{
            const rank=i===1?0:i===0?1:2;
            const heights=[84,108,64]; const bc=['rgba(148,163,184,.4)','rgba(251,191,36,.5)','rgba(180,83,9,.4)'];
            return (
              <div key={e.userId} className="flex flex-col items-center gap-2">
                {rank===0&&<span className="text-2xl">👑</span>}
                <Link href={`/profile/${e.username}`}><div className="w-12 h-12 rounded-full bg-brand-600/20 border-2 flex items-center justify-center text-sm font-bold text-brand-300 overflow-hidden" style={{borderColor:bc[rank]}}>{e.avatar?<img src={e.avatar} className="w-full h-full object-cover rounded-full" alt=""/>:e.username?.[0]?.toUpperCase()}</div></Link>
                <p className="text-xs font-semibold text-foreground max-w-[80px] truncate text-center">{e.displayName}</p>
                <p className={cn('text-sm font-mono font-bold',wpmColor(e[sortBy]??0))}>{formatWpm(e[sortBy]??0)}</p>
                <div className="w-20 flex items-center justify-center rounded-t-lg font-black text-lg" style={{height:heights[rank],border:`1px solid ${bc[rank]}`,background:`${bc[rank].replace('.4','.08').replace('.5','.1')}`}}>{rank+1}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="game-panel overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead><tr className="border-b border-border/50">{['#','Player','Best','Avg','Races','Wins'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold first:w-10">{h}</th>)}</tr></thead>
          <tbody>
            {entries.map((e:any,i:number)=>{
              const rank=(page-1)*20+i+1; const isMe=e.userId===user?.id||e.username===user?.username;
              return (
                <motion.tr key={e.userId??i} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*.02}} className={cn('border-b border-border/20 last:border-0 transition-colors',isMe?'bg-brand-600/5':'hover:bg-secondary/20')}>
                  <td className="px-4 py-3 font-bold text-sm">{rank<=3?MEDALS[rank-1]:<span className="text-muted-foreground">{rank}</span>}</td>
                  <td className="px-4 py-3"><Link href={`/profile/${e.username}`} className="flex items-center gap-2 hover:opacity-80">
                    <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-300 overflow-hidden shrink-0">{e.avatar?<img src={e.avatar} className="w-full h-full object-cover rounded-full" alt=""/>:e.username?.[0]?.toUpperCase()}</div>
                    <div className="min-w-0"><p className="text-sm font-medium text-foreground truncate">{e.displayName}</p><p className="text-xs text-muted-foreground">Lv.{e.level??1}{e.rating?` · ${e.rating} ELO`:''}</p></div>
                    {isMe&&<span className="text-xs text-brand-400 bg-brand-600/15 px-1.5 py-0.5 rounded-full shrink-0">you</span>}
                  </Link></td>
                  <td className={cn('px-4 py-3 font-mono font-bold text-sm',wpmColor(e.bestWpm??0))}>{formatWpm(e.bestWpm??0)}</td>
                  <td className={cn('px-4 py-3 font-mono text-sm',wpmColor(e.avgWpm??0))}>{formatWpm(e.avgWpm??0)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{(e.totalRaces??0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-yellow-400">{(e.wins??0).toLocaleString()}</td>
                </motion.tr>
              );
            })}
            {!entries.length&&!isFetching&&<tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No results found</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages>1&&(
        <div className="flex items-center justify-center gap-2">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm disabled:opacity-40 hover:bg-secondary/80 transition-colors">← Prev</button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm disabled:opacity-40 hover:bg-secondary/80 transition-colors">Next →</button>
        </div>
      )}
    </div>
  );
}
