import { Controller, Get, Post, Body, Param, Put, Delete, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')

/**
 * Controller responsible for handling user-related HTTP requests
 * 
 * Manages user resources with role-based access control for CRUD operations.
 * Protected by JWT authentication and role guards.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
  /**
   * Retrieves all users from the system
   * 
   * @returns Promise resolving to an array of user entities
   * @access ADMIN, EDITOR, VIEWER roles
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @Get()
  @ApiOperation({ summary: 'Get all users', description: 'Retrieves all users from the system' })
  @ApiResponse({ status: 200, description: 'Users found', type: [User] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires Admin, Editor, Viewer role' })
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }
  
  /**
   * Retrieves a specific user by their ID
   * 
   * @param id - The unique identifier of the user to retrieve
   * @returns Promise resolving to the found user entity
   * @throws HttpException with 404 status if user is not found
   * @access ADMIN, EDITOR, VIEWER roles
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER, UserRole.USER)
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by their id', description: 'Retrieves a user by their unique identifier' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires Admin, Editor, Viewer or User role' })

  async findOne(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }
  
  /**
   * Creates a new user in the system
   * 
   * @param createUserDto - Data for creating the new user
   * @returns Promise resolving to the newly created user entity
   * @access ADMIN role only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new user', description: 'Creates a new user in the system (Admin only)' })
  @ApiResponse({ status: 201, description: 'User successfully created', type: User })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires Admin role' })
  @ApiBody({ type: CreateUserDto, description: 'User creation data' })
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }
  
  /**
   * Updates an existing user's information
   * 
   * @param id - The unique identifier of the user to update
   * @param userData - Partial user data containing fields to update
   * @returns Promise resolving to the updated user entity
   * @throws HttpException with 404 status if user is not found
   * @access ADMIN, EDITOR roles
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @Put(':id')
  @ApiOperation({ summary: 'Update a user', description: 'Updates an existing user\'s information' })
  @ApiResponse({ status: 200, description: 'User successfully updated', type: User })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires Admin or Editor role' })
  @ApiBody({ type: CreateUserDto, description: 'User update data' })
  async update(@Param('id') id: string, @Body() userData: Partial<User>): Promise<User> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return this.usersService.update(id, userData);
  }
  
  /**
   * Removes a user from the system
   * 
   * @param id - The unique identifier of the user to delete
   * @returns Promise resolving to void on successful deletion
   * @throws HttpException with 404 status if user is not found
   * @access ADMIN role only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user', description: 'Removes a user from the system (Admin only)' })
  @ApiResponse({ status: 200, description: 'User successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires Admin role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string): Promise<void> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return this.usersService.remove(id);
  }
}
