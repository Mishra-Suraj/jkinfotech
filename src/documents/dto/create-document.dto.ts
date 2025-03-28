import { IsNotEmpty, IsString, IsOptional, IsEnum, IsDate, IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentStatus, DocumentCategory } from '../../entities/document.entity';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
  
  // New metadata fields
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  documentDate?: Date;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsObject()
  customMetadata?: Record<string, any>;
}
