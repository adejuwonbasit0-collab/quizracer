// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
}

export enum GameMode {
  TYPING_RACE = 'TYPING_RACE',
  QUIZ_RACE = 'QUIZ_RACE',
  MIXED_MODE = 'MIXED_MODE',
  DAILY_CHALLENGE = 'DAILY_CHALLENGE',
  TOURNAMENT = 'TOURNAMENT',
  PRACTICE = 'PRACTICE',
}

export enum RoomStatus {
  WAITING = 'WAITING',
  COUNTDOWN = 'COUNTDOWN',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  RACER = 'RACER',
  CHAMPION = 'CHAMPION',
  LEGEND = 'LEGEND',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  TRIALING = 'TRIALING',
}

export enum TransactionType {
  PURCHASE = 'PURCHASE',
  REWARD = 'REWARD',
  REFUND = 'REFUND',
  TOURNAMENT_PRIZE = 'TOURNAMENT_PRIZE',
  DAILY_BONUS = 'DAILY_BONUS',
  ACHIEVEMENT_REWARD = 'ACHIEVEMENT_REWARD',
  ADMIN_GRANT = 'ADMIN_GRANT',
}

export enum AchievementRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum ItemType {
  CHARACTER = 'character',
  SKIN = 'skin',
  POWERUP = 'powerup',
  TITLE = 'title',
  BACKGROUND = 'background',
  EFFECT = 'effect',
  TRAIL = 'trail',
}

// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────

export interface UserPublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  role: UserRole;
  level: number;
  xp: number;
  rating: number;
  rank: string;
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
  totalGames: number;
  totalWins: number;
  currentStreak: number;
  bestStreak: number;
  isVerified: boolean;
  createdAt: string;
}

export interface UserPrivateProfile extends UserPublicProfile {
  email: string;
  coins: number;
  gems: number;
  xpToNextLevel: number;
  totalTypingTime: number;
  theme: string;
  soundEnabled: boolean;
  showFingerGuide: boolean;
  preferredLayout: string;
  subscription: SubscriptionTier;
  lastLoginAt: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ─────────────────────────────────────────────
// ROOMS & MULTIPLAYER
// ─────────────────────────────────────────────

export interface RoomParticipant {
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  rating: number;
  level: number;
  isReady: boolean;
  isSpectator: boolean;
  isHost: boolean;
}

export interface RoomState {
  id: string;
  code: string;
  name: string;
  mode: GameMode;
  status: RoomStatus;
  isPrivate: boolean;
  maxPlayers: number;
  minPlayers: number;
  difficulty: Difficulty;
  subject: string | null;
  roundCount: number;
  timePerRound: number;
  participants: RoomParticipant[];
  hostId: string;
  createdAt: string;
}

export interface CreateRoomDto {
  name: string;
  mode: GameMode;
  isPrivate?: boolean;
  maxPlayers?: number;
  difficulty?: Difficulty;
  subject?: string;
  roundCount?: number;
  timePerRound?: number;
}

// ─────────────────────────────────────────────
// GAME SESSION
// ─────────────────────────────────────────────

export interface PlayerProgress {
  userId: string;
  username: string;
  avatar: string | null;
  progress: number;       // 0–100
  wpm: number;
  accuracy: number;
  errors: number;
  combo: number;
  score: number;
  position: number;       // race rank (1st, 2nd, ...)
  isFinished: boolean;
  finishedAt: number | null; // timestamp ms
  characterState: CharacterState;
}

export type CharacterState =
  | 'idle'
  | 'running'
  | 'boosting'
  | 'stumbling'
  | 'celebrating'
  | 'exhausted';

export interface TypingGameState {
  phase: 'waiting' | 'countdown' | 'active' | 'finished';
  countdown: number;
  textContent: string;
  textId: string;
  startedAt: number | null;
  finishedAt: number | null;
  players: Record<string, PlayerProgress>;
}

export interface QuizGameState {
  phase: 'waiting' | 'countdown' | 'active' | 'result' | 'finished';
  countdown: number;
  currentQuestion: number;
  totalQuestions: number;
  question: QuizQuestion | null;
  questionStartedAt: number | null;
  timePerRound: number;
  players: Record<string, PlayerProgress>;
  answers: Record<string, number>; // userId -> selectedIndex
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  imageUrl: string | null;
  subject: string;
  difficulty: Difficulty;
}

export interface RaceResult {
  userId: string;
  username: string;
  avatar: string | null;
  rank: number;
  wpm: number;
  accuracy: number;
  score: number;
  errors: number;
  durationMs: number;
  coinsEarned: number;
  xpEarned: number;
  isWin: boolean;
}

// ─────────────────────────────────────────────
// SOCKET EVENTS
// ─────────────────────────────────────────────

// Client → Server
export interface ClientToServerEvents {
  // Room
  'room:create': (dto: CreateRoomDto, cb: SocketCallback<RoomState>) => void;
  'room:join': (payload: { code: string }, cb: SocketCallback<RoomState>) => void;
  'room:leave': (cb: SocketCallback<void>) => void;
  'room:ready': (cb: SocketCallback<void>) => void;
  'room:kick': (payload: { userId: string }, cb: SocketCallback<void>) => void;
  'room:spectate': (payload: { code: string }, cb: SocketCallback<RoomState>) => void;

