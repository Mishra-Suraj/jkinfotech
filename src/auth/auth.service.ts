import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User, UserRole } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

/**
 * Authentication Service
 * 
 * Handles user authentication, token generation, validation, and management.
 * Provides methods for user login, registration, token refresh, and logout.
 */
@Injectable()
export class AuthService {

  /**
   * In-memory storage for blacklisted (revoked) access tokens
   * Used to invalidate tokens before they expire
   */
  private tokenBlacklist: Set<string> = new Set();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Authenticates a user with email and password
   * @param loginDto Contains user email and password credentials
   * @returns Access token, refresh token, and basic user information
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    return this.generateTokens(user);
  }

  /**
   * Registers a new user in the system
   * @param registerDto Contains user registration details
   * @returns Access token, refresh token, and basic user information for the new user
   * @throws ConflictException if the email is already registered
   */
  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    
    // Create new user
    const newUser = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      role: UserRole.USER,
    });
    
    // Generate and return tokens
    return this.generateTokens(newUser);
  }

  /**
   * Issues new access and refresh tokens using a valid refresh token
   * @param refreshTokenDto Contains the refresh token to validate
   * @returns New access token, refresh token, and basic user information
   * @throws UnauthorizedException if refresh token is invalid or expired
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    const refreshTokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!refreshTokenEntity || refreshTokenEntity.isRevoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > refreshTokenEntity.expiresAt) {
      // Revoke the expired token
      refreshTokenEntity.isRevoked = true;
      await this.refreshTokenRepository.save(refreshTokenEntity);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(refreshTokenEntity.user);

    // Revoke the old refresh token
    refreshTokenEntity.isRevoked = true;
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return tokens;
  }

  /**
   * Logs out a user by blacklisting their access token and revoking refresh tokens
   * @param token The access token to invalidate
   * @returns Success message object
   */
  async logout(token: string) {
    // Add access token to blacklist
    this.tokenBlacklist.add(token);

    // Find and revoke the associated refresh token if exists
    const userId = this.getUserIdFromToken(token);
    if (userId) {
      await this.revokeRefreshTokensForUser(userId);
    }

    return { message: 'Logout successful' };
  }

  /**
   * Revokes all active refresh tokens for a specific user
   * @param userId The ID of the user whose tokens should be revoked
   */
  async revokeRefreshTokensForUser(userId: string) {
    const refreshTokens = await this.refreshTokenRepository.find({
      where: { userId, isRevoked: false }
    });

    for (const token of refreshTokens) {
      token.isRevoked = true;
      await this.refreshTokenRepository.save(token);
    }
  }

  /**
   * Extracts user ID from a JWT access token
   * @param token The JWT access token to decode
   * @returns User ID if token is valid, null otherwise
   */
  getUserIdFromToken(token: string): string | null {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded.sub;
    } catch (error) {
      return null;
    }
  }

  /**
   * Checks if an access token has been blacklisted (revoked)
   * @param token The access token to check
   * @returns True if token is blacklisted, false otherwise
   */
  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  /**
   * Validates user credentials
   * @param email User email
   * @param password User password
   * @returns User object if credentials are valid, null otherwise
   * @private
   */
  private async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    
    if (user && await user.validatePassword(password)) {
      return user;
    }
    
    return null;
  }

  /**
   * Generates new access and refresh tokens for a user
   * @param user The user to generate tokens for
   * @returns Object containing access token, refresh token, and basic user info
   * @private
   */
  private async generateTokens(user: User) {
    const payload = { 
      email: user.email, 
      sub: user.id,
      role: user.role
    };

    // Create access token
    const accessToken = this.jwtService.sign(payload);

    // Create refresh token
    const refreshToken = await this.createRefreshToken(user);
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken.token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  /**
   * Creates a new refresh token for a user
   * @param user The user to create a refresh token for
   * @returns RefreshToken entity with a UUID token and 7-day expiration
   * @private
   */
  private async createRefreshToken(user: User): Promise<RefreshToken> {
    const refreshToken = new RefreshToken();
    
    refreshToken.userId = user.id;
    refreshToken.token = uuidv4();
    
    // Set refresh token to expire in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    refreshToken.expiresAt = expiresAt;
    
    return this.refreshTokenRepository.save(refreshToken);
  }
}
