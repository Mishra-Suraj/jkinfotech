import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum DocumentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum DocumentCategory {
  GENERAL = 'general',
  FINANCIAL = 'financial',
  LEGAL = 'legal',
  TECHNICAL = 'technical',
  MARKETING = 'marketing',
  HR = 'hr',
  OTHER = 'other',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  title: string;

  @Column({ nullable: true, length: 1000 })
  description: string;

  @Column({ nullable: true })
  filePath: string;

  @Column()
  mimeType: string;

  @Column()
  size: number;
  
  @Column({ type: 'bytea', nullable: true })
  fileContent: Buffer;

  @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.DRAFT })
  status: DocumentStatus;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // New metadata fields
  @Column({ type: 'enum', enum: DocumentCategory, default: DocumentCategory.GENERAL })
  category: DocumentCategory;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  version: string;

  @Column({ type: 'date', nullable: true })
  documentDate: Date;

  @Column({ nullable: true, type: 'simple-json' })
  tags: string[];

  @Column({ nullable: true, type: 'simple-json' })
  customMetadata: Record<string, any>;
}
