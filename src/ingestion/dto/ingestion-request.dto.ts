import { IsNotEmpty, IsString, IsOptional, IsEnum, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export enum SourceType {
  FILE = 'FILE',
  API = 'API',
  TEXT = 'TEXT',
}

export class IngestionMetadataDto {
  @ApiPropertyOptional({ description: 'Source of the ingestion' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Version of the ingested content' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ 
    description: 'Tags associated with the ingestion',
    type: [String],
    example: ['important', 'finance']
  })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Custom metadata for the ingestion',
    type: 'object',
    additionalProperties: true,
    example: { priority: 'high', department: 'finance' }
  })
  @IsOptional()
  @IsObject()
  customMetadata?: Record<string, any>;
}

export class IngestionRequestDto {
  @ApiProperty({ description: 'Name of the ingestion job' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the ingestion job' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    enum: IngestionType,
    description: 'Type of ingestion',
    example: IngestionType.DOCUMENT
  })
  @IsNotEmpty()
  @IsEnum(IngestionType)
  type: IngestionType;

  @ApiProperty({ description: 'Content to be ingested' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ 
    description: 'Metadata for the ingestion',
    type: IngestionMetadataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => IngestionMetadataDto)
  metadata?: IngestionMetadataDto;

  @ApiProperty({ 
    enum: SourceType,
    description: 'Type of source',
    example: SourceType.FILE
  })
  @IsNotEmpty()
  @IsEnum(SourceType)
  sourceType: SourceType;

  @ApiProperty({ description: 'Location of the source' })
  @IsNotEmpty()
  @IsString()
  sourceLocation: string;

  @ApiProperty({ description: 'Processing options for the ingestion' })
  @IsObject()
  processingOptions: Record<string, any>;

  @ApiProperty({ description: 'Target options for the ingestion' })
  @IsObject()
  targetOptions: Record<string, any>;
}
