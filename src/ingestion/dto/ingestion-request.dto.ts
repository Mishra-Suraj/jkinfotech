import { IsNotEmpty, IsString, IsOptional, IsEnum, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum IngestionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  RETRYING = 'retrying',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum IngestionType {
  DOCUMENT = 'document',
  EMAIL = 'email',
  API = 'api',
  DATABASE = 'database',
}

export class IngestionMetadataDto {
  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsObject()
  customMetadata?: Record<string, any>;
}

export class IngestionRequestDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(IngestionType)
  type: IngestionType;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => IngestionMetadataDto)
  metadata?: IngestionMetadataDto;
}
