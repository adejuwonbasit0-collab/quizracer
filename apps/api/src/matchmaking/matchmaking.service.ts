import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RoomsService } from '../game/rooms/rooms.service';

export interface QueueEntry { userId:string; username:string; rating:number; mode:string; joinedAt:number; }

type NotifyFn = (userIds:string[], code:string, room:unknown)=>void;

const ELO_WINDOW_INITIAL = 200;
const ELO_WINDOW_MAX = 800;
const WAIT_WINDOW_EXPAND_MS = 30_000;
const ROOM_SIZE = 4;

@Injectable()
export class MatchmakingService implements OnModuleDestroy {
  private readonly logger = new Logger(MatchmakingService.name);
  private queues = new Map<string, Map<string, QueueEntry>>();
  private notifyFn?: NotifyFn;
  private tick?: NodeJS.Timeout;

  constructor(private readonly rooms: RoomsService) {
    this.tick = setInterval(()=>this.processTick(), 1500);
  }

  onModuleDestroy() { if(this.tick) clearInterval(this.tick); }

  registerNotifyFn(fn:NotifyFn) { this.notifyFn=fn; }

  enqueue(entry:QueueEntry): number {
    if (!this.queues.has(entry.mode)) this.queues.set(entry.mode, new Map());
    this.queues.get(entry.mode)!.set(entry.userId, entry);
    return this.queues.get(entry.mode)!.size;
  }

  dequeue(userId:string) { for(const q of this.queues.values()) q.delete(userId); }
  isInQueue(userId:string): boolean { for(const q of this.queues.values()) if(q.has(userId)) return true; return false; }
  getStats(): Record<string,number> { const s:Record<string,number>={}; for(const[m,q] of this.queues) s[m]=q.size; return s; }

  private async processTick() {
    for(const[mode,queue] of this.queues) {
      if(queue.size<2) continue;
      const entries=Array.from(queue.values()).sort((a,b)=>a.rating-b.rating);
      const matched=new Set<string>();
      const groups:QueueEntry[][]=[];
      for(let i=0;i<entries.length;i++) {
        if(matched.has(entries[i].userId)) continue;
        const wait=Date.now()-entries[i].joinedAt;
        const window=Math.min(ELO_WINDOW_INITIAL+Math.floor(wait/WAIT_WINDOW_EXPAND_MS)*100, ELO_WINDOW_MAX);
        const group=[entries[i]]; matched.add(entries[i].userId);
        for(let j=i+1;j<entries.length&&group.length<ROOM_SIZE;j++) {
          if(matched.has(entries[j].userId)) continue;
          if(Math.abs(entries[j].rating-entries[i].rating)<=window) { group.push(entries[j]); matched.add(entries[j].userId); }
        }
        if(group.length>=2) groups.push(group);
      }
      for(const group of groups) await this.createMatch(group, mode);
    }
  }

  private async createMatch(players:QueueEntry[], mode:string) {
    try {
      const room=await this.rooms.create({ name:'⚡ Ranked Match', mode, isPrivate:true, maxPlayers:ROOM_SIZE, hostId:players[0].userId });
      const q=this.queues.get(mode);
      players.forEach(p=>q?.delete(p.userId));
      this.logger.log(`Match: ${room.code} mode=${mode} players=${players.length}`);
      this.notifyFn?.(players.map(p=>p.userId), room.code, room);
    } catch(err:any) { this.logger.error(`Match failed: ${err.message}`); }
  }
}
