'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Target, Clock } from 'lucide-react';
import { useGameStore } from '@/stores/game.store';
import { useAuthStore } from '@/stores/auth.store';
import { useSocket } from '@/components/providers/SocketProvider';
import { cn, formatWpm, formatPercent, wpmColor, throttle } from '@/lib/utils';

export function TypingRace() {
  const { emit } = useSocket();
  const user = useAuthStore(s => s.user);
  const { textContent, raceStartedAt, players, setPhase } = useGameStore();
  const [typed, setTyped] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [lastKey, setLastKey] = useState('');
  const correctRef = useRef<boolean[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => { containerRef.current?.focus(); }, []);
  useEffect(() => {
    if (!raceStartedAt || finished) return;
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now()-raceStartedAt)/1000)), 250);
    return () => clearInterval(timerRef.current);
  }, [raceStartedAt, finished]);

  const wpm = useMemo(() => {
    if (!raceStartedAt || elapsed < 1) return 0;
    const correct = correctRef.current.filter(Boolean).length;
    return Math.round((correct/5)/(elapsed/60));
  }, [typed, elapsed, raceStartedAt]);

  const accuracy = useMemo(() => {
    if (!typed) return 100;
    return Math.max(0, Math.round((correctRef.current.filter(Boolean).length / typed) * 100));
  }, [typed]);

  const progress = useMemo(() => textContent ? Math.min(100,(typed/textContent.length)*100) : 0, [typed, textContent]);

  const emitProgress = useCallback(throttle(() => {
    if (!user) return;
    emit('typing:progress', { userId:user.id, username:user.displayName, avatar:null, progress, wpm, accuracy, errors:errors.size, isFinished:false }).catch(()=>{});
  }, 300), [user, progress, wpm, accuracy, errors, emit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (finished) return;
    if (e.ctrlKey || e.metaKey || e.altKey) { e.preventDefault(); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); return; }
    if (e.key.length !== 1) return;
    const expected = textContent[typed];
    if (!expected) return;
    const correct = e.key === expected;
    correctRef.current[typed] = correct;
    if (!correct) setErrors(prev => { const n=new Set(prev); n.add(typed); return n; });
    setLastKey(e.key);
    const newLen = typed + 1;
    setTyped(newLen);
    if (newLen >= textContent.length) {
      setFinished(true); clearInterval(timerRef.current);
      const dur = raceStartedAt ? Date.now()-raceStartedAt : 0;
      emit('typing:finished', { wpm, accuracy, errors:errors.size, durationMs:dur, keystrokes:[] }).catch(()=>{});
    } else { emitProgress(); }
  }, [finished, textContent, typed, wpm, accuracy, errors, raceStartedAt, emit, emitProgress]);

  const charSpans = useMemo(() => {
    if (!textContent) return null;
    return Array.from(textContent).map((ch, i) => {
      let cls = i < typed ? (correctRef.current[i] ? 'char-correct' : 'char-error') : i === typed ? 'char-current' : 'char-upcoming';
      return <span key={i} className={cls}>{ch}</span>;
    });
  }, [textContent, typed]);

  const sortedPlayers = Object.values(players).sort((a:any,b:any) => b.progress - a.progress);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {sortedPlayers.length > 0 && (
        <div className="space-y-2">
          {sortedPlayers.map((p:any) => (
            <div key={p.userId} className={cn('flex items-center gap-3 p-3 rounded-xl border',p.userId===user?.id?'border-brand-500/30 bg-brand-600/5':'bg-secondary/50 border-border')}>
              <div className="w-8 h-8 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-300 shrink-0 overflow-hidden">
                {p.avatar?<img src={p.avatar} alt="" className="w-full h-full object-cover"/>:p.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-foreground truncate">{p.username}</span>
                  {p.userId===user?.id&&<span className="text-xs text-brand-400">you</span>}
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" animate={{width:`${p.progress??0}%`}} transition={{duration:.3}}/>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={cn('font-mono font-bold text-sm',wpmColor(p.wpm??0))}>{formatWpm(p.wpm??0)} wpm</p>
                <p className="text-xs text-muted-foreground">{Math.round(p.progress??0)}%</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[{icon:Zap,label:'WPM',value:formatWpm(wpm),cls:wpmColor(wpm)},{icon:Target,label:'Accuracy',value:formatPercent(accuracy),cls:accuracy>=95?'text-emerald-400':accuracy>=80?'text-yellow-400':'text-red-400'},{icon:Clock,label:'Time',value:`${elapsed}s`,cls:'text-muted-foreground'}].map(({icon:Icon,label,value,cls})=>(
          <div key={label} className="game-panel p-3 flex items-center gap-2.5">
            <Icon className={cn('w-4 h-4 shrink-0',cls)}/>
            <div><p className={cn('font-mono font-bold text-lg leading-none',cls)}>{value}</p><p className="text-xs text-muted-foreground mt-0.5">{label}</p></div>
          </div>
        ))}
      </div>

      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" animate={{width:`${progress}%`}} transition={{duration:.2}}/>
      </div>

      <div ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown} onPaste={e=>e.preventDefault()}
        className={cn('font-mono text-base leading-8 p-5 rounded-xl border bg-secondary/30 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all cursor-text select-none tracking-wide',finished&&'opacity-70 pointer-events-none')}
        role="textbox" aria-label="Typing area">
        {charSpans || <span className="text-muted-foreground">Loading text…</span>}
      </div>

      {finished && (
        <motion.div initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} className="text-center py-6 game-panel bg-emerald-500/5 border-emerald-500/20">
          <div className="text-4xl mb-2">🏁</div>
          <p className="text-lg font-bold text-emerald-400">You finished!</p>
          <p className="text-sm text-muted-foreground mt-1">{formatWpm(wpm)} WPM · {formatPercent(accuracy)} accuracy</p>
          <p className="text-xs text-muted-foreground mt-1">Waiting for other racers…</p>
        </motion.div>
      )}

      {/* Virtual keyboard hint */}
      <div className="hidden sm:flex flex-col items-center gap-1.5 mt-2 select-none" aria-hidden="true">
        {[['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['Z','X','C','V','B','N','M']].map((row,ri)=>(
          <div key={ri} className="flex gap-1">
            {row.map(k=>(
              <div key={k} className={cn('w-8 h-8 rounded-md border flex items-center justify-center text-xs font-semibold transition-all duration-100',lastKey.toUpperCase()===k?'bg-brand-600 border-brand-500 text-white scale-95':'bg-secondary border-border text-muted-foreground')}>{k}</div>
            ))}
          </div>
        ))}
        <div className={cn('w-36 h-8 rounded-md border flex items-center justify-center text-xs font-semibold transition-all duration-100',lastKey===' '?'bg-brand-600 border-brand-500 text-white':'bg-secondary border-border text-muted-foreground')}>SPACE</div>
      </div>
    </div>
  );
}