  // Typing game
  'typing:progress': (payload: TypingProgressPayload) => void;
  'typing:finished': (payload: TypingFinishedPayload, cb: SocketCallback<RaceResult>) => void;

  // Quiz game
  'quiz:answer': (payload: QuizAnswerPayload, cb: SocketCallback<{ correct: boolean }>) => void;

  // Matchmaking
  'matchmaking:join': (payload: { mode: GameMode; rated: boolean }, cb: SocketCallback<void>) => void;
  'matchmaking:leave': (cb: SocketCallback<void>) => void;

  // Chat
  'chat:send': (payload: { content: string }, cb: SocketCallback<void>) => void;
}

// Server → Client
export interface ServerToClientEvents {
  // Room
  'room:updated': (room: RoomState) => void;
  'room:player_joined': (participant: RoomParticipant) => void;
  'room:player_left': (payload: { userId: string; username: string }) => void;
  'room:player_ready': (payload: { userId: string; isReady: boolean }) => void;
  'room:countdown': (payload: { seconds: number }) => void;
  'room:game_start': (payload: TypingGameState | QuizGameState) => void;
  'room:game_end': (results: RaceResult[]) => void;
  'room:disbanded': (payload: { reason: string }) => void;

  // Typing
  'typing:player_progress': (payload: PlayerProgress) => void;
  'typing:player_finished': (payload: { userId: string; rank: number; wpm: number }) => void;

  // Quiz
  'quiz:new_question': (payload: { question: QuizQuestion; questionNumber: number; startedAt: number }) => void;
  'quiz:answer_revealed': (payload: { correctIndex: number; answers: Record<string, number>; scores: Record<string, number> }) => void;
  'quiz:round_end': (payload: { scores: Record<string, number> }) => void;

  // Matchmaking
  'matchmaking:status': (payload: { status: 'searching' | 'found' | 'cancelled'; queueSize?: number }) => void;
  'matchmaking:match_found': (payload: { roomCode: string; room: RoomState }) => void;

  // Chat
  'chat:message': (message: ChatMessage) => void;

  // Notifications
  'notification:new': (notification: NotificationPayload) => void;

  // System
  'error': (payload: { code: string; message: string }) => void;
  'ping': () => void;
}

// Inter-server events (through Redis adapter)
export interface InterServerEvents {
  ping: () => void;
}

// Socket data attached to each socket
export interface SocketData {
  userId: string;
  username: string;
  role: UserRole;
  roomId: string | null;
  isAuthenticated: boolean;
  connectedAt: number;
}

// ─────────────────────────────────────────────
// SOCKET PAYLOADS
// ─────────────────────────────────────────────

export interface TypingProgressPayload {
  progress: number;
  wpm: number;
  accuracy: number;
  errors: number;
  combo: number;
  charIndex: number;
}

export interface TypingFinishedPayload {
  wpm: number;
  accuracy: number;
  errors: number;
  durationMs: number;
  keystrokes: KeystrokeRecord[];
}

export interface KeystrokeRecord {
  char: string;
  expectedChar: string;
  correct: boolean;
  timestamp: number;
  durationMs: number;
}

export interface QuizAnswerPayload {
  questionId: string;
  selectedIndex: number;
  timeMs: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string | null;
  content: string;
  type: 'text' | 'system' | 'emoji';
  createdAt: string;
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

// ─────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────

export type LeaderboardPeriod = 'all_time' | 'monthly' | 'weekly';
export type LeaderboardMode = 'overall' | GameMode;

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  level: number;
  wpm: number;
  accuracy: number;
  wins: number;
  score: number;
  rating: number;
}

// ─────────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────────

export interface AchievementDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: AchievementRarity;
  xpReward: number;
  coinReward: number;
}

export interface UserAchievement extends AchievementDefinition {
  unlockedAt: string;
}

// ─────────────────────────────────────────────
// API RESPONSES
// ─────────────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export type SocketCallback<T> = (response: { success: boolean; data?: T; error?: string }) => void;

export interface JwtPayload {
  sub: string;       // userId
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}
