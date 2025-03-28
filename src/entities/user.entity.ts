import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * User Role Enumeration
 * 
 * Defines the possible roles a user can have in the system, used for
 * role-based access control throughout the application.
 */
export enum UserRole {
  USER = 'user',      // Basic user with limited permissions
  ADMIN = 'admin',    // Administrator with full system access
  EDITOR = 'editor',  // Editor with content modification rights
  VIEWER = 'viewer',  // Viewer with read-only access
}

/**
 * User Entity
 * 
 * Represents a user in the system. This entity handles user authentication,
 * authorization, and profile information.
 * 
 * Features:
 * - Secure password hashing with bcrypt
 * - Role-based access control
 * - Automatic timestamp management
 * - UUID-based identification
 */
@Entity('users')
export class User {
  /**
   * Unique identifier for the user
   * Automatically generated UUID
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * User's full name
   * Maximum length: 100 characters
   */
  @Column({ length: 100 })
  name: string;

  /**
   * User's email address
   * Must be unique across all users
   */
  @Column({ unique: true })
  email: string;

  /**
   * User's password (stored as bcrypt hash)
   * Never returned in API responses
   */
  @Column()
  password: string;

  /**
   * User's role in the system
   * Determines access permissions throughout the application
   * Defaults to basic USER role
   */
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  /**
   * Flag indicating if the user account is active
   * Inactive users cannot log in
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * Timestamp when the user was created
   * Automatically set on record creation
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Timestamp when the user was last updated
   * Automatically updated on record modification
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Lifecycle hook to hash passwords before insertion or update
   * 
   * Only hashes the password if it's been modified (not already hashed)
   * Uses bcrypt with a work factor of 12 for secure hashing
   */
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Only hash the password if it's modified
    if (this.password && this.password.length < 60) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  /**
   * Validates a plain text password against the user's hashed password
   * 
   * @param password - The plain text password to validate
   * @returns Promise resolving to true if password matches, false otherwise
   */
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
