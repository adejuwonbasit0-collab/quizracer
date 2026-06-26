// ─── Enums ────────────────────────────────────────────────────
export enum UserRole {
  USER       = 'USER',
  MODERATOR  = 'MODERATOR',
  ADMIN      = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
}

export enum GameMode {
  TYPING_RACE  = 'TYPING_RACE',
  QUIZ_BATTLE  = 'QUIZ_BATTLE',
}

export enum RoomStatus {
  WAITING  = 'WAITING',
  STARTING = 'STARTING',
  ACTIVE   = 'ACTIVE',
  FINISHED = 'FINISHED',
  DISBANDED= 'DISBANDED',
}

// ─── User types ───────────────────────────────────────────────
export interface UserPublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  level: number;
  xp: number;
  xpRequired: number;
  globalRank?: number;
  bestWpm: number;
  avgWpm: number;
  accuracy: number;
  totalRaces: number;
  wins: number;
  streak: number;
  isPremium: boolean;
  bio?: string | null;
  createdAt: string;
}

export interface UserPrivateProfile extends UserPublicProfile {
  email: string;
  role: UserRole | string;
  coins: number;
}

// ─── Room / participant types ─────────────────────────────────
export interface RoomParticipant {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  level: number;
  isHost: boolean;
  isReady: boolean;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  mode: GameMode | string;
  status: RoomStatus | string;
  isPrivate: boolean;
  maxPlayers: number;
  hostId: string;
  participants: RoomParticipant[];
  textId?: string;
  textContent?: string;
  createdAt: string;
}

// ─── Progress types ───────────────────────────────────────────
export type PlayerCharacterState = 'idle' | 'running' | 'finished';

export interface PlayerProgress {
  userId: string;
  username: string;
  avatar: string | null;
  progress: number;
  wpm: number;
  accuracy: number;
  errors: number;
  combo: number;
  score: number;
  position: number;
  isFinished: boolean;
  finishedAt: number | null;
  characterState: PlayerCharacterState;
}

// ─── Race result ──────────────────────────────────────────────
export interface RaceResult {
  userId: string;
  username: string;
  avatar?: string | null;
  rank: number;
  wpm: number;
  accuracy: number;
  errors: number;
  durationMs: number;
  score: number;
  xpEarned: number;
  coinsEarned: number;
}

// ─── Quiz types ───────────────────────────────────────────────
export interface QuizOption {
  text: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  correctIndex?: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  imageUrl?: string | null;
}

// ─── Chat ────────────────────────────────────────────────────
export interface ChatMessage {
  id?: string;
  userId?: string;
  username: string;
  content: string;
  type?: 'user' | 'system';
  createdAt?: string;
}

// ─── Socket events ────────────────────────────────────────────
export interface ServerToClientEvents {
  // Room
  'room:updated':      (room: Room) => void;
  'room:player_joined':(participant: RoomParticipant) => void;
  'room:player_left':  (data: { userId: string }) => void;
  'room:player_ready': (data: { userId: string; isReady: boolean }) => void;
  'room:countdown':    (data: { seconds: number }) => void;
  'room:game_start':   (state: { textContent: string; textId: string; startedAt: number } | { startedAt: number }) => void;
  'room:game_end':     (results: RaceResult[]) => void;
  'room:disbanded':    () => void;
  // Typing
  'typing:player_progress': (progress: PlayerProgress) => void;
  // Quiz
  'quiz:new_question':    (data: { question: QuizQuestion; questionNumber: number; startedAt: number }) => void;
  'quiz:answer_revealed': (data: { correctIndex: number; answers: any[] }) => void;
  // Matchmaking
  'matchmaking:match_found': (data: { room: Room }) => void;
  'matchmaking:status':      (data: { status: 'waiting' | 'cancelled' }) => void;
  // Chat
  'chat:message': (msg: ChatMessage) => void;
}

export interface ClientToServerEvents {
  'room:create':    (data: { name: string; mode: GameMode | string; isPrivate: boolean; maxPlayers: number }, cb?: (res: any) => void) => void;
  'room:join':      (data: { code: string }, cb?: (res: any) => void) => void;
  'room:leave':     (data: undefined, cb?: (res: any) => void) => void;
  'room:ready':     (cb?: (res: any) => void) => void;
  'room:start':     (cb?: (res: any) => void) => void;
  'room:rematch':   (cb?: (res: any) => void) => void;
  'typing:progress':(progress: PlayerProgress, cb?: (res: any) => void) => void;
  'typing:finished':(data: { wpm: number; accuracy: number; errors: number; durationMs: number; keystrokes: any[] }, cb?: (res: any) => void) => void;
  'quiz:answer':    (data: { optionIndex: number; answeredAt: number }, cb?: (res: any) => void) => void;
  'matchmaking:join':   (data: { mode: GameMode | string }, cb?: (res: any) => void) => void;
  'matchmaking:cancel': (cb?: (res: any) => void) => void;
  'chat:send': (data: { content: string }, cb?: (res: any) => void) => void;
}
