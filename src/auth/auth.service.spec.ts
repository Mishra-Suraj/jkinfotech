import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let usersService: UsersService;
  let refreshTokenRepository;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 'user-id',
        email: loginDto.email,
        password: 'hashed-password',
        validatePassword: jest.fn().mockResolvedValue(true),
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValueOnce('access-token');
      
      const refreshTokenEntity = { token: 'refresh-token' };
      mockRefreshTokenRepository.save.mockResolvedValue(refreshTokenEntity);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          name: undefined,
          role: undefined
        }
      });
      
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(user.validatePassword).toHaveBeenCalledWith(loginDto.password);
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 'user-id',
        email: loginDto.email,
        password: 'hashed-password',
        validatePassword: jest.fn().mockResolvedValue(false),
      };

      mockUsersService.findByEmail.mockResolvedValue(user);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const newUser = {
        id: 'user-id',
        email: registerDto.email,
        name: registerDto.name,
        role: 'USER',
      };
      
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(newUser);
      
      mockJwtService.sign.mockReturnValueOnce('access-token');
      
      const refreshTokenEntity = { token: 'refresh-token' };
      mockRefreshTokenRepository.save.mockResolvedValue(refreshTokenEntity);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER'
        }
      });
      
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const refreshTokenEntity = {
        id: 'token-id',
        userId: 'user-id',
        token: refreshTokenDto.refreshToken,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000), // tomorrow
        user: { 
          id: 'user-id', 
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER'
        }
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(refreshTokenEntity);
      mockJwtService.sign.mockReturnValueOnce('new-access-token');
      
      const newRefreshTokenEntity = { token: 'new-refresh-token' };
      mockRefreshTokenRepository.save.mockResolvedValue(newRefreshTokenEntity);

      const result = await service.refreshToken(refreshTokenDto);

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER'
        }
      });
      
      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: refreshTokenDto.refreshToken },
        relations: ['user'],
      });
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'invalid-refresh-token',
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when refresh token is expired', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'expired-refresh-token',
      };

      const refreshTokenEntity = {
        id: 'token-id',
        userId: 'user-id',
        token: refreshTokenDto.refreshToken,
        isRevoked: false,
        expiresAt: new Date(Date.now() - 86400000), // yesterday
        user: { id: 'user-id', email: 'test@example.com' }
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(refreshTokenEntity);
      mockRefreshTokenRepository.save.mockResolvedValue({ ...refreshTokenEntity, isRevoked: true });

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith({ ...refreshTokenEntity, isRevoked: true });
    });
  });

  describe('logout', () => {
    it('should invalidate the access token and revoke refresh tokens', async () => {
      const token = 'valid-access-token';
      const userId = 'user-id';
      
      mockJwtService.verify.mockReturnValue({ sub: userId });
      
      const refreshTokens = [
        { id: 'token1', isRevoked: false },
        { id: 'token2', isRevoked: false }
      ];
      
      mockRefreshTokenRepository.find.mockResolvedValue(refreshTokens);
      mockRefreshTokenRepository.save.mockResolvedValueOnce({ ...refreshTokens[0], isRevoked: true });
      mockRefreshTokenRepository.save.mockResolvedValueOnce({ ...refreshTokens[1], isRevoked: true });

      const result = await service.logout(token);

      expect(result).toEqual({ message: 'Logout successful' });
      expect(mockJwtService.verify).toHaveBeenCalledWith(token);
      expect(mockRefreshTokenRepository.find).toHaveBeenCalledWith({
        where: { userId, isRevoked: false }
      });
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid access token during logout', async () => {
      const token = 'invalid-access-token';
      
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.logout(token);

      expect(result).toEqual({ message: 'Logout successful' });
      expect(mockRefreshTokenRepository.find).not.toHaveBeenCalled();
    });
  });
});
