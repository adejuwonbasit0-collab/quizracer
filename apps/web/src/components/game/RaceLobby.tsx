'use client';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Crown, Users, Send, Loader2, Play, Share2 } from 'lucide-react';
import { useSocket } from '@/components/providers/SocketProvider';
import { useGameStore } from '@/stores/game.store';
import { useAuthStore } from '@/stores/auth.store';
import { cn, getInitials } from '@/lib/utils';
import type { Room } from '@/lib/types';

interface Props { room: Room }

export function RaceLobby({ room }: Props) {
  const { emit } = useSocket();
  const user = useAuthStore(s => s.user);
  const messages = useGameStore(s => s.messages);
  const [chat, setChat] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [readying, setReadying] = useState(false);
  const [error, setError] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  const isHost = room?.hostId === user?.id;
  const myP = room?.participants?.find(p => p.userId === user?.id);
  const isReady = myP?.isReady ?? false;
  const canStart = isHost && (room?.participants?.length ?? 0) >= (room?.minPlayers ?? 1);

  useEffect(() => { if(chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(room.code); }
    catch { const i=document.createElement('input'); i.value=room.code; document.body.appendChild(i); i.select(); document.execCommand('copy'); document.body.removeChild(i); }
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  const toggleReady = async () => {
    setReadying(true); setError('');
    try { await emit('room:ready'); } catch(e:any) { setError(e.message); } finally { setReadying(false); }
  };

  const startRace = async () => {
    setStarting(true); setError('');
    try {
      const res:any = await emit('room:start');
      if (!res?.success) throw new Error(res?.error ?? 'Failed to start');
    } catch(e:any) { setError(e.message); } finally { setStarting(false); }
  };

  const sendChat = async (e:React.FormEvent) => {
    e.preventDefault();
    const msg = chat.trim(); if(!msg) return;
    setChat('');
    try { await emit('chat:send', { content: msg }); } catch {}
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{room?.name ?? 'Race Lobby'}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <button onClick={copyCode} className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors">
              <span className="font-mono tracking-widest font-bold">{room?.code}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400"/> : <Copy className="w-3.5 h-3.5"/>}
            </button>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',room?.mode==='TYPING_RACE'?'bg-brand-600/20 text-brand-400':'bg-purple-600/20 text-purple-400')}>
              {room?.mode==='TYPING_RACE'?'typing':'quiz'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="w-4 h-4"/><span>{room?.participants?.length ?? 0}/{room?.maxPlayers ?? 6}</span></div>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 game-panel p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Players</p>
          {room?.participants?.map((p, i) => (
            <motion.div key={p.userId} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*.05}}
              className={cn('flex items-center gap-3 p-3 rounded-lg',p.userId===user?.id?'bg-brand-600/10 border border-brand-500/20':'bg-secondary/50')}>
              <div className="w-9 h-9 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center text-sm font-bold text-brand-300 overflow-hidden shrink-0">
                {p.avatar?<img src={p.avatar} className="w-full h-full rounded-full object-cover" alt=""/>:getInitials(p.displayName??p.username??'?')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5"><span className="font-medium text-sm text-foreground truncate">{p.displayName??p.username}</span>{p.isHost&&<Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0"/>}</div>
                <p className="text-xs text-muted-foreground">Lv.{p.level??1}</p>
              </div>
              <span className={cn('text-xs px-2 py-1 rounded-full font-medium shrink-0',p.isHost?'bg-yellow-500/20 text-yellow-400':p.isReady?'bg-emerald-500/20 text-emerald-400':'bg-secondary text-muted-foreground')}>
                {p.isHost?'Host':p.isReady?'Ready':'Waiting'}
              </span>
            </motion.div>
          ))}
          {Array.from({length:Math.max(0,(room?.maxPlayers??6)-(room?.participants?.length??0))}).map((_,i)=>(
            <div key={`e${i}`} className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border/50 text-muted-foreground/40">
              <div className="w-9 h-9 rounded-full border border-dashed border-current shrink-0"/>
              <span className="text-xs">Waiting for player…</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="game-panel flex flex-col" style={{minHeight:200}}>
            <div className="p-3 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">💬 Chat</div>
            <div ref={chatRef} className="flex-1 p-3 space-y-1.5 overflow-y-auto max-h-44">
              {messages.length===0?<p className="text-xs text-muted-foreground/50 text-center py-4">Say hi 👋</p>:
                messages.map((m:any,i:number)=>(
                  <div key={m.id??i} className="text-xs">
                    {m.type!=='system'&&<span className="font-semibold text-brand-400">{m.username}: </span>}
                    <span className="text-foreground/80">{m.content}</span>
                  </div>
                ))}
            </div>
            <form onSubmit={sendChat} className="flex gap-2 p-2 border-t border-border/50">
              <input value={chat} onChange={e=>setChat(e.target.value)} placeholder="Type a message…" maxLength={200} className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none"/>
              <button type="submit" disabled={!chat.trim()} className="text-muted-foreground hover:text-brand-400 transition-colors disabled:opacity-30"><Send className="w-3.5 h-3.5"/></button>
            </form>
          </div>

          <button onClick={copyCode} className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground hover:text-foreground transition-all">
            <Share2 className="w-3.5 h-3.5"/>Share Room Code
          </button>

          <div className="space-y-2">
            {!isHost&&(
              <button onClick={toggleReady} disabled={readying}
                className={cn('w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
                  isReady?'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-destructive/20 hover:border-destructive/40 hover:text-destructive':'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,.3)]',
                  readying&&'opacity-60 cursor-not-allowed')}>
                {readying?<Loader2 className="w-4 h-4 animate-spin"/>:isReady?'✕ Unready':'✓ Ready'}
              </button>
            )}
            {isHost&&(
              <button onClick={startRace} disabled={!canStart||starting}
                className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                {starting?<Loader2 className="w-4 h-4 animate-spin"/>:<Play className="w-4 h-4"/>}
                {canStart?'Start Race':'Waiting for players…'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
