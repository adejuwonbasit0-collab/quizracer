import { create } from 'zustand';
import type { Room, PlayerProgress, RaceResult, ChatMessage, QuizQuestion } from '@/lib/types';

export type GamePhase = 'idle'|'lobby'|'countdown'|'active'|'results';

interface GameState {
  room: Room|null; phase: GamePhase; countdown: number|null;
  textContent: string; textId: string|null; raceStartedAt: number|null;
  players: Record<string,PlayerProgress>; results: RaceResult[];
  messages: ChatMessage[]; isSearching: boolean;
  currentQuestion: QuizQuestion|null; questionNumber: number; totalQuestions: number; timePerRound: number; selectedAnswer: number|null; answersRevealed: boolean; revealData: any;
  setRoom:(r:Room|null)=>void; setPhase:(p:GamePhase)=>void; setCountdown:(n:number)=>void;
  startTypingRace:(text:string,textId:string,startedAt:number)=>void;
  setNewQuestion:(q:QuizQuestion,n:number,total:number,startedAt:number,tpr:number)=>void;
  revealAnswer:(correctIndex:number,answers:any,scores:any)=>void;
  setSelectedAnswer:(i:number)=>void;
  updatePlayer:(p:PlayerProgress)=>void; setResults:(r:RaceResult[])=>void;
  addMessage:(m:ChatMessage)=>void; setSearching:(v:boolean)=>void; reset:()=>void;
}

const INIT = { room:null,phase:'idle' as GamePhase,countdown:null,textContent:'',textId:null,raceStartedAt:null,players:{},results:[],messages:[],isSearching:false,currentQuestion:null,questionNumber:0,totalQuestions:0,timePerRound:20,selectedAnswer:null,answersRevealed:false,revealData:null };

export const useGameStore = create<GameState>((set)=>({
  ...INIT,
  setRoom:(room)=>set({room}),
  setPhase:(phase)=>set({phase}),
  setCountdown:(countdown)=>set({countdown}),
  startTypingRace:(textContent,textId,raceStartedAt)=>set({textContent,textId,raceStartedAt,phase:'active',players:{}}),
  setNewQuestion:(q,n,total,_startedAt,tpr)=>set({currentQuestion:q,questionNumber:n,totalQuestions:total,timePerRound:tpr,selectedAnswer:null,answersRevealed:false,revealData:null,phase:'active'}),
  revealAnswer:(correctIndex,answers,scores)=>set(s=>({answersRevealed:true,revealData:{correctIndex,answers,scores},currentQuestion:s.currentQuestion?{...s.currentQuestion,correctIndex}:null})),
  setSelectedAnswer:(i)=>set({selectedAnswer:i}),
  updatePlayer:(p)=>set(s=>({players:{...s.players,[p.userId]:p}})),
  setResults:(results)=>set({results,phase:'results'}),
  addMessage:(m)=>set(s=>({messages:[...s.messages.slice(-199),m]})),
  setSearching:(isSearching)=>set({isSearching}),
  reset:()=>set({...INIT}),
}));
