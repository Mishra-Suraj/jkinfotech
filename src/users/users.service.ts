import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

/**
 * Users Service
 * 
 * Provides methods for managing user entities in the application.
 * This service handles all user-related operations including:
 * - User retrieval (finding by ID, email, or getting all users)
 * - User creation
 * - User information updates
 * - User deletion
 * 
 * The service uses TypeORM repositories to interact with the database.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Retrieves all users from the database
   * 
   * @returns Promise resolving to an array of User entities
   */
  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  /**
   * Finds a single user by their UUID
   * 
   * @param id - The UUID of the user to find
   * @returns Promise resolving to the User entity if found, or null if not found
   */
  findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  /**
   * Finds a single user by their email address
   * 
   * @param email - The email address to search for
   * @returns Promise resolving to the User entity if found, or null if not found
   */
  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  /**
   * Creates a new user in the database
   * 
   * @param userData - Partial User object containing the user data to create
   * @returns Promise resolving to the newly created User entity
   */
  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(userData);
    return this.usersRepository.save(newUser);
  }

  /**
   * Updates an existing user's information
   * 
   * @param id - The UUID of the user to update
   * @param userData - Partial User object containing the fields to update
   * @returns Promise resolving to the updated User entity
   * @throws Error if the user with the given ID is not found
   */
  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, userData);
    const user = await this.findOne(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Removes a user from the database
   * 
   * @param id - The UUID of the user to remove
   * @returns Promise resolving to void upon successful deletion
   */
  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
