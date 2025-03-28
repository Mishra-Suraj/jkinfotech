/**
 * Users Module
 * 
 * This module handles all user-related functionality in the application.
 * It configures the necessary components for user management including:
 * - TypeORM integration for User entity
 * - User service for business logic
 * - User controller for handling HTTP requests
 * 
 * The module exports UsersService to make it available to other modules
 * that need to perform user-related operations.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
