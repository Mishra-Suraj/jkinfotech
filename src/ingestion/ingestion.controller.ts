/**
 * Ingestion Controller
 * 
 * This controller manages the document ingestion process within the application.
 * It handles requests for triggering, monitoring, canceling, and retrying ingestion jobs.
 * Access to these endpoints is restricted based on user roles.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Logger,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { IngestionService } from './ingestion.service';
import { IngestionRequestDto } from './dto/ingestion-request.dto';
import { IngestionResponseDto } from './dto/ingestion-response.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Controller for handling document ingestion operations
 * Protected by JWT authentication and role-based authorization
 */
@ApiTags('ingestion')
@ApiBearerAuth('access-token')
@Controller('ingestion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IngestionController {
  private readonly logger = new Logger(IngestionController.name);

  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * Triggers a new document ingestion process
   * 
   * @param requestDto - Contains information about the document to be ingested
   * @param req - The request object containing user information
   * @returns Promise with the ingestion job details
   * @access ADMIN, EDITOR roles only
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async triggerIngestion(
    @Body() requestDto: IngestionRequestDto,
    @Request() req,
  ): Promise<IngestionResponseDto> {
    this.logger.log(`Received request to trigger ingestion for: ${requestDto.name}`);
    return this.ingestionService.triggerIngestion(requestDto, req.user.id);
  }

  /**
   * Retrieves the status of a specific ingestion job
   * 
   * @param id - The unique identifier of the ingestion job
   * @returns Promise with the current status of the ingestion job
   * @access ADMIN, EDITOR, VIEWER roles
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  async getIngestionStatus(
    @Param('id') id: string,
  ): Promise<IngestionResponseDto> {
    this.logger.log(`Received request to get status for ingestion ID: ${id}`);
    return this.ingestionService.getIngestionStatus(id);
  }

  /**
   * Cancels an ongoing ingestion job
   * 
   * @param id - The unique identifier of the ingestion job to cancel
   * @returns Promise with the updated status of the canceled ingestion job
   * @access ADMIN, EDITOR roles only
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async cancelIngestion(
    @Param('id') id: string,
  ): Promise<IngestionResponseDto> {
    this.logger.log(`Received request to cancel ingestion ID: ${id}`);
    return this.ingestionService.cancelIngestion(id);
  }

  /**
   * Retries a failed ingestion job
   * 
   * @param id - The unique identifier of the failed ingestion job
   * @returns Promise with the restarted ingestion job details
   * @access ADMIN, EDITOR roles only
   */
  @Post(':id/retry')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async retryIngestion(
    @Param('id') id: string,
  ): Promise<IngestionResponseDto> {
    this.logger.log(`Received request to retry ingestion ID: ${id}`);
    return this.ingestionService.retryIngestion(id);
  }

  /**
   * Processes multiple document ingestion requests in a single batch
   * 
   * @param requestDtos - Array of ingestion requests to be processed
   * @param req - The request object containing user information
   * @returns Promise with an array of ingestion job details
   * @access ADMIN, EDITOR roles only
   */
  @Post('batch')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async batchIngestion(
    @Body() requestDtos: IngestionRequestDto[],
    @Request() req,
  ): Promise<IngestionResponseDto[]> {
    this.logger.log(`Received batch ingestion request with ${requestDtos.length} items`);
    return this.ingestionService.batchIngestion(requestDtos, req.user.id);
  }
}
