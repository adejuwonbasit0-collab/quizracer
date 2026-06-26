'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Home, Zap, Target } from 'lucide-react';
import { useGameStore } from '@/stores/game.store';
import { useAuthStore } from '@/stores/auth.store';
import { useSocket } from '@/components/providers/SocketProvider';
import { cn, formatWpm, formatPercent, wpmColor, ordinal } from '@/lib/utils';

const MEDALS = ['🥇','🥈','🥉'];
const RANK_COLORS = ['text-yellow-400','text-slate-300','text-orange-400'];

export function RaceResults() {
  const router = useRouter();
  const { emit } = useSocket();
  const user = useAuthStore(s => s.user);
  const { results, room, setPhase } = useGameStore();

  const sorted = [...(results??[])].sort((a:any,b:any)=>(a.rank??99)-(b.rank??99));
  const my = sorted.find((r:any)=>r.userId===user?.id);
  const myRank = my?.rank ?? sorted.length;
  const top3 = sorted.slice(0,3);
  const podiumOrder = [top3[1],top3[0],top3[2]].filter(Boolean);
  const heights = [84,108,64];
  const bc = ['rgba(148,163,184,.4)','rgba(251,191,36,.5)','rgba(180,83,9,.4)'];
  const rankMsg = myRank===1?'🥇 You won the race!':myRank===2?'🥈 2nd place — great race!':myRank===3?'🥉 3rd place — solid effort!':`${ordinal(myRank)} place — keep practising!`;

  const playAgain = async () => {
    if (!room) { router.push('/lobby'); return; }
    try { await emit('room:rematch'); setPhase('lobby'); } catch { setPhase('lobby'); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} className="text-center space-y-2">
        <div className="text-5xl mb-2">🏁</div>
        <h1 className="text-3xl font-black text-white font-mono tracking-tight">RACE OVER</h1>
        <p className={cn('text-base font-semibold',myRank===1?'text-yellow-400':myRank===2?'text-slate-300':myRank===3?'text-orange-400':'text-muted-foreground')}>{rankMsg}</p>
      </motion.div>

      {top3.length > 1 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.15}} className="flex items-end justify-center gap-3 py-4">
          {podiumOrder.map((r:any,i)=>{
            const rank = i===1?0:i===0?1:2;
            return (
              <div key={r.userId} className="flex flex-col items-center gap-2">
                {rank===0&&<span className="text-2xl">👑</span>}
                <div className="w-11 h-11 rounded-full bg-brand-600/20 border-2 flex items-center justify-center text-sm font-bold text-brand-300" style={{borderColor:bc[rank]}}>
                  {r.avatar?<img src={r.avatar} className="w-full h-full rounded-full object-cover" alt=""/>:r.username?.[0]?.toUpperCase()}
                </div>
                <p className="text-xs font-semibold text-foreground max-w-[70px] truncate text-center">{r.username}</p>
                <p className={cn('text-sm font-mono font-bold',wpmColor(r.wpm??0))}>{r.wpm||r.score?`${r.wpm||r.score}${r.wpm?' wpm':' pts'}`:'-'}</p>
                <div className="w-20 flex items-center justify-center rounded-t-lg font-black text-lg" style={{height:heights[rank],border:`1px solid ${bc[rank]}`,background:`${bc[rank].replace('.4','.08').replace('.5','.1')}`}}>
                  <span className={RANK_COLORS[rank]}>{rank+1}</span>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.25}} className="game-panel overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-border/50">
            {['#','Player','WPM / Score','Accuracy','Time'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {sorted.map((r:any,i)=>(
              <motion.tr key={r.userId} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:.3+i*.06}}
                className={cn('border-b border-border/20 last:border-0 transition-colors',r.userId===user?.id?'bg-brand-600/5':'hover:bg-secondary/20')}>
                <td className="px-4 py-3"><span className={cn('font-bold text-sm',i<3?RANK_COLORS[i]:'text-muted-foreground')}>{i<3?MEDALS[i]:i+1}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-300 overflow-hidden shrink-0">
                      {r.avatar?<img src={r.avatar} className="w-full h-full object-cover rounded-full" alt=""/>:r.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-foreground">{r.username}</span>
                    {r.userId===user?.id&&<span className="text-xs text-brand-400 bg-brand-600/15 px-1.5 py-0.5 rounded-full">you</span>}
                  </div>
                </td>
                <td className={cn('px-4 py-3 font-mono font-bold text-sm',wpmColor(r.wpm??0))}>{r.wpm?`${formatWpm(r.wpm)} wpm`:r.score?`${r.score} pts`:'—'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{r.accuracy?formatPercent(r.accuracy):'—'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{r.durationMs?`${(r.durationMs/1000).toFixed(1)}s`:'—'}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {my && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.5}} className="game-panel p-5 bg-brand-600/5 border-brand-500/20">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">Your Stats</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              {icon:Zap,label:'WPM',value:formatWpm(my.wpm??0),cls:wpmColor(my.wpm??0)},
              {icon:Target,label:'Accuracy',value:formatPercent(my.accuracy??100),cls:'text-cyan-400'},
              {icon:Trophy,label:'Rank',value:ordinal(myRank),cls:myRank===1?'text-yellow-400':myRank<=3?'text-slate-300':'text-muted-foreground'},
            ].map(({icon:Icon,label,value,cls})=>(
              <div key={label}><Icon className={cn('w-5 h-5 mx-auto mb-1.5',cls)}/><p className={cn('text-2xl font-black font-mono',cls)}>{value}</p><p className="text-xs text-muted-foreground mt-0.5">{label}</p></div>
            ))}
          </div>
          {(my.xpEarned??0)>0&&<div className="mt-3 text-center text-xs text-muted-foreground">+{my.xpEarned} XP · +{my.coinsEarned} coins</div>}
        </motion.div>
      )}

      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.6}} className="flex gap-3 justify-center">
        <button onClick={playAgain} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(99,102,241,.3)]"><RotateCcw className="w-4 h-4"/>Play Again</button>
        <button onClick={()=>router.push('/lobby')} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-sm border border-border transition-all"><Home className="w-4 h-4"/>Lobby</button>
      </motion.div>
    </div>
  );
}
