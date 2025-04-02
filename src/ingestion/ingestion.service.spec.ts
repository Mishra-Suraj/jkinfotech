import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IngestionType, SourceType, IngestionStatus } from './dto/ingestion-request.dto';
import { UserRole } from '../entities/user.entity';

// Create a mock implementation of the service
const mockIngestionService = {
  createIngestionJob: jest.fn(),
  findAllJobs: jest.fn(),
  findOneJob: jest.fn(),
  cancelJob: jest.fn(),
  processFileIngestion: jest.fn(),
  processApiIngestion: jest.fn(),
};

// Mock the actual service module
jest.mock('./ingestion.service', () => ({
  IngestionService: jest.fn().mockImplementation(() => mockIngestionService)
}));

// Import after mocking to get the mock
import { IngestionService } from './ingestion.service';

describe('IngestionService', () => {
  let service: IngestionService;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [IngestionService],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createIngestionJob', () => {
    it('should create an ingestion job successfully', async () => {
      const userId = 'user-id';
      const ingestionRequest = {
        name: 'Test Ingestion',
        type: IngestionType.DOCUMENT,
        content: 'Sample content data',
        sourceType: SourceType.FILE,
        sourceLocation: '/path/to/file.pdf',
        processingOptions: {
          extractText: true,
          extractMetadata: true,
        },
        targetOptions: {
          saveToDatabase: true,
          generatePreview: true,
        },
      };
      
      const newJob = {
        id: 'job-id',
        name: ingestionRequest.name,
        type: ingestionRequest.type,
        content: ingestionRequest.content,
        sourceType: ingestionRequest.sourceType,
        sourceLocation: ingestionRequest.sourceLocation,
        processingOptions: ingestionRequest.processingOptions,
        targetOptions: ingestionRequest.targetOptions,
        status: IngestionStatus.PENDING,
        userId,
        message: 'Ingestion job created and pending processing',
        retryAttempts: 0,
      };
      
      mockIngestionService.createIngestionJob.mockResolvedValue(newJob);
      
      const result = await service.createIngestionJob(ingestionRequest, userId);
      
      expect(result).toEqual(newJob);
      expect(mockIngestionService.createIngestionJob).toHaveBeenCalledWith(ingestionRequest, userId);
    });
    
    it('should throw BadRequestException when source file does not exist', async () => {
      const userId = 'user-id';
      const ingestionRequest = {
        name: 'Test Ingestion',
        type: IngestionType.DOCUMENT,
        content: 'Sample content data',
        sourceType: SourceType.FILE,
        sourceLocation: '/path/to/nonexistent/file.pdf',
        processingOptions: {},
        targetOptions: {},
      };
      
      mockIngestionService.createIngestionJob.mockRejectedValue(new BadRequestException());
      
      await expect(service.createIngestionJob(ingestionRequest, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllJobs', () => {
    it('should return all ingestion jobs for a user', async () => {
      const userId = 'user-id';
      const mockJobs = [
        { id: 'job1', status: IngestionStatus.COMPLETED },
        { id: 'job2', status: IngestionStatus.PROCESSING },
      ];
      
      mockIngestionService.findAllJobs.mockResolvedValue(mockJobs);
      
      const result = await service.findAllJobs({ userId });
      
      expect(result).toEqual(mockJobs);
      expect(mockIngestionService.findAllJobs).toHaveBeenCalledWith({ userId });
    });
    
    it('should filter jobs by status when provided', async () => {
      const filters = {
        userId: 'user-id',
        status: IngestionStatus.COMPLETED,
      };
      
      const mockJobs = [{ id: 'job1', status: IngestionStatus.COMPLETED }];
      mockIngestionService.findAllJobs.mockResolvedValue(mockJobs);
      
      const result = await service.findAllJobs(filters);
      
      expect(result).toEqual(mockJobs);
      expect(mockIngestionService.findAllJobs).toHaveBeenCalledWith(filters);
    });
  });

  describe('findOneJob', () => {
    it('should return a job by id', async () => {
      const jobId = 'job-id';
      const userId = 'user-id';
      
      const job = {
        id: jobId,
        status: IngestionStatus.COMPLETED,
        userId
      };

      mockIngestionService.findOneJob.mockResolvedValue(job);

      const result = await service.findOneJob(jobId, userId);

      expect(result).toEqual(job);
      expect(mockIngestionService.findOneJob).toHaveBeenCalledWith(jobId, userId);
    });

    it('should throw NotFoundException when job not found', async () => {
      const jobId = 'non-existent-job';
      const userId = 'user-id';

      mockIngestionService.findOneJob.mockRejectedValue(new NotFoundException());

      await expect(service.findOneJob(jobId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelJob', () => {
    it('should cancel a job successfully', async () => {
      const jobId = 'job-id';
      const userId = 'user-id';
      
      const updatedJob = {
        id: jobId,
        status: 'cancelled',
        message: 'Job cancelled by user',
        userId
      };
      
      mockIngestionService.cancelJob.mockResolvedValue(updatedJob);

      const result = await service.cancelJob(jobId, userId);

      expect(result).toEqual(updatedJob);
      expect(mockIngestionService.cancelJob).toHaveBeenCalledWith(jobId, userId);
    });

    it('should throw NotFoundException when job not found', async () => {
      const jobId = 'non-existent-job';
      const userId = 'user-id';

      mockIngestionService.cancelJob.mockRejectedValue(new NotFoundException());

      await expect(service.cancelJob(jobId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when job is already completed', async () => {
      const jobId = 'completed-job';
      const userId = 'user-id';
      
      mockIngestionService.cancelJob.mockRejectedValue(new BadRequestException());

      await expect(service.cancelJob(jobId, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('processFileIngestion', () => {
    it('should process file ingestion successfully', async () => {
      // Create a mock IngestionJob with necessary properties
      const mockJob = {
        id: 'job-id',
        name: 'Test Ingestion',
        type: IngestionType.DOCUMENT,
        sourceType: SourceType.FILE,
        sourceLocation: '/path/to/file.pdf',
        processingOptions: {
          extractText: true,
        },
        targetOptions: {
          saveToDatabase: true,
        },
        status: IngestionStatus.PENDING,
        userId: 'user-id',
        retryAttempts: 0,
        message: 'Pending processing',
        description: 'Test description',
        documentId: null,
        content: 'File content data',
        metadata: { source: 'test' },
        user: { 
          id: 'user-id', 
          username: 'testuser', 
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashedpassword',
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          validatePassword: async () => true,
          hashPassword: async () => {}
        },
        lastErrorMessage: null,
        lastRetryTime: null,
        errorDetails: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Set up for job update
      const updatedJob = { 
        ...mockJob, 
        status: IngestionStatus.COMPLETED, 
        message: 'File ingestion completed successfully',
        documentId: 'doc-id'
      };
      
      mockIngestionService.processFileIngestion.mockResolvedValue(updatedJob);
      
      const result = await service.processFileIngestion(mockJob);
      
      expect(result).toEqual(updatedJob);
      expect(mockIngestionService.processFileIngestion).toHaveBeenCalledWith(mockJob);
    });
    
    it('should handle file not found error', async () => {
      // Create a mock IngestionJob with necessary properties
      const mockJob = {
        id: 'job-id',
        name: 'Test Ingestion',
        type: IngestionType.DOCUMENT,
        sourceType: SourceType.FILE,
        sourceLocation: '/path/to/missing-file.pdf',
        processingOptions: {},
        targetOptions: {},
        status: IngestionStatus.PENDING,
        userId: 'user-id',
        retryAttempts: 0,
        message: 'Pending processing',
        description: 'Test description',
        documentId: null,
        content: "content data",
        metadata: null,
        user: { 
          id: 'user-id', 
          username: 'testuser', 
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashedpassword',
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          validatePassword: async () => true,
          hashPassword: async () => {}
        },
        lastErrorMessage: null,
        lastRetryTime: null,
        errorDetails: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedJob = {
        ...mockJob,
        status: IngestionStatus.FAILED,
        message: 'File not found: /path/to/missing-file.pdf'
      };
      
      mockIngestionService.processFileIngestion.mockResolvedValue(updatedJob);

      const result = await service.processFileIngestion(mockJob);

      expect(result.status).toEqual(IngestionStatus.FAILED);
      expect(mockIngestionService.processFileIngestion).toHaveBeenCalledWith(mockJob);
    });
  });

  describe('processApiIngestion', () => {
    it('should process API ingestion successfully', async () => {
      // Create a mock IngestionJob with necessary properties
      const mockJob = {
        id: 'job-id',
        name: 'Test API Ingestion',
        type: IngestionType.API,
        sourceType: SourceType.API,
        sourceLocation: 'https://api.example.com/data',
        processingOptions: {
          extractMetadata: true,
        },
        targetOptions: {
          saveToDatabase: true,
        },
        status: IngestionStatus.PENDING,
        userId: 'user-id',
        retryAttempts: 0,
        message: 'Pending processing',
        description: 'Test API description',
        documentId: null,
        content: 'API content data',
        metadata: { source: 'api' },
        user: { 
          id: 'user-id', 
          username: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashedpassword',
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          validatePassword: async () => true,
          hashPassword: async () => {}
        },
        lastErrorMessage: null,
        lastRetryTime: null,
        errorDetails: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Set up for job update
      const updatedJob = { 
        ...mockJob, 
        status: IngestionStatus.COMPLETED, 
        message: 'API ingestion completed successfully',
        documentId: 'api-doc-id'
      };
      
      mockIngestionService.processApiIngestion.mockResolvedValue(updatedJob);
      
      const result = await service.processApiIngestion(mockJob);
      
      expect(result).toEqual(updatedJob);
      expect(mockIngestionService.processApiIngestion).toHaveBeenCalledWith(mockJob);
    });
    
    it('should handle API request error', async () => {
      // Create a mock IngestionJob with necessary properties
      const mockJob = {
        id: 'job-id',
        name: 'Test API Ingestion',
        type: IngestionType.API,
        sourceType: SourceType.API,
        sourceLocation: 'https://api.example.com/error',
        processingOptions: {},
        targetOptions: {},
        status: IngestionStatus.PENDING,
        userId: 'user-id',
        retryAttempts: 0,
        message: 'Pending processing',
        description: 'Test API description',
        documentId: null,
        content: "API content data",
        metadata: null,
        user: { 
          id: 'user-id', 
          username: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashedpassword',
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          validatePassword: async () => true,
          hashPassword: async () => {}
        },
        lastErrorMessage: null,
        lastRetryTime: null,
        errorDetails: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedJob = {
        ...mockJob,
        status: IngestionStatus.FAILED,
        message: 'API request failed: Error: API request failed'
      };
      
      mockIngestionService.processApiIngestion.mockResolvedValue(updatedJob);

      const result = await service.processApiIngestion(mockJob);

      expect(result.status).toEqual(IngestionStatus.FAILED);
      expect(mockIngestionService.processApiIngestion).toHaveBeenCalledWith(mockJob);
    });
  });
});
