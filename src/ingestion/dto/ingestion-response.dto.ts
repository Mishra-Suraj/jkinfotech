import { IsNotEmpty, IsString, IsEnum, IsUUID, IsObject, IsOptional, IsDate, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { IngestionStatus, IngestionType } from './ingestion-request.dto';

export class IngestionResponseDto {
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(IngestionType)
  type: IngestionType;

  @IsEnum(IngestionStatus)
  status: IngestionStatus;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @Type(() => Date)
  @IsDate()
  updatedAt: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  retryAttempts?: number;

  @IsOptional()
  @IsString()
  lastErrorMessage?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastRetryTime?: Date;

  @IsOptional()
  @IsObject()
  errorDetails?: Record<string, any>;
}
