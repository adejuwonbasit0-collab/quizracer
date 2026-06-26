'use client';
import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useGameStore } from '@/stores/game.store';
import { createSocket, destroySocket, getSocket, type QRSocket } from '@/lib/socket';
import { getAccessToken } from '@/lib/api';

interface CtxVal { socket: QRSocket|null; emit: (e:string, p?:unknown)=>Promise<any>; isConnected: boolean; }
const Ctx = createContext<CtxVal>({ socket:null, emit:async()=>({}), isConnected:false });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const sockRef = useRef<QRSocket|null>(null);
  const { setRoom, setPhase, setCountdown, startTypingRace, setNewQuestion, revealAnswer, updatePlayer, setResults, addMessage, setSearching } = useGameStore();

  const bindEvents = useCallback((sock: QRSocket) => {
    sock.on('room:updated', r => setRoom(r as any));
    sock.on('room:game_start', d => {
      if ('textContent' in d) startTypingRace(d.textContent, d.textId, d.startedAt ?? Date.now());
      else setPhase('active');
    });
    sock.on('room:countdown', ({ seconds }) => { setPhase('countdown'); setCountdown(seconds); });
    sock.on('room:game_end', r => setResults(r as any));
    sock.on('room:disbanded', () => { setRoom(null); setPhase('idle'); });
    sock.on('room:player_joined', p => {
      const room = useGameStore.getState().room;
      if (room) setRoom({ ...room, participants: [...room.participants, p as any] });
    });
    sock.on('room:player_left', ({ userId }) => {
      const room = useGameStore.getState().room;
      if (room) setRoom({ ...room, participants: room.participants.filter((x:any) => x.userId !== userId) });
    });
    sock.on('room:player_ready', ({ userId, isReady }) => {
      const room = useGameStore.getState().room;
      if (room) setRoom({ ...room, participants: room.participants.map((x:any) => x.userId === userId ? { ...x, isReady } : x) });
    });
    sock.on('typing:player_progress', p => updatePlayer(p as any));
    sock.on('quiz:new_question', ({ question, questionNumber, totalQuestions, startedAt, timePerRound }) => {
      setNewQuestion(question as any, questionNumber, totalQuestions, startedAt, timePerRound);
    });
    sock.on('quiz:answer_revealed', ({ correctIndex, answers, scores }) => revealAnswer(correctIndex, answers, scores));
    sock.on('matchmaking:match_found', ({ room }) => { setSearching(false); setRoom(room as any); setPhase('lobby'); });
    sock.on('matchmaking:status', ({ status }) => { if (status === 'cancelled') setSearching(false); });
    sock.on('chat:message', m => addMessage(m as any));
    sock.on('connect', () => {});
    sock.on('disconnect', () => {});
    sock.on('connect_error', e => console.error('[Socket] connect_error:', e.message));
  }, [setRoom, setPhase, setCountdown, startTypingRace, setNewQuestion, revealAnswer, updatePlayer, setResults, addMessage, setSearching]);

  useEffect(() => {
    if (!isAuthenticated) { destroySocket(); sockRef.current = null; return; }
    const token = getAccessToken();
    if (!token) return;
    const sock = createSocket(token);
    sockRef.current = sock;
    bindEvents(sock);
    return () => { sock.removeAllListeners(); };
  }, [isAuthenticated, bindEvents]);

  const emit = useCallback(async (event: string, payload?: unknown): Promise<any> => {
    const sock = getSocket();
    if (!sock?.connected) throw new Error('Socket not connected');
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Socket timeout')), 10_000);
      const cb = (res: any) => { clearTimeout(t); resolve(res); };
      payload !== undefined ? (sock as any).emit(event, payload, cb) : (sock as any).emit(event, cb);
    });
  }, []);

  return <Ctx.Provider value={{ socket: sockRef.current, emit, isConnected: sockRef.current?.connected ?? false }}>{children}</Ctx.Provider>;
}

export const useSocket = () => useContext(Ctx);
