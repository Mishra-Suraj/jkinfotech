/**
 * Ingestion Module
 * 
 * This module is responsible for managing the document ingestion process within the application.
 * It encapsulates the functionality for creating, monitoring, canceling, and retrying ingestion jobs.
 * It uses TypeORM to interact with the database and provides the IngestionService to other modules.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { IngestionJob } from '../entities/ingestion-job.entity';

@Module({
  imports: [
    // Register the IngestionJob entity with TypeORM to enable repository injection
    TypeOrmModule.forFeature([IngestionJob]),
  ],
  // Service that implements the ingestion business logic
  providers: [IngestionService],
  // Controller that exposes the ingestion API endpoints
  controllers: [IngestionController],
  // Export the IngestionService to be used by other modules
  exports: [IngestionService],
})
export class IngestionModule {}
