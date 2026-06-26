'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/game.store';

export function Countdown() {
  const countdown = useGameStore(s => s.countdown);
  const [display, setDisplay] = useState<string|number>(countdown ?? 3);
  useEffect(() => { setDisplay(countdown === 0 ? 'GO!' : countdown ?? 3); }, [countdown]);
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center bg-grid">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-[.3em] text-muted-foreground uppercase mb-8 font-mono">RACE STARTING IN</p>
        <AnimatePresence mode="wait">
          <motion.div key={String(display)} initial={{scale:2,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.5,opacity:0}} transition={{duration:.35,ease:'easeOut'}}
            className={`text-[10rem] font-black font-mono leading-none tabular-nums ${display==='GO!'?'text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,.6)]':'text-brand-400 drop-shadow-[0_0_30px_rgba(99,102,241,.6)]'}`}>
            {display}
          </motion.div>
        </AnimatePresence>
        <p className="text-sm text-muted-foreground mt-8">Get your fingers ready…</p>
      </div>
    </div>
  );
}
