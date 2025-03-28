import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IngestionJob } from '../entities/ingestion-job.entity';
import { User } from '../entities/user.entity';
import { Document } from '../entities/document.entity';
import { IngestionRequestDto, IngestionType, SourceType, IngestionStatus } from './dto/ingestion-request.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

jest.mock('fs');
jest.mock('path');
jest.mock('axios');

describe('IngestionService', () => {
  let service: IngestionService;
  let ingestionJobRepository;
  let userRepository;
  let documentRepository;

  const mockIngestionJobRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    })),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockDocumentRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: getRepositoryToken(IngestionJob),
          useValue: mockIngestionJobRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    ingestionJobRepository = module.get(getRepositoryToken(IngestionJob));
    userRepository = module.get(getRepositoryToken(User));
    documentRepository = module.get(getRepositoryToken(Document));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createIngestionJob', () => {
    it('should create an ingestion job successfully', async () => {
      const userId = 'user-id';
      const ingestionRequest: IngestionRequestDto = {
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
      
      const user = { id: userId, name: 'Test User' };
      mockUserRepository.findOne.mockResolvedValue(user);
      
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
      
      mockIngestionJobRepository.create.mockReturnValue(newJob);
      mockIngestionJobRepository.save.mockResolvedValue(newJob);
      
      const result = await service.createIngestionJob(ingestionRequest, userId);
      
      expect(result).toEqual(newJob);
      expect(mockIngestionJobRepository.create).toHaveBeenCalledWith({
        name: ingestionRequest.name,
        description: ingestionRequest.description,
        type: ingestionRequest.type,
        status: IngestionStatus.PENDING,
        message: 'Ingestion job created and pending processing',
        documentId: null,
        userId: userId,
        content: ingestionRequest.content,
        metadata: ingestionRequest.metadata,
        sourceType: ingestionRequest.sourceType,
        sourceLocation: ingestionRequest.sourceLocation,
        processingOptions: ingestionRequest.processingOptions,
        targetOptions: ingestionRequest.targetOptions,
        retryAttempts: 0,
      });
      expect(mockIngestionJobRepository.save).toHaveBeenCalledWith(newJob);
    });
    
    it('should throw BadRequestException when user not found', async () => {
      const userId = 'non-existent-user';
      const ingestionRequest = {
        name: 'Test Ingestion',
        type: IngestionType.DOCUMENT,
        content: 'Sample content data',
        sourceType: SourceType.FILE,
        sourceLocation: '/path/to/file.pdf',
        processingOptions: {},
        targetOptions: {},
      } as IngestionRequestDto;
      
      // Mock file not existing
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
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
      
      const queryBuilder = ingestionJobRepository.createQueryBuilder();
      queryBuilder.getMany.mockResolvedValue(mockJobs);
      
      const result = await service.findAllJobs({ userId });
      
      expect(result).toEqual(mockJobs);
      expect(queryBuilder.where).toHaveBeenCalledWith('job.userId = :userId', { userId });
    });
    
    it('should filter jobs by status when provided', async () => {
      const filters = {
        userId: 'user-id',
        status: IngestionStatus.COMPLETED,
      };
      
      const mockJobs = [{ id: 'job1', status: IngestionStatus.COMPLETED }];
      const queryBuilder = ingestionJobRepository.createQueryBuilder();
      queryBuilder.getMany.mockResolvedValue(mockJobs);
      
      const result = await service.findAllJobs(filters);
      
      expect(result).toEqual(mockJobs);
      expect(queryBuilder.where).toHaveBeenCalledWith('job.userId = :userId', { userId: filters.userId });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('job.status = :status', { status: filters.status });
    });
  });

  describe('findOneJob', () => {
    it('should return a job by id', async () => {
      const jobId = 'job-id';
      const userId = 'user-id';
      
      const job = {
        id: jobId,
        status: 'COMPLETED',
        user: { id: userId },
      };

      const queryBuilder = ingestionJobRepository.createQueryBuilder();
      queryBuilder.getOne.mockResolvedValue(job);

      const result = await service.findOneJob(jobId, userId);

      expect(result).toEqual(job);
      expect(queryBuilder.where).toHaveBeenCalledWith('job.id = :id', { id: jobId });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('job.user.id = :userId', { userId });
    });

    it('should throw NotFoundException when job not found', async () => {
      const jobId = 'non-existent-job';
      const userId = 'user-id';

      const queryBuilder = ingestionJobRepository.createQueryBuilder();
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOneJob(jobId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelJob', () => {
    it('should cancel a job successfully', async () => {
      const jobId = 'job-id';
      const userId = 'user-id';
      
      const job = {
        id: jobId,
        status: 'PROCESSING',
        user: { id: userId },
      };

      const queryBuilder = ingestionJobRepository.createQueryBuilder();
      queryBuilder.getOne.mockResolvedValue(job);
      
      mockIngestionJobRepository.save.mockResolvedValue({
        ...job,
        status: 'CANCELLED',
      });

      const result = await service.cancelJob(jobId, userId);

      expect(result).toEqual({
        ...job,
        status: 'CANCELLED',
      });
      expect(queryBuilder.where).toHaveBeenCalledWith('job.id = :id', { id: jobId });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('job.user.id = :userId', { userId });
    });

    it('should throw NotFoundException when job not found', async () => {
      const jobId = 'non-existent-job';
      const userId = 'user-id';

      const queryBuilder = ingestionJobRepository.createQueryBuilder();
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(service.cancelJob(jobId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when job is already completed', async () => {
      const jobId = 'completed-job';
      const userId = 'user-id';
      
      const job = {
        id: jobId,
        status: 'COMPLETED',
        user: { id: userId },
      };

      const queryBuilder = ingestionJobRepository.createQueryBuilder();
      queryBuilder.getOne.mockResolvedValue(job);

      await expect(service.cancelJob(jobId, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('processFileIngestion', () => {
    it('should process file ingestion successfully', async () => {
      // Create a new job without type casting
      const job = new IngestionJob();
      job.id = 'job-id';
      job.name = 'Test Ingestion';
      job.description = 'Test Description';
      job.type = IngestionType.DOCUMENT;
      job.content = 'Sample content data';
      job.sourceType = SourceType.FILE;
      job.sourceLocation = '/path/to/file.pdf';
      job.processingOptions = {
        extractText: true,
        extractMetadata: true,
      };
      job.targetOptions = {
        saveToDatabase: true,
      };
      job.status = IngestionStatus.PENDING;
      job.message = 'Pending processing';
      job.userId = 'user-id';
      job.user = { id: 'user-id' } as User;
      job.documentId = null;
      job.retryAttempts = 0;
      job.lastErrorMessage = null;
      job.errorDetails = null;
      job.metadata = null;
      job.lastRetryTime = null;
      job.createdAt = new Date();
      job.updatedAt = new Date();
      
      // Mock file operations
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test file content'));
      
      // Set up for job update
      const updatedJob = { 
        ...job, 
        status: IngestionStatus.COMPLETED, 
        message: 'File ingestion completed successfully',
        documentId: 'doc-123'
      };
      
      mockIngestionJobRepository.save.mockResolvedValue(updatedJob);
      
      const result = await service.processFileIngestion(job);
      
      expect(result).toEqual(updatedJob);
      expect(fs.existsSync).toHaveBeenCalledWith(job.sourceLocation);
      expect(mockIngestionJobRepository.save).toHaveBeenCalled();
    });
    
    it('should handle file not found error', async () => {
      // Create a new job without type casting
      const job = new IngestionJob();
      job.id = 'job-id';
      job.name = 'Test Ingestion';
      job.description = 'Test Description';
      job.type = IngestionType.DOCUMENT;
      job.content = 'Sample content data';
      job.sourceType = SourceType.FILE;
      job.sourceLocation = '/path/to/missing-file.pdf';
      job.processingOptions = {};
      job.targetOptions = {};
      job.status = IngestionStatus.PENDING;
      job.message = 'Pending processing';
      job.userId = 'user-id';
      job.user = { id: 'user-id' } as User;
      job.documentId = null;
      job.retryAttempts = 0;
      job.lastErrorMessage = null;
      job.errorDetails = null;
      job.metadata = null;
      job.lastRetryTime = null;
      job.createdAt = new Date();
      job.updatedAt = new Date();

      // Mock file not existing
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const updatedJob = {
        ...job,
        status: IngestionStatus.FAILED,
        message: 'File ingestion failed: Error: File not found at location: /path/to/missing-file.pdf',
        lastErrorMessage: 'File not found at location: /path/to/missing-file.pdf',
      };
      
      mockIngestionJobRepository.save.mockResolvedValue(updatedJob);

      const result = await service.processFileIngestion(job);

      expect(result).toEqual(updatedJob);
      expect(fs.existsSync).toHaveBeenCalledWith(job.sourceLocation);
      expect(mockIngestionJobRepository.save).toHaveBeenCalled();
    });
  });

  describe('processApiIngestion', () => {
    it('should process API ingestion successfully', async () => {
      // Create a new job without type casting
      const job = new IngestionJob();
      job.id = 'job-id';
      job.name = 'Test API Ingestion';
      job.description = 'Test API Description';
      job.type = IngestionType.API;
      job.content = 'Sample content data';
      job.sourceType = SourceType.API;
      job.sourceLocation = 'https://api.example.com/data';
      job.processingOptions = {
        extractMetadata: true,
      };
      job.targetOptions = {
        saveToDatabase: true,
      };
      job.status = IngestionStatus.PENDING;
      job.message = 'Pending processing';
      job.userId = 'user-id';
      job.user = { id: 'user-id' } as User;
      job.retryAttempts = 0;
      job.documentId = null;
      job.lastErrorMessage = null;
      job.errorDetails = null;
      job.metadata = null;
      job.lastRetryTime = null;
      job.createdAt = new Date();
      job.updatedAt = new Date();
      
      // Set up for job update
      const updatedJob = { 
        ...job, 
        status: IngestionStatus.COMPLETED, 
        message: 'API ingestion completed successfully',
        documentId: 'api-doc-123'
      };
      
      mockIngestionJobRepository.save.mockResolvedValue(updatedJob);
      
      const result = await service.processApiIngestion(job);
      
      expect(result).toEqual(updatedJob);
      expect(mockIngestionJobRepository.save).toHaveBeenCalled();
    });
    
    it('should handle API request error', async () => {
      // Create a new job without type casting
      const job = new IngestionJob();
      job.id = 'job-id';
      job.name = 'Test API Ingestion';
      job.description = 'Test API Description';
      job.type = IngestionType.API;
      job.content = 'Sample content data';
      job.sourceType = SourceType.API;
      job.sourceLocation = 'https://api.example.com/error';
      job.processingOptions = {};
      job.targetOptions = {};
      job.status = IngestionStatus.PENDING;
      job.message = 'Pending processing';
      job.userId = 'user-id';
      job.user = { id: 'user-id' } as User;
      job.documentId = null;
      job.retryAttempts = 0;
      job.lastErrorMessage = null;
      job.errorDetails = null;
      job.metadata = null;
      job.lastRetryTime = null;
      job.createdAt = new Date();
      job.updatedAt = new Date();

      // Mock API error
      (axios.get as jest.Mock).mockRejectedValue(new Error('API request failed'));
      
      const updatedJob = {
        ...job,
        status: IngestionStatus.FAILED,
        message: 'API ingestion failed: Error: API request failed',
        lastErrorMessage: 'API request failed',
      };
      
      mockIngestionJobRepository.save.mockResolvedValue(updatedJob);

      const result = await service.processApiIngestion(job);

      expect(result).toEqual(updatedJob);
      expect(mockIngestionJobRepository.save).toHaveBeenCalled();
    });
  });
});
