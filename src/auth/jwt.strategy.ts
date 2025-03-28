import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecret',
      passReqToCallback: true,
    });
  }

  async validate(request: any, payload: any) {
    // Extract token from request
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    
    // Check if token is blacklisted
    if (this.authService.isTokenBlacklisted(token)) {
      throw new UnauthorizedException('Token has been invalidated');
    }
    
    const user = await this.usersService.findOne(payload.sub);
    return user;
  }
}
