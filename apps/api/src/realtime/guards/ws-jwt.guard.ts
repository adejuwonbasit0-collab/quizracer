import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService, private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token = client.handshake?.auth?.token || client.handshake?.headers?.authorization?.split(' ')[1];
    if (!token) throw new WsException('Unauthorized');
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('app.jwtAccessSecret'),
      });
      client.data.userId = payload.sub;
      client.data.username = payload.username;
      client.data.role = payload.role;
      return true;
    } catch {
      throw new WsException('Invalid token');
    }
  }
}


