import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestionRequestDto, IngestionStatus, IngestionType } from './dto/ingestion-request.dto';
import { IngestionResponseDto } from './dto/ingestion-response.dto';
import { IngestionJob } from '../entities/ingestion-job.entity';

// Configuration for retry mechanism
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
}

// Error categories - to determine which errors can be retried
enum ErrorCategory {
  TRANSIENT = 'transient', // Temporary errors that can be retried (network issues, timeouts)
  PERMANENT = 'permanent', // Permanent errors that should not be retried (invalid data format)
  UNKNOWN = 'unknown',     // Unclassified errors (default to retryable)
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  
  // Default retry configuration
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 2000,  // 2 seconds
    maxDelayMs: 30000,  // 30 seconds
    exponentialBackoff: true,
  };
  
  constructor(
    @InjectRepository(IngestionJob)
    private ingestionJobRepository: Repository<IngestionJob>,
  ) {}

  /**
   * Triggers an ingestion process
   * @param requestDto The ingestion request data
   * @returns A response with ingestion details
   */
  async triggerIngestion(requestDto: IngestionRequestDto, userId?: string): Promise<IngestionResponseDto> {
    this.logger.log(`Triggering ingestion for: ${requestDto.name}`);
    
    // Create a new ingestion job in the database
    const newJob = this.ingestionJobRepository.create({
      name: requestDto.name,
      description: requestDto.description,
      type: requestDto.type,
      status: IngestionStatus.PENDING,
      message: 'Document ingestion is queued for processing',
      documentId: requestDto.type === IngestionType.DOCUMENT ? undefined : undefined, // Will be updated when complete
      userId: userId || 'system', // If no user ID is provided, use 'system'
      content: requestDto.content,
      metadata: requestDto.metadata,
      retryAttempts: 0,
    });
    
    // Save to database
    const savedJob = await this.ingestionJobRepository.save(newJob);
    
    this.logger.log(`Ingestion job created with ID: ${savedJob.id}`);
    
    // Start the processing as a background task
    this.processIngestionAsync(savedJob.id);
    
    // Return the response DTO
    return this.mapToResponseDto(savedJob);
  }
  
  /**
   * Retrieves the status of an ingestion job
   * @param id The ID of the ingestion job
   * @returns The current status of the ingestion job
   */
  async getIngestionStatus(id: string): Promise<IngestionResponseDto> {
    this.logger.log(`Fetching status for ingestion ID: ${id}`);
    
    // Find the job in the database
    const job = await this.ingestionJobRepository.findOne({ where: { id } });
    
    if (!job) {
      throw new NotFoundException(`Ingestion job with ID "${id}" not found`);
    }
    
    return this.mapToResponseDto(job);
  }
  
  /**
   * Cancels an ingestion job
   * @param id The ID of the ingestion job to cancel
   * @returns A response indicating success or failure
   */
  async cancelIngestion(id: string): Promise<IngestionResponseDto> {
    this.logger.log(`Canceling ingestion job with ID: ${id}`);
    
    // Find the job in the database
    const job = await this.ingestionJobRepository.findOne({ where: { id } });
    
    if (!job) {
      throw new NotFoundException(`Ingestion job with ID "${id}" not found`);
    }
    
    // Only allow cancellation if the job is not already completed or failed
    if (job.status === IngestionStatus.COMPLETED || job.status === IngestionStatus.FAILED) {
      throw new BadRequestException(`Cannot cancel ingestion job with status "${job.status}"`);
    }
    
    // Update job status to failed (canceled)
    job.status = IngestionStatus.FAILED;
    job.message = 'Ingestion job was canceled by the user';
    
    // Save changes
    const updatedJob = await this.ingestionJobRepository.save(job);
    
    return this.mapToResponseDto(updatedJob);
  }
  
  /**
   * Retries a failed ingestion job manually
   * @param id The ID of the ingestion job to retry
   * @returns A response indicating success or failure
   */
  async retryIngestion(id: string): Promise<IngestionResponseDto> {
    this.logger.log(`Manually retrying ingestion job with ID: ${id}`);
    
    // Find the job in the database
    const job = await this.ingestionJobRepository.findOne({ where: { id } });
    
    if (!job) {
      throw new NotFoundException(`Ingestion job with ID "${id}" not found`);
    }
    
    // Only allow retrying if the job has failed
    if (job.status !== IngestionStatus.FAILED) {
      throw new BadRequestException(`Cannot retry ingestion job with status "${job.status}". Only failed jobs can be retried.`);
    }
    
    // Reset retry counter if the retry was manual
    job.retryAttempts = 0;
    job.status = IngestionStatus.PENDING;
    job.message = 'Ingestion job has been queued for retry';
    job.lastRetryTime = new Date();
    
    // Save changes
    const updatedJob = await this.ingestionJobRepository.save(job);
    
    // Start the processing as a background task
    this.processIngestionAsync(updatedJob.id);
    
    return this.mapToResponseDto(updatedJob);
  }
  
  /**
   * Performs batch ingestion of multiple items
   * @param requests Array of ingestion requests
   * @returns Array of responses for each ingestion request
   */
  async batchIngestion(requests: IngestionRequestDto[], userId?: string): Promise<IngestionResponseDto[]> {
    this.logger.log(`Starting batch ingestion of ${requests.length} items`);
    
    const responses: IngestionResponseDto[] = [];
    
    // Process each request and collect responses
    for (const request of requests) {
      const response = await this.triggerIngestion(request, userId);
      responses.push(response);
    }
    
    this.logger.log(`Completed batch ingestion processing`);
    return responses;
  }
  
  /**
   * Helper to map an entity to a response DTO
   */
  private mapToResponseDto(job: IngestionJob): IngestionResponseDto {
    return {
      id: job.id,
      name: job.name,
      description: job.description,
      type: job.type,
      status: job.status,
      message: job.message,
      documentId: job.documentId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      metadata: job.metadata,
      retryAttempts: job.retryAttempts,
      lastErrorMessage: job.lastErrorMessage,
      lastRetryTime: job.lastRetryTime,
      errorDetails: job.errorDetails,
    };
  }
  
  /**
   * Process an ingestion asynchronously
   * In a real-world app, this would likely use a job queue like Bull
   */
  private async processIngestionAsync(id: string): Promise<void> {
    try {
      // Fetch the job from database
      const job = await this.ingestionJobRepository.findOne({ where: { id } });
      
      if (!job) {
        this.logger.error(`Ingestion job with ID ${id} not found during processing`);
        return;
      }
      
      // Update status to processing
      job.status = IngestionStatus.PROCESSING;
      job.message = this.getMessageForStatus(IngestionStatus.PROCESSING);
      await this.ingestionJobRepository.save(job);
      
      // Simulate processing time (in a real app, this would be actual processing)
      const processingTime = Math.random() * 5000 + 2000; // 2-7 seconds
      await this.delay(processingTime);
      
      // Simulate processing result (success or error)
      await this.simulateProcessingResult(job);
      
      this.logger.log(`Background processing of ingestion ${id} completed after ${processingTime/1000} seconds`);
      
    } catch (error) {
      this.logger.error(`Error in processIngestionAsync for job ${id}: ${error.message}`);
      
      // Try to update the job to failed status in case of unexpected errors
      try {
        const job = await this.ingestionJobRepository.findOne({ where: { id } });
        if (job) {
          job.status = IngestionStatus.FAILED;
          job.message = `Unexpected error during processing: ${error.message}`;
          job.lastErrorMessage = error.message;
          job.errorDetails = { 
            stack: error.stack,
            timestamp: new Date().toISOString() 
          };
          await this.ingestionJobRepository.save(job);
        }
      } catch (dbError) {
        this.logger.error(`Failed to update job status after error: ${dbError.message}`);
      }
    }
  }
  
  /**
   * Simulate processing result with potential failures and retry logic
   */
  private async simulateProcessingResult(job: IngestionJob): Promise<void> {
    // In a real app, you would have actual logic that could fail
    // For simulation, we'll use random success/failure with error types
    const rand = Math.random();
    
    // 70% success, 30% failure for simulation
    const success = rand > 0.3;
    
    if (success) {
      // Success case
      job.status = IngestionStatus.COMPLETED;
      job.message = this.getMessageForStatus(IngestionStatus.COMPLETED);
      
      // If it's a document type, generate a mock document ID
      if (job.type === IngestionType.DOCUMENT) {
        job.documentId = `doc-${Math.random().toString(36).substring(2, 10)}`;
      }
      
      await this.ingestionJobRepository.save(job);
    } else {
      // Failure case - categorize the error
      const errorCategory = this.getSimulatedErrorCategory();
      const errorMessage = this.getSimulatedErrorMessage(errorCategory);
      
      // Record the error details
      job.lastErrorMessage = errorMessage;
      job.errorDetails = {
        category: errorCategory,
        timestamp: new Date().toISOString(),
        details: `Simulated error during processing of ${job.type} ingestion`,
      };
      
      // Check if we should retry based on error category and retry attempts
      const shouldRetry = this.shouldRetryError(errorCategory, job.retryAttempts);
      
      if (shouldRetry) {
        // Update for retry
        job.retryAttempts += 1;
        job.lastRetryTime = new Date();
        job.status = IngestionStatus.RETRYING;
        job.message = `Retrying ingestion (attempt ${job.retryAttempts} of ${this.retryConfig.maxRetries})`;
        
        await this.ingestionJobRepository.save(job);
        
        // Schedule retry with exponential backoff
        const delayMs = this.calculateRetryDelay(job.retryAttempts);
        this.logger.log(`Scheduling retry for job ${job.id} in ${delayMs}ms (attempt ${job.retryAttempts})`);
        
        setTimeout(() => {
          this.processIngestionAsync(job.id)
            .catch(e => this.logger.error(`Error in retry for job ${job.id}: ${e.message}`));
        }, delayMs);
      } else {
        // No more retries, mark as failed
        job.status = IngestionStatus.FAILED;
        job.message = `Ingestion failed after ${job.retryAttempts} retry attempts: ${errorMessage}`;
        
        await this.ingestionJobRepository.save(job);
      }
    }
  }
  
  /**
   * Determine if an error should be retried based on its category and attempt count
   */
  private shouldRetryError(category: ErrorCategory, attempts: number): boolean {
    // Don't retry if we've reached the maximum attempts
    if (attempts >= this.retryConfig.maxRetries) {
      return false;
    }
    
    // Always retry transient and unknown errors
    if (category === ErrorCategory.TRANSIENT || category === ErrorCategory.UNKNOWN) {
      return true;
    }
    
    // Never retry permanent errors
    return false;
  }
  
  /**
   * Calculate the delay before the next retry using exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    if (!this.retryConfig.exponentialBackoff) {
      return this.retryConfig.baseDelayMs;
    }
    
    // Exponential backoff: baseDelay * 2^attempt with jitter
    const exponentialDelay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
    
    // Cap at maxDelayMs
    return Math.min(exponentialDelay + jitter, this.retryConfig.maxDelayMs);
  }
  
  /**
   * For simulation purposes, randomly select an error category
   */
  private getSimulatedErrorCategory(): ErrorCategory {
    const rand = Math.random();
    
    if (rand < 0.6) {
      return ErrorCategory.TRANSIENT; // 60% transient errors (retryable)
    } else if (rand < 0.9) {
      return ErrorCategory.PERMANENT; // 30% permanent errors (not retryable)
    } else {
      return ErrorCategory.UNKNOWN;   // 10% unknown errors (retryable)
    }
  }
  
  /**
   * Generate simulated error messages based on category
   */
  private getSimulatedErrorMessage(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.TRANSIENT:
        const transientErrors = [
          'Connection timed out',
          'Service temporarily unavailable',
          'Rate limit exceeded',
          'Database connection error',
          'Network connectivity issue',
        ];
        return transientErrors[Math.floor(Math.random() * transientErrors.length)];
        
      case ErrorCategory.PERMANENT:
        const permanentErrors = [
          'Invalid document format',
          'Authorization failed',
          'Resource not found',
          'Unsupported file type',
          'Malformed content structure',
        ];
        return permanentErrors[Math.floor(Math.random() * permanentErrors.length)];
        
      case ErrorCategory.UNKNOWN:
      default:
        const unknownErrors = [
          'Unexpected processing error',
          'Internal server error',
          'Undefined exception occurred',
          'Service unavailable',
          'Unknown parsing error',
        ];
        return unknownErrors[Math.floor(Math.random() * unknownErrors.length)];
    }
  }
  
  /**
   * Helper method to get a message for a given status
   */
  private getMessageForStatus(status: IngestionStatus): string {
    switch (status) {
      case IngestionStatus.PENDING:
        return 'Ingestion job is pending processing';
      case IngestionStatus.PROCESSING:
        return 'Ingestion job is currently being processed';
      case IngestionStatus.RETRYING:
        return 'Ingestion job is being retried after a failure';
      case IngestionStatus.COMPLETED:
        return 'Ingestion job has been successfully completed';
      case IngestionStatus.FAILED:
        return 'Ingestion job failed to process';
      default:
        return 'Unknown status';
    }
  }
  
  /**
   * Helper method to simulate async delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
