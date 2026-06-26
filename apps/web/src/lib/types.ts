export enum UserRole { USER='USER', MODERATOR='MODERATOR', ADMIN='ADMIN', SUPERADMIN='SUPERADMIN' }
export enum GameMode { TYPING_RACE='TYPING_RACE', QUIZ_BATTLE='QUIZ_BATTLE' }
export enum RoomStatus { WAITING='WAITING', STARTING='STARTING', ACTIVE='ACTIVE', FINISHED='FINISHED', DISBANDED='DISBANDED' }
export interface UserPrivateProfile {
  id:string; username:string; displayName:string; email:string; avatar?:string|null;
  bio?:string|null; role:string; level:number; xp:number; xpToNextLevel:number;
  coins:number; gems:number; isPremium:boolean; streak:number; rating:number;
  theme:string; soundEnabled:boolean; createdAt:string;
  bestWpm?:number; avgWpm?:number; wins?:number; totalRaces?:number; globalRank?:number;
}
export interface RoomParticipant { userId:string; username:string; displayName:string; avatar?:string|null; level:number; isHost:boolean; isReady:boolean; }
export interface Room { id:string; code:string; name:string; mode:string; status:string; isPrivate:boolean; maxPlayers:number; minPlayers:number; hostId:string; difficulty:string; participants:RoomParticipant[]; createdAt:string; }
export interface PlayerProgress { userId:string; username:string; avatar:string|null; progress:number; wpm:number; accuracy:number; errors:number; isFinished:boolean; }
export interface RaceResult { userId:string; username:string; avatar?:string|null; rank:number; wpm:number; accuracy:number; errors:number; durationMs:number; score:number; xpEarned:number; coinsEarned:number; }
export interface QuizOption { text:string; }
export interface QuizQuestion { id:string; text:string; options:QuizOption[]|string[]; subject:string; difficulty:string; imageUrl?:string|null; correctIndex?:number; }
export interface ChatMessage { id?:string; userId?:string; username:string; content:string; type?:'user'|'system'; createdAt?:string; }
export interface ServerToClientEvents {
  'room:updated':(room:Room)=>void; 'room:player_joined':(p:RoomParticipant)=>void;
  'room:player_left':(d:{userId:string;username:string})=>void; 'room:player_ready':(d:{userId:string;isReady:boolean})=>void;
  'room:countdown':(d:{seconds:number})=>void; 'room:game_start':(d:any)=>void;
  'room:game_end':(results:RaceResult[])=>void; 'room:disbanded':()=>void;
  'typing:player_progress':(p:PlayerProgress)=>void; 'typing:player_finished':(d:any)=>void;
  'quiz:new_question':(d:any)=>void; 'quiz:answer_revealed':(d:any)=>void;
  'matchmaking:match_found':(d:{room:Room})=>void; 'matchmaking:status':(d:{status:string;queueSize?:number})=>void;
  'chat:message':(msg:ChatMessage)=>void;
}
export interface ClientToServerEvents {
  'room:create':(d:any,cb?:(r:any)=>void)=>void; 'room:join':(d:{code:string},cb?:(r:any)=>void)=>void;
  'room:leave':(d:any,cb?:(r:any)=>void)=>void; 'room:ready':(cb?:(r:any)=>void)=>void;
  'room:start':(cb?:(r:any)=>void)=>void; 'room:rematch':(cb?:(r:any)=>void)=>void;
  'typing:progress':(p:PlayerProgress,cb?:(r:any)=>void)=>void;
  'typing:finished':(d:any,cb?:(r:any)=>void)=>void;
  'quiz:answer':(d:{optionIndex:number;questionId:string;answeredAt:number},cb?:(r:any)=>void)=>void;
  'matchmaking:join':(d:{mode?:string},cb?:(r:any)=>void)=>void;
  'matchmaking:cancel':(cb?:(r:any)=>void)=>void;
  'chat:send':(d:{content:string},cb?:(r:any)=>void)=>void;
}
