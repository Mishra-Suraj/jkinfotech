import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IngestionStatus, IngestionType } from './ingestion-request.dto';

export class IngestionResponseDto {
  @ApiProperty({ description: 'Unique identifier for the ingestion job' })
  id: string;

  @ApiProperty({ description: 'Name of the ingestion job' })
  name: string;

  @ApiPropertyOptional({ description: 'Description of the ingestion job' })
  description?: string;

  @ApiProperty({ 
    enum: IngestionType,
    description: 'Type of ingestion',
    example: IngestionType.DOCUMENT
  })
  type: IngestionType;

  @ApiProperty({ 
    enum: IngestionStatus,
    description: 'Current status of the ingestion job',
    example: IngestionStatus.PENDING
  })
  status: IngestionStatus;

  @ApiProperty({ description: 'Status message about the ingestion job' })
  message: string;

  @ApiPropertyOptional({ description: 'ID of the document created from this ingestion' })
  documentId?: string;

  @ApiPropertyOptional({ description: 'User ID who created this ingestion job' })
  userId?: string;

  @ApiProperty({ description: 'When the ingestion job was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the ingestion job was last updated' })
  updatedAt: Date;

  @ApiPropertyOptional({ 
    description: 'Metadata associated with the ingestion',
    type: 'object',
    additionalProperties: true
  })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Number of retry attempts made for this job' })
  retryAttempts: number;

  @ApiPropertyOptional({ description: 'Last error message if job failed' })
  lastErrorMessage?: string;

  @ApiPropertyOptional({ description: 'When the job was last retried' })
  lastRetryTime?: Date;

  @ApiPropertyOptional({ 
    description: 'Detailed error information if job failed',
    type: 'object',
    additionalProperties: true
  })
  errorDetails?: Record<string, any>;
}
