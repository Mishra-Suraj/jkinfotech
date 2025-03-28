import { IsNotEmpty, IsString, IsOptional, IsEnum, IsDate, IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus, DocumentCategory } from '../../entities/document.entity';

export class CreateDocumentDto {
  @ApiProperty({ description: 'The name of the document' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'The title of the document' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'The description of the document' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    enum: DocumentStatus,
    description: 'The status of the document',
    example: DocumentStatus.DRAFT 
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
  
  // New metadata fields
  @ApiPropertyOptional({ 
    enum: DocumentCategory,
    description: 'The category of the document',
    example: DocumentCategory.GENERAL
  })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ description: 'The author of the document' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ description: 'The version of the document' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'The date of the document', type: Date })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  documentDate?: Date;

  @ApiPropertyOptional({ 
    description: 'Tags associated with the document',
    type: [String],
    example: ['important', 'finance']
  })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Custom metadata for the document',
    type: 'object',
    additionalProperties: true,
    example: { priority: 'high', department: 'finance' }
  })
  @IsOptional()
  @IsObject()
  customMetadata?: Record<string, any>;
}
