import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { IngestionStatus, IngestionType } from '../ingestion/dto/ingestion-request.dto';

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

  @Column({ nullable: true })
  documentId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true, type: 'text' })
  content: string;

  @Column({ nullable: true, type: 'jsonb' })
  metadata: Record<string, any>;

  @Column({ default: 0 })
  retryAttempts: number;

  @Column({ nullable: true })
  lastErrorMessage: string;

  @Column({ nullable: true })
  lastRetryTime: Date;

  @Column({ nullable: true, type: 'jsonb' })
  errorDetails: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
