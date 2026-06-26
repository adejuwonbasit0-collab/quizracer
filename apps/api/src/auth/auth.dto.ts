import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail, IsString, MinLength, MaxLength,
  Matches, IsOptional, IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ example: 'player@quizracer.io' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  email!: string;

  @ApiProperty({ example: 'SpeedTyper99' })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(32, { message: 'Username must not exceed 32 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores and hyphens',
  })
  @Transform(({ value }) => (value as string).trim())
  username!: string;

  @ApiProperty({ example: 'SpeedTyper99' })
  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters' })
  @MaxLength(64, { message: 'Display name must not exceed 64 characters' })
  @Transform(({ value }) => (value as string).trim())
  displayName!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'player@quizracer.io' })
  @IsString()
  @IsNotEmpty({ message: 'Email or username is required' })
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  identifier!: string; // email or username

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'player@quizracer.io' })
  @IsEmail()
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'NewSecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword!: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  expiresIn!: number;

  @ApiProperty()
  user!: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatar: string | null;
    role: string;
    level: number;
    isVerified: boolean;
  };
}
