'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/game.store';
import { useAuthStore } from '@/stores/auth.store';
import { useSocket } from '@/components/providers/SocketProvider';
import { cn } from '@/lib/utils';

export function QuizBattle() {
  const { emit } = useSocket();
  const user = useAuthStore(s => s.user);
  const { currentQuestion, questionNumber, totalQuestions, timePerRound, selectedAnswer, answersRevealed, revealData, players, setSelectedAnswer } = useGameStore();
  const [timeLeft, setTimeLeft] = useState(timePerRound);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTimeLeft(timePerRound);
    const t = setInterval(() => setTimeLeft(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [currentQuestion?.id, timePerRound]);

  const submitAnswer = useCallback(async (idx: number) => {
    if (selectedAnswer !== null || answersRevealed || submitting || !currentQuestion) return;
    setSubmitting(true);
    setSelectedAnswer(idx);
    try {
      await emit('quiz:answer', { optionIndex: idx, questionId: currentQuestion.id, answeredAt: Date.now() });
    } catch(e:any) { console.error('Answer error:', e.message); }
    finally { setSubmitting(false); }
  }, [selectedAnswer, answersRevealed, submitting, currentQuestion, emit, setSelectedAnswer]);

  const options = currentQuestion ? (Array.isArray(currentQuestion.options) ? currentQuestion.options.map((o:any) => typeof o === 'string' ? o : o.text) : []) : [];
  const scores = revealData?.scores ?? {};
  const sortedPlayers = Object.entries(scores).sort(([,a]:any,[,b]:any) => b - a);
  const timePct = timePerRound > 0 ? (timeLeft / timePerRound) * 100 : 0;

  if (!currentQuestion) return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="text-center"><div className="text-4xl mb-4">🧠</div><p className="text-lg font-bold text-white">Quiz Battle</p><p className="text-sm text-muted-foreground mt-1">Get ready for the first question…</p></div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Question <span className="font-bold text-foreground">{questionNumber + 1}</span> of <span className="font-bold text-foreground">{totalQuestions}</span></div>
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--border))" strokeWidth="4"/>
              <circle cx="24" cy="24" r="20" fill="none" stroke={timePct > 50 ? '#6366f1' : timePct > 25 ? '#f59e0b' : '#ef4444'} strokeWidth="4" strokeDasharray={`${2*Math.PI*20}`} strokeDashoffset={`${2*Math.PI*20*(1-timePct/100)}`} strokeLinecap="round" style={{transition:'stroke-dashoffset 0.9s linear'}}/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-sm text-foreground">{timeLeft}</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{width:`${((questionNumber)/Math.max(1,totalQuestions))*100}%`}}/>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={currentQuestion.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className="game-panel p-6">
          {currentQuestion.imageUrl && <img src={currentQuestion.imageUrl} alt="" className="w-full h-40 object-cover rounded-lg mb-4"/>}
          <p className="text-lg font-semibold text-white text-balance">{currentQuestion.text}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">{currentQuestion.subject}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full',currentQuestion.difficulty==='easy'?'bg-emerald-500/20 text-emerald-400':currentQuestion.difficulty==='hard'?'bg-red-500/20 text-red-400':'bg-yellow-500/20 text-yellow-400')}>{currentQuestion.difficulty}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Options */}
      <div className="grid gap-3">
        {options.map((opt:string, idx:number) => {
          const isSelected = selectedAnswer === idx;
          const isCorrect  = answersRevealed && revealData?.correctIndex === idx;
          const isWrong    = answersRevealed && isSelected && !isCorrect;
          return (
            <motion.button key={idx} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:idx*.08}}
              onClick={()=>submitAnswer(idx)} disabled={selectedAnswer!==null||answersRevealed||submitting}
              className={cn('w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left font-medium transition-all',
                isCorrect?'border-emerald-500 bg-emerald-500/10 text-emerald-400':
                isWrong?'border-red-500 bg-red-500/10 text-red-400':
                isSelected?'border-brand-500 bg-brand-500/10 text-brand-400':
                'border-border hover:border-brand-500/50 hover:bg-brand-500/5 text-foreground',
                (selectedAnswer!==null||answersRevealed)&&!isSelected&&!isCorrect?'opacity-50':'')}>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors',isCorrect?'bg-emerald-500 text-white':isWrong?'bg-red-500 text-white':isSelected?'bg-brand-600 text-white':'bg-secondary text-muted-foreground')}>
                {['A','B','C','D'][idx]}
              </div>
              <span className="text-sm">{opt}</span>
              {isCorrect&&<span className="ml-auto text-emerald-400">✓</span>}
              {isWrong&&<span className="ml-auto text-red-400">✗</span>}
            </motion.button>
          );
        })}
      </div>

      {/* Scoreboard */}
      {sortedPlayers.length > 0 && (
        <div className="game-panel p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Scores</p>
          <div className="space-y-2">
            {sortedPlayers.slice(0,5).map(([uid,score]:any,i)=>(
              <div key={uid} className={cn('flex items-center gap-3 text-sm',uid===user?.id?'text-brand-400':'text-foreground')}>
                <span className="font-bold w-5 text-center text-muted-foreground">{i+1}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-brand-600" style={{width:`${Math.min(100,(score/(sortedPlayers[0][1]||1))*100)}%`,transition:'width .5s ease'}}/>
                </div>
                <span className="font-mono font-bold w-16 text-right">{score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
