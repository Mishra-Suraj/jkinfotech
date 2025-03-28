import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Document, DocumentStatus } from '../entities/document.entity';
import { User } from '../entities/user.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepository;
  let userRepository;

  const mockDocumentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    documentRepository = module.get(getRepositoryToken(Document));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new document successfully', async () => {
      const userId = 'user-id';
      const file = {
        originalname: 'test.pdf',
        path: '/path/to/file.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        fieldname: 'file',
        encoding: '7bit',
        destination: '/uploads',
        filename: 'test-uuid.pdf',
        stream: {} as any,
        buffer: Buffer.from('test'),
      };
      
      const createDocumentDto: CreateDocumentDto = {
        name: 'Test Document',
        title: 'Test Document',
        description: 'Test Description',
        status: DocumentStatus.DRAFT,
        tags: ['test', 'document'],
      };
      
      const user = { id: userId, name: 'Test User' };
      mockUserRepository.findOne.mockResolvedValue(user);
      
      const newDocument = {
        id: 'document-id',
        ...createDocumentDto,
        filePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        ownerId: userId,
        user,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockDocumentRepository.create.mockReturnValue(newDocument);
      mockDocumentRepository.save.mockResolvedValue(newDocument);
      
      const result = await service.create(createDocumentDto, userId, file);
      
      expect(result).toEqual(newDocument);
      expect(mockDocumentRepository.create).toHaveBeenCalledWith({
        ...createDocumentDto,
        title: createDocumentDto.title,
        filePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        ownerId: userId,
        status: createDocumentDto.status || DocumentStatus.DRAFT,
      });
      expect(mockDocumentRepository.save).toHaveBeenCalledWith(newDocument);
    });
    
    it('should throw BadRequestException when file is missing', async () => {
      const userId = 'user-id';
      const createDocumentDto: CreateDocumentDto = {
        title: 'Test Document',
        name: 'Test Document',
        description: 'Test Description',
      };
      
      await expect(service.create(createDocumentDto, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return an array of documents', async () => {
      const userId = 'user-id';
      const mockDocuments = [
        { id: 'doc1', title: 'Document 1' },
        { id: 'doc2', title: 'Document 2' },
      ];

      const queryBuilder = documentRepository.createQueryBuilder();
      queryBuilder.getMany.mockResolvedValue(mockDocuments);

      const result = await service.findAll({ userId });

      expect(result).toEqual(mockDocuments);
      expect(queryBuilder.where).toHaveBeenCalledWith('document.user.id = :userId', { userId });
    });

    it('should filter documents by searchTerm when provided', async () => {
      const filters = {
        userId: 'user-id',
        searchTerm: 'test',
      };

      const mockDocuments = [{ id: 'doc1', title: 'Test Document' }];
      const queryBuilder = documentRepository.createQueryBuilder();
      queryBuilder.getMany.mockResolvedValue(mockDocuments);

      const result = await service.findAll(filters);

      expect(result).toEqual(mockDocuments);
      expect(queryBuilder.where).toHaveBeenCalledWith('document.user.id = :userId', { userId: filters.userId });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(document.title LIKE :searchTerm OR document.description LIKE :searchTerm)',
        { searchTerm: `%${filters.searchTerm}%` }
      );
    });
  });

  describe('findOne', () => {
    it('should return a document by id', async () => {
      const documentId = 'document-id';
      const userId = 'user-id';
      
      const document = {
        id: documentId,
        title: 'Test Document',
        user: { id: userId },
      };

      const queryBuilder = documentRepository.createQueryBuilder();
      queryBuilder.getOne.mockResolvedValue(document);

      const result = await service.findOne(documentId, userId);

      expect(result).toEqual(document);
      expect(queryBuilder.where).toHaveBeenCalledWith('document.id = :id', { id: documentId });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('document.user.id = :userId', { userId });
    });

    it('should throw NotFoundException when document not found', async () => {
      const documentId = 'non-existent-document';
      const userId = 'user-id';

      const queryBuilder = documentRepository.createQueryBuilder();
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(documentId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a document successfully', async () => {
      const documentId = 'document-id';
      const userId = 'user-id';
      const updateDocumentDto: UpdateDocumentDto = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const mockFile = {
        originalname: 'updated.pdf',
        filename: 'updated-uuid.pdf',
        path: '/uploads/updated-uuid.pdf',
        mimetype: 'application/pdf',
        size: 2048,
      } as Express.Multer.File;

      const existingDocument = {
        id: documentId,
        title: 'Old Title',
        description: 'Old Description',
        user: { id: userId },
      };

      const updatedDocument = {
        ...existingDocument,
        ...updateDocumentDto,
      };

      const queryBuilder = documentRepository.createQueryBuilder();
      queryBuilder.getOne.mockResolvedValue(existingDocument);
      mockDocumentRepository.save.mockResolvedValue(updatedDocument);

      const result = await service.update(documentId, updateDocumentDto, mockFile, userId);

      expect(result).toEqual(updatedDocument);
      expect(queryBuilder.where).toHaveBeenCalledWith('document.id = :id', { id: documentId });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('document.user.id = :userId', { userId });
      expect(mockDocumentRepository.save).toHaveBeenCalledWith({
        ...existingDocument,
        ...updateDocumentDto,
      });
    });

    it('should throw NotFoundException when document not found', async () => {
      const documentId = 'non-existent-document';
      const userId = 'user-id';
      const updateDocumentDto = { title: 'Updated Title' };
      const mockFile = null as unknown as Express.Multer.File;

      const queryBuilder = documentRepository.createQueryBuilder();
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(documentId, updateDocumentDto, mockFile, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a document successfully', async () => {
      const documentId = 'document-id';
      const userId = 'user-id';

      const document = {
        id: documentId,
        title: 'Test Document',
        filePath: '/path/to/file.pdf',
        user: { id: userId },
      };

      const queryBuilder = documentRepository.createQueryBuilder();
      queryBuilder.getOne.mockResolvedValue(document);
      mockDocumentRepository.delete.mockResolvedValue({ affected: 1 });

      // Mock fs.existsSync and fs.unlinkSync
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      const result = await service.remove(documentId, userId);

      expect(result).toEqual({ success: true, message: 'Document deleted successfully' });
      expect(queryBuilder.where).toHaveBeenCalledWith('document.id = :id', { id: documentId });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('document.user.id = :userId', { userId });
      expect(mockDocumentRepository.delete).toHaveBeenCalledWith(documentId);
      expect(fs.existsSync).toHaveBeenCalledWith(document.filePath);
      expect(fs.unlinkSync).toHaveBeenCalledWith(document.filePath);
    });

    it('should throw NotFoundException when document not found', async () => {
      const documentId = 'non-existent-document';
      const userId = 'user-id';

      const queryBuilder = documentRepository.createQueryBuilder();
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(documentId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should handle file not found on disk', async () => {
      const documentId = 'document-id';
      const userId = 'user-id';

      const document = {
        id: documentId,
        title: 'Test Document',
        filePath: '/path/to/missing-file.pdf',
        user: { id: userId },
      };

      const queryBuilder = documentRepository.createQueryBuilder();
      queryBuilder.getOne.mockResolvedValue(document);
      mockDocumentRepository.delete.mockResolvedValue({ affected: 1 });

      // Mock fs.existsSync to simulate file not existing
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await service.remove(documentId, userId);

      expect(result).toEqual({ success: true, message: 'Document deleted successfully' });
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('uploadDocument', () => {
    it('should handle file upload correctly', async () => {
      const file = {
        originalname: 'test-file.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test file content'),
        fieldname: 'file',
        encoding: '7bit',
        destination: '/uploads',
        filename: 'test-uuid.pdf',
        stream: {} as any,
        path: '/uploads/test-file.pdf',
      };
      const userId = 'user-id';
      
      // Mock document creation
      const newDocument = {
        id: 'doc-id',
        name: 'test-file',
        title: 'test-file',
        filePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        ownerId: userId,
        status: DocumentStatus.DRAFT,
      };
      
      mockDocumentRepository.create.mockReturnValue(newDocument);
      mockDocumentRepository.save.mockResolvedValue(newDocument);
      
      const result = await service.uploadDocument(file, userId);
      
      expect(result).toEqual(newDocument);
    });
  });
});
