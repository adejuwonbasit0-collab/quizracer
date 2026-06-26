'use client';
import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useSocket } from '@/components/providers/SocketProvider';
import { useGameStore } from '@/stores/game.store';
import { useAuthStore } from '@/stores/auth.store';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const RaceLobby   = dynamic(()=>import('@/components/game/RaceLobby').then(m=>({default:m.RaceLobby})), {ssr:false});
const Countdown   = dynamic(()=>import('@/components/game/Countdown').then(m=>({default:m.Countdown})), {ssr:false});
const TypingRace  = dynamic(()=>import('@/components/game/TypingRace').then(m=>({default:m.TypingRace})), {ssr:false});
const QuizBattle  = dynamic(()=>import('@/components/game/QuizBattle').then(m=>({default:m.QuizBattle})), {ssr:false});
const RaceResults = dynamic(()=>import('@/components/game/RaceResults').then(m=>({default:m.RaceResults})), {ssr:false});

interface Props { params: Promise<{ roomCode: string }> }

export default function RacePage({ params }: Props) {
  const { roomCode } = use(params);
  const router = useRouter();
  const { emit } = useSocket();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const { room, phase, setRoom, setPhase, reset } = useGameStore();

  useEffect(() => {
    if (!isAuthenticated) { router.replace(`/login?returnTo=/race/${roomCode}`); return; }
    if (room?.code === roomCode) return;
    const join = async () => {
      try {
        const res:any = await emit('room:join', { code: roomCode });
        if (res?.room) { setRoom(res.room); setPhase('lobby'); }
        else router.replace('/lobby');
      } catch { router.replace('/lobby'); }
    };
    join();
  }, [roomCode, isAuthenticated]);

  useEffect(() => {
    return () => { emit('room:leave', undefined).catch(()=>{}); reset(); };
  }, []);

  if (!room && phase === 'idle') return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 text-brand-400 animate-spin"/><p className="text-sm text-muted-foreground">Joining room…</p></div>
    </div>
  );

  const isQuiz = room?.mode === 'QUIZ_BATTLE';

  return (
    <AnimatePresence mode="wait">
      {phase === 'lobby'     && room && <RaceLobby key="lobby" room={room}/>}
      {phase === 'countdown' && <Countdown key="countdown"/>}
      {phase === 'active'    && !isQuiz && <TypingRace key="typing"/>}
      {phase === 'active'    && isQuiz  && <QuizBattle key="quiz"/>}
      {phase === 'results'   && <RaceResults key="results"/>}
    </AnimatePresence>
  );
}
