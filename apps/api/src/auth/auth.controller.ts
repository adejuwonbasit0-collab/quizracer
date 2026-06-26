import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/index';

class RegisterDto {
  @IsEmail() @Transform(({ value }) => value?.toLowerCase().trim()) email: string;
  @IsString() @MinLength(3) @MaxLength(20) @Matches(/^[a-zA-Z0-9_]+$/) @Transform(({ value }) => value?.toLowerCase().trim()) username: string;
  @IsString() @MinLength(2) @MaxLength(40) @Transform(({ value }) => value?.trim()) displayName: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
}

class LoginDto {
  @IsString() @Transform(({ value }) => value?.toLowerCase().trim()) identifier: string;
  @IsString() @MinLength(1) password: string;
}

class RefreshDto {
  @IsString() refreshToken: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout() { return { message: 'Logged out successfully' }; }
}


