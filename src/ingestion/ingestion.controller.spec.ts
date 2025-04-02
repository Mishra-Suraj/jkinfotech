import { Test, TestingModule } from '@nestjs/testing';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { IngestionRequestDto, IngestionStatus, IngestionType, SourceType } from './dto/ingestion-request.dto';
import { IngestionResponseDto } from './dto/ingestion-response.dto';
import { UserRole } from '../entities/user.entity';

describe('IngestionController', () => {
  let controller: IngestionController;
  let service: IngestionService;

  const mockIngestionService = {
    triggerIngestion: jest.fn(),
    getIngestionStatus: jest.fn(),
    cancelIngestion: jest.fn(),
    retryIngestion: jest.fn(),
    batchIngestion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [
        {
          provide: IngestionService,
          useValue: mockIngestionService,
        },
      ],
    }).compile();

    controller = module.get<IngestionController>(IngestionController);
    service = module.get<IngestionService>(IngestionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('triggerIngestion', () => {
    it('should trigger an ingestion job', async () => {
      const requestDto: IngestionRequestDto = {
        name: 'Test Ingestion',
        type: IngestionType.DOCUMENT,
        content: 'Sample content data',
        sourceType: SourceType.FILE,
        sourceLocation: '/path/to/file.pdf',
        processingOptions: { extractText: true },
        targetOptions: { saveToDatabase: true }
      };

      const mockUser = { id: 'user-id', role: UserRole.EDITOR };
      const mockRequest = { user: mockUser };
      
      const expectedResponse: IngestionResponseDto = {
        id: 'job-id',
        name: 'Test Ingestion',
        type: IngestionType.DOCUMENT,
        status: IngestionStatus.PENDING,
        message: 'Ingestion job is pending processing',
        userId: 'user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryAttempts: 0
      };

      mockIngestionService.triggerIngestion.mockResolvedValue(expectedResponse);
      expect(await controller.triggerIngestion(requestDto, mockRequest)).toBe(expectedResponse);
      expect(mockIngestionService.triggerIngestion).toHaveBeenCalledWith(requestDto, mockUser.id);
    });

    it('should re-throw error from ingestionService.triggerIngestion', async () => {
      const requestDto: IngestionRequestDto = { name: 'Test Ingestion', type: IngestionType.DOCUMENT, content: 'Sample content data', sourceType: SourceType.FILE, sourceLocation: '/path/to/file.pdf', processingOptions: { extractText: true }, targetOptions: { saveToDatabase: true } };
      const mockUser = { id: 'user-id', role: UserRole.EDITOR };
      const mockRequest = { user: mockUser };
      const expectedError = new Error('Ingestion trigger failed');
      mockIngestionService.triggerIngestion.mockRejectedValue(expectedError);
      await expect(controller.triggerIngestion(requestDto, mockRequest)).rejects.toThrow(expectedError);
    });
  });

  describe('getIngestionStatus', () => {
    it('should return the status of an ingestion job', async () => {
      const jobId = 'job-id';
      const expectedResponse: IngestionResponseDto = {
        id: jobId,
        name: 'Test Ingestion',
        type: IngestionType.DOCUMENT,
        status: IngestionStatus.PROCESSING,
        message: 'Ingestion job is currently being processed',
        userId: 'user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryAttempts: 0
      };

      mockIngestionService.getIngestionStatus.mockResolvedValue(expectedResponse);

      expect(await controller.getIngestionStatus(jobId)).toBe(expectedResponse);
      expect(mockIngestionService.getIngestionStatus).toHaveBeenCalledWith(jobId);
    });

    it('should re-throw error from ingestionService.getIngestionStatus', async () => {
      const jobId = 'job-id';
      const expectedError = new Error('Get ingestion status failed');
      mockIngestionService.getIngestionStatus.mockRejectedValue(expectedError);
      await expect(controller.getIngestionStatus(jobId)).rejects.toThrow(expectedError);
    });
  });

  describe('cancelIngestion', () => {
    it('should cancel an ingestion job', async () => {
      const jobId = 'job-id';
      const expectedResponse: IngestionResponseDto = {
        id: jobId,
        name: 'Test Ingestion',
        type: IngestionType.DOCUMENT,
        status: IngestionStatus.FAILED,
        message: 'Ingestion job was canceled by the user',
        userId: 'user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryAttempts: 0
      };

      mockIngestionService.cancelIngestion.mockResolvedValue(expectedResponse);

      expect(await controller.cancelIngestion(jobId)).toBe(expectedResponse);
      expect(mockIngestionService.cancelIngestion).toHaveBeenCalledWith(jobId);
    });

    it('should re-throw error from ingestionService.cancelIngestion', async () => {
      const jobId = 'job-id';
      const expectedError = new Error('Cancel ingestion failed');
      mockIngestionService.cancelIngestion.mockRejectedValue(expectedError);
      await expect(controller.cancelIngestion(jobId)).rejects.toThrow(expectedError);
    });
  });

  describe('retryIngestion', () => {
    it('should retry a failed ingestion job', async () => {
      const jobId = 'job-id';
      const expectedResponse: IngestionResponseDto = {
        id: 'new-job-id',
        name: 'Test Ingestion',
        type: IngestionType.DOCUMENT,
        status: IngestionStatus.PENDING,
        message: 'Ingestion job is pending processing',
        userId: 'user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryAttempts: 0
      };

      mockIngestionService.retryIngestion.mockResolvedValue(expectedResponse);

      expect(await controller.retryIngestion(jobId)).toBe(expectedResponse);
      expect(mockIngestionService.retryIngestion).toHaveBeenCalledWith(jobId);
    });

    it('should re-throw error from ingestionService.retryIngestion', async () => {
      const jobId = 'job-id';
      const expectedError = new Error('Retry ingestion failed');
      mockIngestionService.retryIngestion.mockRejectedValue(expectedError);
      await expect(controller.retryIngestion(jobId)).rejects.toThrow(expectedError);
    });
  });

  describe('batchIngestion', () => {
    it('should process multiple ingestion requests', async () => {
      const requestDtos: IngestionRequestDto[] = [
        {
          name: 'Batch Job 1',
          type: IngestionType.DOCUMENT,
          content: 'Sample content 1',
          sourceType: SourceType.FILE,
          sourceLocation: '/path/to/file1.pdf',
          processingOptions: { extractText: true },
          targetOptions: { saveToDatabase: true }
        },
        {
          name: 'Batch Job 2',
          type: IngestionType.API,
          content: 'Sample content 2',
          sourceType: SourceType.API,
          sourceLocation: 'https://api.example.com/data',
          processingOptions: { parseJson: true },
          targetOptions: { saveToDatabase: true }
        },
      ];

      const mockUser = { id: 'user-id', role: UserRole.EDITOR };
      const mockRequest = { user: mockUser };
      
      const expectedResponses: IngestionResponseDto[] = [
        {
          id: 'job-id-1',
          name: 'Batch Job 1',
          type: IngestionType.DOCUMENT,
          status: IngestionStatus.PENDING,
          message: 'Ingestion job is pending processing',
          userId: 'user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          retryAttempts: 0
        },
        {
          id: 'job-id-2',
          name: 'Batch Job 2',
          type: IngestionType.API,
          status: IngestionStatus.PENDING,
          message: 'Ingestion job is pending processing',
          userId: 'user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          retryAttempts: 0
        },
      ];

      mockIngestionService.batchIngestion.mockResolvedValue(expectedResponses);
      expect(await controller.batchIngestion(requestDtos, mockRequest)).toBe(expectedResponses);
      expect(mockIngestionService.batchIngestion).toHaveBeenCalledWith(requestDtos, mockUser.id);
    });

    it('should re-throw error from ingestionService.batchIngestion', async () => {
      const requestDtos: IngestionRequestDto[] = [{ name: 'Batch Job 1', type: IngestionType.DOCUMENT, content: 'Sample content 1', sourceType: SourceType.FILE, sourceLocation: '/path/to/file1.pdf', processingOptions: { extractText: true }, targetOptions: { saveToDatabase: true } }];
      const mockUser = { id: 'user-id', role: UserRole.EDITOR };
      const mockRequest = { user: mockUser };
      const expectedError = new Error('Batch ingestion failed');
      mockIngestionService.batchIngestion.mockRejectedValue(expectedError);
      await expect(controller.batchIngestion(requestDtos, mockRequest)).rejects.toThrow(expectedError);
    });
  });
});
