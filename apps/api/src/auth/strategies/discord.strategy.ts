import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-discord';
import { AppConfigService } from '../../config/app-config.service';

export interface DiscordProfile {
  provider: 'discord';
  providerId: string;
  email: string | null;
  username: string;
  displayName: string;
  avatar: string | null;
  discriminator: string;
  accessToken: string;
  refreshToken: string | null;
}

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  private readonly logger = new Logger(DiscordStrategy.name);

  constructor(protected readonly config: AppConfigService) {
    super({
      clientID:     config.discordClientId,
      clientSecret: config.discordClientSecret,
      callbackURL:  config.discordCallbackUrl,
      scope: ['identify', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    try {
      const discordProfile: DiscordProfile = {
        provider: 'discord',
        providerId: profile.id,
        email: profile.email ?? null,
        username: profile.username,
        displayName: profile.global_name ?? profile.username,
        avatar: profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null,
        discriminator: profile.discriminator ?? '0',
        accessToken,
        refreshToken: refreshToken ?? null,
      };

      done(null, discordProfile);
    } catch (err) {
      this.logger.error('Discord strategy error', err);
      done(err as Error);
    }
  }
}


