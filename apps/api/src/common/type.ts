// apps/api/src/common/types.ts
// All shared enums/interfaces inlined here â€” no external package needed

export enum UserRole {
  USER       = 'USER',
  MODERATOR  = 'MODERATOR',
  ADMIN      = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
}

export enum GameMode {
  TYPING_RACE = 'TYPING_RACE',
  QUIZ_BATTLE = 'QUIZ_BATTLE',
}

export enum RoomStatus {
  WAITING   = 'WAITING',
  STARTING  = 'STARTING',
  ACTIVE    = 'ACTIVE',
  FINISHED  = 'FINISHED',
  DISBANDED = 'DISBANDED',
}

export enum Difficulty {
  EASY   = 'easy',
  MEDIUM = 'medium',
  HARD   = 'hard',
}

export interface KeystrokeRecord {
  key: string;
  timestamp: number;
  correct: boolean;
}

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
  characterState: 'idle' | 'running' | 'finished';
}

export interface RaceResult {
  userId: string;
  username: string;
  rank: number;
  wpm: number;
  accuracy: number;
  errors: number;
  durationMs: number;
  score: number;
  xpEarned: number;
  coinsEarned: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}


