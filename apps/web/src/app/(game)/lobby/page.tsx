'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Hash, Zap, Users, RefreshCw, Lock, Globe, Loader2 } from 'lucide-react';
import { useSocket } from '@/components/providers/SocketProvider';
import { useGameStore } from '@/stores/game.store';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';

type Mode = 'TYPING_RACE' | 'QUIZ_BATTLE';

export default function LobbyPage() {
  const router = useRouter(); const sp = useSearchParams();
  const { emit } = useSocket();
  const { setRoom, setPhase, isSearching, setSearching } = useGameStore();
  const [mode, setMode] = useState<Mode>((sp.get('mode') as Mode) ?? 'TYPING_RACE');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const { data: publicRooms, refetch, isFetching } = useQuery({ queryKey:['public-rooms',mode], queryFn:()=>apiGet<any[]>(`/rooms?mode=${mode}&status=WAITING&limit=12`), refetchInterval:10_000, staleTime:5_000 });

  const createRoom = async () => {
    setCreating(true); setError('');
    try {
      const res:any = await emit('room:create', { name:roomName.trim()||(mode==='TYPING_RACE'?'⌨️ Typing Room':'🧠 Quiz Room'), mode, isPrivate, maxPlayers:6 });
      if (!res?.room) throw new Error(res?.error ?? 'Failed to create room');
      setRoom(res.room); setPhase('lobby'); router.push(`/race/${res.room.code}`);
    } catch(e:any) { setError(e.message); } finally { setCreating(false); }
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 4) { setError('Enter a valid room code'); return; }
    setJoining(true); setError('');
    try {
      const res:any = await emit('room:join', { code });
      if (!res?.room) throw new Error(res?.error ?? 'Room not found or full');
      setRoom(res.room); setPhase('lobby'); router.push(`/race/${res.room.code}`);
    } catch(e:any) { setError(e.message); } finally { setJoining(false); }
  };

  const joinPublic = async (code:string) => {
    setError('');
    try {
      const res:any = await emit('room:join', { code });
      if (!res?.room) throw new Error(res?.error ?? 'Could not join room');
      setRoom(res.room); setPhase('lobby'); router.push(`/race/${res.room.code}`);
    } catch(e:any) { setError(e.message); }
  };

  const startMM = async () => {
    setSearching(true); setError('');
    try { await emit('matchmaking:join', { mode }); }
    catch(e:any) { setError(e.message); setSearching(false); }
  };

  const cancelMM = async () => { try { await emit('matchmaking:cancel'); } catch {} setSearching(false); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Zap className="w-6 h-6 text-brand-400"/>Play</h1><p className="text-sm text-muted-foreground mt-1">Create, join, or find a match</p></div>

      <div className="flex gap-1 p-1 rounded-xl bg-secondary w-fit">
        {(['TYPING_RACE','QUIZ_BATTLE'] as const).map(m=>(
          <button key={m} onClick={()=>setMode(m)} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',mode===m?'bg-brand-600 text-white':'text-muted-foreground hover:text-foreground')}>
            {m==='TYPING_RACE'?'⌨️ Typing Race':'🧠 Quiz Battle'}
          </button>
        ))}
      </div>

      {error && <motion.div initial={{opacity:0}} animate={{opacity:1}} className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</motion.div>}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="game-panel p-5 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm"><Plus className="w-4 h-4 text-brand-400"/>Create Room</h2>
          <input value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder={mode==='TYPING_RACE'?'My Typing Room':'My Quiz Room'} className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"/>
          <div className="flex items-center gap-3">
            <button onClick={()=>setIsPrivate(v=>!v)} className={cn('w-9 h-5 rounded-full transition-all relative',!isPrivate?'bg-brand-600':'bg-border')}>
              <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',!isPrivate?'left-4':'left-0.5')}/>
            </button>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">{isPrivate?<><Lock className="w-3.5 h-3.5"/>Private</>:<><Globe className="w-3.5 h-3.5"/>Public</>}</div>
          </div>
          <button onClick={createRoom} disabled={creating} className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,.3)] disabled:opacity-60 disabled:cursor-not-allowed">
            {creating?<Loader2 className="w-4 h-4 animate-spin"/>:<Plus className="w-4 h-4"/>}Create Room
          </button>
        </div>
        <div className="space-y-3">
          <div className="game-panel p-5 space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm"><Hash className="w-4 h-4 text-brand-400"/>Join by Code</h2>
            <div className="flex gap-2">
              <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&joinRoom()} placeholder="XXXXXX" maxLength={8} className="flex-1 px-3 py-2.5 rounded-lg bg-input border border-border text-sm text-foreground font-mono tracking-widest uppercase placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"/>
              <button onClick={joinRoom} disabled={joining} className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all flex items-center gap-2 disabled:opacity-60">
                {joining?<Loader2 className="w-4 h-4 animate-spin"/>:'Join'}
              </button>
            </div>
          </div>
          <div className="game-panel p-5 space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm"><Zap className="w-4 h-4 text-cyan-400"/>Quick Match</h2>
            {!isSearching?(
              <button onClick={startMM} className="w-full py-2.5 rounded-xl border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-semibold text-sm transition-all flex items-center justify-center gap-2"><Zap className="w-4 h-4"/>Find Match</button>
            ):(
              <div className="flex items-center gap-3"><Loader2 className="w-5 h-5 text-brand-400 animate-spin shrink-0"/><div className="flex-1"><p className="text-sm font-semibold text-foreground">Searching…</p><p className="text-xs text-muted-foreground">Matching by skill level</p></div><button onClick={cancelMM} className="text-xs text-red-400 px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors">Cancel</button></div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground"/>Public Rooms</h2>
          <button onClick={()=>refetch()} disabled={isFetching} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"><RefreshCw className={cn('w-3.5 h-3.5',isFetching&&'animate-spin')}/>Refresh</button>
        </div>
        {publicRooms?.length?(
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {publicRooms.map((room:any)=>(
              <motion.div key={room.code} initial={{opacity:0}} animate={{opacity:1}} onClick={()=>joinPublic(room.code)} className="game-panel p-4 cursor-pointer hover:border-brand-500/40 hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground truncate">{room.name}</p><p className="text-xs text-muted-foreground font-mono mt-0.5 tracking-wider">{room.code}</p></div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full ml-2 shrink-0',room.mode==='TYPING_RACE'?'bg-brand-600/20 text-brand-400':'bg-purple-600/20 text-purple-400')}>{room.mode==='TYPING_RACE'?'typing':'quiz'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="w-3.5 h-3.5"/><span>{room._count?.participants??0}/{room.maxPlayers??6}</span></div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className={cn('w-1.5 h-1.5 rounded-full',room.status==='WAITING'?'bg-emerald-400':'bg-yellow-400')}/><span className="capitalize">{(room.status??'waiting').toLowerCase()}</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        ):(
          <div className="game-panel py-10 text-center text-muted-foreground text-sm"><p className="text-2xl mb-2">🌐</p><p>No public rooms right now. <button onClick={createRoom} className="text-brand-400 hover:underline">Create one!</button></p></div>
        )}
      </div>
    </div>
  );
}
