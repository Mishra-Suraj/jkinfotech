import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { User, UserRole } from '../entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  // Create mock user data
  const mockUser = {
    id: 'test-id',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    role: UserRole.VIEWER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    hashPassword: jest.fn(),
    validatePassword: jest.fn(),
  } as User;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [mockUser];
      mockUsersService.findAll.mockResolvedValue(users);

      expect(await controller.findAll()).toBe(users);
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      expect(await controller.findOne('test-id')).toBe(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith('test-id');
    });

    it('should throw an exception if user is not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith('non-existent-id');
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'new@example.com',
        name: 'New User',
        password: 'password123',
        role: UserRole.VIEWER,
      };

      mockUsersService.create.mockResolvedValue({
        id: 'new-id',
        ...userData,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(await controller.create(userData)).toEqual(expect.objectContaining({
        id: 'new-id',
        email: userData.email,
      }));
      expect(mockUsersService.create).toHaveBeenCalledWith(userData);
    });

    it('should re-throw an error from service during create', async () => {
      const userData = { email: 'new@example.com', name: 'New User', password: 'password123', role: UserRole.VIEWER };
      const expectedError = new Error('Failed to create user');

      mockUsersService.create.mockRejectedValue(expectedError);

      await expect(controller.create(userData)).rejects.toThrow(expectedError);
      expect(mockUsersService.create).toHaveBeenCalledWith(userData);
    });

  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockUsersService.update.mockResolvedValue({
        ...mockUser,
        ...updateData,
      });

      const result = await controller.update('test-id', updateData);
      
      expect(result).toEqual(expect.objectContaining({
        id: 'test-id',
        name: 'Updated Name',
      }));
      expect(mockUsersService.findOne).toHaveBeenCalledWith('test-id');
      expect(mockUsersService.update).toHaveBeenCalledWith('test-id', updateData);
    });

    it('should throw an exception if user to update is not found', async () => {
      // Reset all mocks before this test
      jest.clearAllMocks();
      
      // Mock findOne to return null to simulate user not found
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(controller.update('non-existent-id', {})).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith('non-existent-id');
      expect(mockUsersService.update).not.toHaveBeenCalled();
    });

    it('should re-throw an error from service during update', async () => {
      const updateData = { name: 'Updated Name' };
      const expectedError = new Error('Failed to update user');

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockUsersService.update.mockRejectedValue(expectedError);

      await expect(controller.update('test-id', updateData)).rejects.toThrow(expectedError);
      expect(mockUsersService.update).toHaveBeenCalledWith('test-id', updateData);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockUsersService.remove.mockResolvedValue(undefined);

      await expect(controller.remove('test-id')).resolves.toBeUndefined();
      expect(mockUsersService.findOne).toHaveBeenCalledWith('test-id');
      expect(mockUsersService.remove).toHaveBeenCalledWith('test-id');
    });

    it('should throw an exception if user to remove is not found', async () => {
      // Reset all mocks before this test
      jest.clearAllMocks();
      
      // Mock findOne to return null to simulate user not found
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(controller.remove('non-existent-id')).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith('non-existent-id');
      expect(mockUsersService.remove).not.toHaveBeenCalled();
    });

    it('should re-throw an error from service during remove', async () => {
      const expectedError = new Error('Failed to remove user');

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockUsersService.remove.mockRejectedValue(expectedError);

      await expect(controller.remove('test-id')).rejects.toThrow(expectedError);
      expect(mockUsersService.remove).toHaveBeenCalledWith('test-id');
    });
  });
});
