import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { IngestionStatus, IngestionType, SourceType } from '../ingestion/dto/ingestion-request.dto';

@Entity('ingestion_jobs')
export class IngestionJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, length: 1000 })
  description: string;

  @Column({
    type: 'enum',
    enum: IngestionType,
  })
  type: IngestionType;

  @Column({
    type: 'enum',
    enum: IngestionStatus,
    default: IngestionStatus.PENDING
  })
  status: IngestionStatus;

  @Column({ length: 1000 })
  message: string;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  documentId: string | null;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true, type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: SourceType,
    nullable: true
  })
  sourceType: SourceType;

  @Column({ nullable: true })
  sourceLocation: string;

  @Column({ nullable: true, type: 'jsonb' })
  processingOptions: Record<string, any> | null;

  @Column({ nullable: true, type: 'jsonb' })
  targetOptions: Record<string, any> | null;

  @Column({ nullable: true, type: 'jsonb' })
  metadata: Record<string, any> | null;

  @Column({ default: 0 })
  retryAttempts: number;

  @Column({ nullable: true, type: 'text' })
  lastErrorMessage: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  lastRetryTime: Date | null;

  @Column({ nullable: true, type: 'jsonb' })
  errorDetails: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
