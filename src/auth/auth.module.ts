// Auth Module - Handles authentication, JWT configuration, and refresh tokens
import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { RefreshToken } from '../entities/refresh-token.entity';

@Module({
  imports: [
    // Using forwardRef to handle circular dependency with UsersModule
    forwardRef(() => UsersModule),
    // Passport for authentication strategies
    PassportModule,
    // TypeORM to manage RefreshToken entity
    TypeOrmModule.forFeature([RefreshToken]),
    // JWT configuration for token generation and validation
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecret',
      signOptions: { expiresIn: '1h' }, // Access tokens expire in 1 hour
    }),
  ],
  // Service and strategy providers for authentication logic
  providers: [AuthService, JwtStrategy],
  // Export AuthService for use in other modules
  exports: [AuthService],
  // Controllers handling auth-related endpoints
  controllers: [AuthController],
})
export class AuthModule {}
