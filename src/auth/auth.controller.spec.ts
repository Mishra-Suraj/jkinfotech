import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login with loginDto', async () => {
      const loginDto: LoginDto = { email: 'test@example.com', password: 'password123' };
      const expectedResult = { access_token: 'test-token', refresh_token: 'refresh-token' };
      
      mockAuthService.login.mockResolvedValue(expectedResult);
      
      expect(await controller.login(loginDto)).toBe(expectedResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('register', () => {
    it('should call authService.register with registerDto', async () => {
      const registerDto: RegisterDto = { 
        email: 'test@example.com', 
        password: 'password123',
        name: 'Test User'
      };
      const expectedResult = { id: 'user-id', email: 'test@example.com' };
      
      mockAuthService.register.mockResolvedValue(expectedResult);
      
      expect(await controller.register(registerDto)).toBe(expectedResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshToken with refreshTokenDto', async () => {
      const refreshTokenDto: RefreshTokenDto = { refreshToken: 'refresh-token' };
      const expectedResult = { access_token: 'new-token', refresh_token: 'new-refresh-token' };
      
      mockAuthService.refreshToken.mockResolvedValue(expectedResult);
      
      expect(await controller.refresh(refreshTokenDto)).toBe(expectedResult);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with token', async () => {
      const authHeader = 'Bearer test-token';
      const expectedResult = { success: true };
      
      mockAuthService.logout.mockResolvedValue(expectedResult);
      
      expect(await controller.logout(authHeader)).toBe(expectedResult);
      expect(mockAuthService.logout).toHaveBeenCalledWith('test-token');
    });
  });

  describe('getProfile', () => {
    it('should return user from request', () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockRequest = { user: mockUser };
      
      expect(controller.getProfile(mockRequest)).toBe(mockUser);
    });
  });
});
