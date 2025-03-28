import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UserRole } from '../entities/user.entity';
import { HttpStatus } from '@nestjs/common';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: DocumentsService;

  const mockDocumentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getFilePath: jest.fn(),
  };

  const mockResponse = {
    download: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a document', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        filename: 'test-uuid.pdf',
        path: '/uploads/test-uuid.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;
      const createDocumentDto: CreateDocumentDto = {
        name: 'Test Document',
        title: 'Test Document Title',
        description: 'Test Description',
      };
      const mockUser = { id: 'user-id', role: UserRole.EDITOR };
      const mockRequest = { user: mockUser };
      const expectedResult = {
        id: 'doc-id',
        name: 'Test Document',
        title: 'Test Document Title',
        description: 'Test Description',
        filePath: '/uploads/test-uuid.pdf',
        createdBy: 'user-id',
      };
      mockDocumentsService.create.mockResolvedValue(expectedResult);
      expect(await controller.create(createDocumentDto, mockFile, mockRequest)).toBe(expectedResult);
      expect(mockDocumentsService.create).toHaveBeenCalledWith(
        createDocumentDto,
        mockUser.id,
        mockFile
      );
    });
  });

  describe('findAll', () => {
    it('should return all documents for the user', async () => {
      const mockUser = { id: 'user-id', role: UserRole.VIEWER };
      const mockRequest = { user: mockUser };
      const expectedResult = [
        {
          id: 'doc-id',
          name: 'Test Document',
          description: 'Test Description',
          filePath: '/uploads/test-uuid.pdf',
          createdBy: 'user-id',
        },
      ];

      mockDocumentsService.findAll.mockResolvedValue(expectedResult);

      expect(await controller.findAll(mockRequest)).toBe(expectedResult);
      expect(mockDocumentsService.findAll).toHaveBeenCalledWith(mockUser.id, false);
    });

    it('should return all documents for admin user', async () => {
      const mockUser = { id: 'admin-id', role: UserRole.ADMIN };
      const mockRequest = { user: mockUser };
      const expectedResult = [
        {
          id: 'doc-id',
          name: 'Test Document',
          description: 'Test Description',
          filePath: '/uploads/test-uuid.pdf',
          createdBy: 'user-id',
        },
      ];

      mockDocumentsService.findAll.mockResolvedValue(expectedResult);

      expect(await controller.findAll(mockRequest)).toBe(expectedResult);
      expect(mockDocumentsService.findAll).toHaveBeenCalledWith(mockUser.id, true);
    });
  });

  describe('findOne', () => {
    it('should return a document by id', async () => {
      const mockUser = { id: 'user-id', role: UserRole.VIEWER };
      const mockRequest = { user: mockUser };
      const expectedResult = {
        id: 'doc-id',
        name: 'Test Document',
        description: 'Test Description',
        filePath: '/uploads/test-uuid.pdf',
        createdBy: 'user-id',
      };

      mockDocumentsService.findOne.mockResolvedValue(expectedResult);

      expect(await controller.findOne('doc-id', mockRequest)).toBe(expectedResult);
      expect(mockDocumentsService.findOne).toHaveBeenCalledWith('doc-id', mockUser.id, false);
    });

    it('should return a document by id for admin user', async () => {
      const mockUser = { id: 'admin-id', role: UserRole.ADMIN };
      const mockRequest = { user: mockUser };
      const expectedResult = {
        id: 'doc-id',
        name: 'Test Document',
        description: 'Test Description',
        filePath: '/uploads/test-uuid.pdf',
        createdBy: 'user-id',
      };

      mockDocumentsService.findOne.mockResolvedValue(expectedResult);

      expect(await controller.findOne('doc-id', mockRequest)).toBe(expectedResult);
      expect(mockDocumentsService.findOne).toHaveBeenCalledWith('doc-id', mockUser.id, true);
    });
  });

  describe('update', () => {
    it('should update a document', async () => {
      const mockFile = {
        originalname: 'updated.pdf',
        filename: 'updated-uuid.pdf',
        path: '/uploads/updated-uuid.pdf',
        mimetype: 'application/pdf',
        size: 2048,
      } as Express.Multer.File;
      const updateDocumentDto: UpdateDocumentDto = {
        name: 'Updated Document',
        title: 'Updated Document Title',
        description: 'Updated Description',
      };
      const mockUser = { id: 'user-id', role: UserRole.EDITOR };
      const mockRequest = { user: mockUser };
      const expectedResult = {
        id: 'doc-id',
        name: 'Updated Document',
        title: 'Updated Document Title',
        description: 'Updated Description',
        filePath: '/uploads/updated-uuid.pdf',
        createdBy: 'user-id',
      };
      mockDocumentsService.update.mockResolvedValue(expectedResult);
      expect(await controller.update('doc-id', updateDocumentDto, mockFile, mockRequest)).toBe(expectedResult);
      expect(mockDocumentsService.update).toHaveBeenCalledWith(
        'doc-id',
        updateDocumentDto,
        mockFile,
        mockUser.id,
        false,
      );
    });
    it('should update a document as admin user', async () => {
      const updateDocumentDto: UpdateDocumentDto = {
        name: 'Admin Updated',
        title: 'Admin Updated Title',
      };
      const mockUser = { id: 'admin-id', role: UserRole.ADMIN };
      const mockRequest = { user: mockUser };
      const expectedResult = {
        id: 'doc-id',
        name: 'Admin Updated',
        title: 'Admin Updated Title',
        description: 'Test Description',
        filePath: '/uploads/test-uuid.pdf',
        createdBy: 'user-id',
      };
      mockDocumentsService.update.mockResolvedValue(expectedResult);
      expect(await controller.update('doc-id', updateDocumentDto, null as unknown as Express.Multer.File, mockRequest)).toBe(expectedResult);
      expect(mockDocumentsService.update).toHaveBeenCalledWith(
        'doc-id',
        updateDocumentDto,
        null,
        mockUser.id,
        true,
      );
    });
  });

  describe('remove', () => {
    it('should remove a document', async () => {
      const mockUser = { id: 'user-id', role: UserRole.EDITOR };
      const mockRequest = { user: mockUser };

      mockDocumentsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('doc-id', mockRequest);
      
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'Document deleted successfully',
      });
      expect(mockDocumentsService.remove).toHaveBeenCalledWith('doc-id', mockUser.id, false);
    });

    it('should remove a document as admin user', async () => {
      const mockUser = { id: 'admin-id', role: UserRole.ADMIN };
      const mockRequest = { user: mockUser };

      mockDocumentsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('doc-id', mockRequest);
      
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'Document deleted successfully',
      });
      expect(mockDocumentsService.remove).toHaveBeenCalledWith('doc-id', mockUser.id, true);
    });
  });

  describe('download', () => {
    it('should download a document', async () => {
      const mockUser = { id: 'user-id', role: UserRole.VIEWER };
      const mockRequest = { user: mockUser };
      const filePath = '/uploads/test-uuid.pdf';

      mockDocumentsService.getFilePath.mockResolvedValue(filePath);
      mockResponse.download.mockReturnValue(undefined);

      await controller.download('doc-id', mockRequest, mockResponse as any);
      
      expect(mockDocumentsService.getFilePath).toHaveBeenCalledWith('doc-id', mockUser.id, false);
      expect(mockResponse.download).toHaveBeenCalledWith(filePath);
    });

    it('should download a document as admin user', async () => {
      const mockUser = { id: 'admin-id', role: UserRole.ADMIN };
      const mockRequest = { user: mockUser };
      const filePath = '/uploads/test-uuid.pdf';

      mockDocumentsService.getFilePath.mockResolvedValue(filePath);
      mockResponse.download.mockReturnValue(undefined);

      await controller.download('doc-id', mockRequest, mockResponse as any);
      
      expect(mockDocumentsService.getFilePath).toHaveBeenCalledWith('doc-id', mockUser.id, true);
      expect(mockResponse.download).toHaveBeenCalledWith(filePath);
    });
  });
});
