import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './database/database.config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { IngestionModule } from './ingestion/ingestion.module';

/**
 * AppModule is the root module of the application.
 * It imports and configures all other modules needed for the application.
 */
@Module({
  imports: [
    // Configure TypeORM with database connection settings
    TypeOrmModule.forRoot(databaseConfig),
    // User management functionality
    UsersModule,
    // Authentication and authorization features
    AuthModule,
    // Document management functionality
    DocumentsModule,
    // Document ingestion processing functionality
    IngestionModule,
  ],
  controllers: [AppController], // Basic application controller
  providers: [AppService], // Basic application service
})
export class AppModule {}
