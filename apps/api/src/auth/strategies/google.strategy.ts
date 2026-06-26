import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { AppConfigService } from '../../config/app-config.service';

export interface GoogleProfile {
  provider: 'google';
  providerId: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  accessToken: string;
  refreshToken: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(protected readonly config: AppConfigService) {
    super({
      clientID:     config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL:  config.googleCallbackUrl,
      scope: ['profile', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email provided by Google'), undefined);

      const googleProfile: GoogleProfile = {
        provider: 'google',
        providerId: profile.id,
        email,
        displayName: profile.displayName,
        firstName: profile.name?.givenName ?? '',
        lastName:  profile.name?.familyName ?? '',
        avatar: profile.photos?.[0]?.value ?? null,
        accessToken,
        refreshToken: refreshToken ?? null,
      };

      done(null, googleProfile);
    } catch (err) {
      this.logger.error('Google strategy error', err);
      done(err as Error, undefined);
    }
  }
}


