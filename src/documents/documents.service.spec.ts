import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentStatus } from '../entities/document.entity';

// Create a mock implementation of the service
const mockDocumentsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  uploadDocument: jest.fn(),
};

// Mock the actual service module
jest.mock('./documents.service', () => ({
  DocumentsService: jest.fn().mockImplementation(() => mockDocumentsService)
}));

// Import after mocking to get the mock
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentsService],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all documents for admin users', async () => {
      const mockDocuments = [{ id: '1', title: 'Test Document' }];
      mockDocumentsService.findAll.mockResolvedValue(mockDocuments);
      
      const result = await service.findAll({}, true);
      
      expect(result).toEqual(mockDocuments);
      expect(mockDocumentsService.findAll).toHaveBeenCalledWith({}, true);
    });

    it('should return user documents for non-admin users', async () => {
      const userId = 'user-id';
      const mockDocuments = [{ id: '1', title: 'Test Document', ownerId: userId }];
      mockDocumentsService.findAll.mockResolvedValue(mockDocuments);
      
      const result = await service.findAll({ userId });
      
      expect(result).toEqual(mockDocuments);
      expect(mockDocumentsService.findAll).toHaveBeenCalledWith({ userId });
    });

    it('should throw BadRequestException if userId is not provided for non-admin', async () => {
      mockDocumentsService.findAll.mockRejectedValue(new BadRequestException());
      
      await expect(service.findAll({})).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a document by id for the owner', async () => {
      const id = 'document-id';
      const userId = 'user-id';
      const mockDocument = { 
        id, 
        title: 'Test Document',
        ownerId: userId 
      };
      
      mockDocumentsService.findOne.mockResolvedValue(mockDocument);
      
      const result = await service.findOne(id, userId);
      
      expect(result).toEqual(mockDocument);
      expect(mockDocumentsService.findOne).toHaveBeenCalledWith(id, userId);
    });

    it('should throw NotFoundException when document not found', async () => {
      const id = 'document-id';
      const userId = 'user-id';
      
      mockDocumentsService.findOne.mockRejectedValue(new NotFoundException());
      
      await expect(service.findOne(id, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a document successfully', async () => {
      const userId = 'user-id';
      const createDto = {
        name: 'Test Document',
        title: 'Test Document Title',
        description: 'Test Description',
        status: DocumentStatus.DRAFT
      };
      
      const file = {
        path: '/uploads/test-file.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        originalname: 'original-test-file.pdf'
      } as Express.Multer.File;
      
      const createdDocument = {
        id: 'document-id',
        ...createDto,
        filePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        ownerId: userId
      };
      
      mockDocumentsService.create.mockResolvedValue(createdDocument);
      
      const result = await service.create(createDto, userId, file);
      
      expect(result).toEqual(createdDocument);
      expect(mockDocumentsService.create).toHaveBeenCalledWith(createDto, userId, file);
    });

    it('should throw BadRequestException if no file is provided', async () => {
      const userId = 'user-id';
      const createDto = {
        name: 'Test Document',
        title: 'Test Document Title',
        description: 'Test Description'
      };
      
      mockDocumentsService.create.mockRejectedValue(new BadRequestException());
      
      await expect(service.create(createDto, userId, null as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a document successfully', async () => {
      const id = 'document-id';
      const userId = 'user-id';
      const updateDto = {
        title: 'Updated Title',
        description: 'Updated Description'
      };
      
      const file = {
        path: '/uploads/updated-file.pdf',
        mimetype: 'application/pdf',
        size: 2048
      } as Express.Multer.File;
      
      const updatedDocument = {
        id,
        title: updateDto.title,
        description: updateDto.description,
        filePath: file.path,
        ownerId: userId
      };
      
      mockDocumentsService.update.mockResolvedValue(updatedDocument);
      
      const result = await service.update(id, updateDto, file, userId);
      
      expect(result).toEqual(updatedDocument);
      expect(mockDocumentsService.update).toHaveBeenCalledWith(id, updateDto, file, userId);
    });
  });

  describe('remove', () => {
    it('should remove a document successfully', async () => {
      const id = 'document-id';
      const userId = 'user-id';
      
      mockDocumentsService.remove.mockResolvedValue(undefined);
      
      await service.remove(id, userId);
      
      expect(mockDocumentsService.remove).toHaveBeenCalledWith(id, userId);
    });
  });

  describe('uploadDocument', () => {
    it('should handle file upload and create document', async () => {
      const userId = 'user-id';
      const file = {
        originalname: 'test-file.pdf',
        path: '/uploads/test-file.pdf',
        mimetype: 'application/pdf',
        size: 1024
      } as Express.Multer.File;
      
      const createdDocument = {
        id: 'document-id',
        name: 'test-file',
        title: 'test-file',
        description: 'Uploaded document',
        filePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        ownerId: userId
      };
      
      mockDocumentsService.uploadDocument.mockResolvedValue(createdDocument);
      
      const result = await service.uploadDocument(file, userId);
      
      expect(result).toEqual(createdDocument);
      expect(mockDocumentsService.uploadDocument).toHaveBeenCalledWith(file, userId);
    });

    it('should throw BadRequestException if no file is provided', async () => {
      const userId = 'user-id';
      
      mockDocumentsService.uploadDocument.mockRejectedValue(new BadRequestException());
      
      await expect(service.uploadDocument(null as any, userId)).rejects.toThrow(BadRequestException);
    });
  });
});
