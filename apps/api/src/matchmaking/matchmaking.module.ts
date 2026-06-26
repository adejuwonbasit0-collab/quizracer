import { Module } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingController } from './matchmaking.controller';
import { RoomsModule } from '../game/rooms/rooms.module';
@Module({ imports:[RoomsModule], providers:[MatchmakingService], controllers:[MatchmakingController], exports:[MatchmakingService] })
export class MatchmakingModule {}
