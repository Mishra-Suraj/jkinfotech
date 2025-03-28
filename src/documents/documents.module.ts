/**
 * Documents Module
 * 
 * This module handles document management functionality including:
 * - File uploads and storage
 * - Document metadata persistence
 * - Document retrieval and manipulation
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from '../entities/document.entity';
import { existsSync, mkdirSync } from 'fs';

// Create uploads directory if it doesn't exist
const uploadsDir = './uploads';
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir);
}

@Module({
  imports: [
    // Register Document entity with TypeORM to enable repository injection
    TypeOrmModule.forFeature([Document]),
    // Configure Multer for file upload handling
    // Sets the destination directory for all uploaded files
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
