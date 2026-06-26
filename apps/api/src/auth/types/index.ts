export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR' | 'SUPERADMIN';
export type KeystrokeRecord = { timestamp: number; key: string; duration?: number };
export type GameMode = 'TYPING_RACE' | 'QUIZ_BATTLE' | 'PRACTICE';