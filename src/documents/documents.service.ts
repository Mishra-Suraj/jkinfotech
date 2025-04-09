import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Document, DocumentStatus } from '../entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

/**
 * Service responsible for managing document operations
 * 
 * Handles CRUD operations for documents, including file management,
 * permission checks, and database interactions.
 */
@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
  ) {}

  /**
   * Retrieves all documents based on user permissions
   * 
   * @param filters - Object containing filter options (userId, etc.)
   * @param isAdmin - Whether the requesting user has admin privileges (defaults to false)
   * @returns Promise resolving to an array of documents
   */
  async findAll(filters: { userId?: string }, isAdmin = false): Promise<Document[]> {
    const userId = filters.userId;
    
    // Admins can see all documents, users can only see their own
    if (isAdmin) {
      return this.documentsRepository.find({
        relations: ['owner'],
      });
    }
    
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    
    return this.documentsRepository.find({
      where: { ownerId: userId },
      relations: ['owner'],
    });
  }

  /**
   * Finds a single document by its ID
   * 
   * @param id - The unique identifier of the document
   * @param userId - The ID of the user making the request
   * @param isAdmin - Whether the requesting user has admin privileges (defaults to false)
   * @returns Promise resolving to the found document
   * @throws NotFoundException if document doesn't exist or user lacks permission
   */
  async findOne(id: string, userId: string, isAdmin = false): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id },
      relations: ['owner'],
    });
    
    if (!document) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }
    
    // Check if user has permission to access this document
    if (!isAdmin && document.ownerId !== userId) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }
    
    return document;
  }

  /**
   * Creates a new document with an associated file
   * 
   * @param createDocumentDto - DTO containing document metadata
   * @param userId - The ID of the user creating the document
   * @param file - The uploaded file information (defaults to undefined)
   * @returns Promise resolving to the newly created document
   * @throws BadRequestException if no file is provided
   */
  async create(
    createDocumentDto: CreateDocumentDto,
    userId: string,
    file?: Express.Multer.File,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    // Read file content
    const fileContent = fs.readFileSync(file.path);
    
    const document = this.documentsRepository.create({
      ...createDocumentDto,
      title: createDocumentDto.title,
      filePath: file.path, // Still keep reference to temporary file
      originalFilename: file.originalname, // Store the original filename
      mimeType: file.mimetype,
      size: file.size,
      fileContent: fileContent, // Store the file content in the database
      ownerId: userId,
      status: createDocumentDto.status || DocumentStatus.DRAFT,
    });
    
    // Save document with file content
    const savedDocument = await this.documentsRepository.save(document);
    
    // Delete the temporary file after saving to database
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      console.error(`Error deleting temporary file: ${error.message}`);
    }
    
    return savedDocument;
  }

  /**
   * Updates an existing document's metadata and optionally replaces its file
   * 
   * @param id - The unique identifier of the document to update
   * @param updateDocumentDto - DTO containing updated document metadata
   * @param file - The new file to replace the existing one (optional)
   * @param userId - The ID of the user making the update
   * @param isAdmin - Whether the requesting user has admin privileges (defaults to false)
   * @returns Promise resolving to the updated document
   * @throws NotFoundException if document doesn't exist or user lacks permission
   */
  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
    file: Express.Multer.File,
    userId: string,
    isAdmin = false,
  ): Promise<Document> {
    const document = await this.findOne(id, userId, isAdmin);
    
    // Only owner or admin can update
    if (!isAdmin && document.ownerId !== userId) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }
    
    // If a new file is provided, update file-related properties
    if (file) {
      // Read new file content
      const fileContent = fs.readFileSync(file.path);
      
      // Update with new file information
      document.mimeType = file.mimetype;
      document.size = file.size;
      document.fileContent = fileContent;
      document.originalFilename = file.originalname; // Update the original filename
      
      // Delete the temporary file after reading its content
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error(`Error deleting temporary file: ${error.message}`);
      }
    }
    
    // Update other properties
    Object.assign(document, updateDocumentDto);
    
    return this.documentsRepository.save(document);
  }

  /**
   * Deletes a document and its associated file
   * 
   * @param id - The unique identifier of the document to delete
   * @param userId - The ID of the user requesting deletion
   * @param isAdmin - Whether the requesting user has admin privileges (defaults to false)
   * @returns Promise that resolves when deletion is complete
   * @throws NotFoundException if document doesn't exist or user lacks permission
   */
  async remove(id: string, userId: string, isAdmin = false): Promise<void> {
    const document = await this.findOne(id, userId, isAdmin);
    
    // Only owner or admin can delete
    if (!isAdmin && document.ownerId !== userId) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }
    
    // Delete the document from the database 
    // (this will also delete the file content stored in the database)
    await this.documentsRepository.remove(document);
  }

  /**
   * Retrieves the file path for document download
   * 
   * @param id - The unique identifier of the document
   * @param userId - The ID of the user requesting the download
   * @param isAdmin - Whether the requesting user has admin privileges
   * @returns Promise resolving to an object containing the file path and original filename
   * @throws NotFoundException if document/file doesn't exist or user lacks permission
   */
  async getFilePath(id: string, userId: string, isAdmin: boolean): Promise<{path: string, filename: string}> {
    const document = await this.findOne(id, userId, isAdmin);
    
    // Only owner or admin can download
    if (!isAdmin && document.ownerId !== userId) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }
    
    // If no file content is stored, throw error
    if (!document.fileContent) {
      throw new NotFoundException('File content not found in database');
    }
    
    // Create a temporary file for download
    const tempDir = './temp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create a unique filename for the temp file
    const tempFilePath = path.join(tempDir, `${document.id}.plain`);
    
    // Write the file content to the temp file
    fs.writeFileSync(tempFilePath, document.fileContent);
    
    // Use original filename if available, otherwise fallback to document name with appropriate extension
    const downloadFilename = document.originalFilename || `${document.name}${this.getExtensionFromMimeType(document.mimeType)}`;
    
    return {
      path: tempFilePath,
      filename: downloadFilename
    };
  }
  
  /**
   * Derives a file extension from a MIME type
   * 
   * @param mimeType - The MIME type of the file
   * @returns A file extension including the dot prefix
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'text/plain': '.txt',
      'text/html': '.html',
      'text/css': '.css',
      'text/javascript': '.js',
      'application/json': '.json',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
    };
    
    return mimeToExt[mimeType] || `.${mimeType.split('/').pop() || 'bin'}`;
  }

  /**
   * Uploads a document file and creates a new document entry
   * 
   * @param file - The uploaded file
   * @param userId - The ID of the user uploading the document
   * @returns Promise resolving to the newly created document
   * @throws BadRequestException if file is missing or invalid
   */
  async uploadDocument(
    file: Express.Multer.File,
    userId: string
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    // Create basic document metadata from the file
    const fileName = path.basename(file.originalname, path.extname(file.originalname));
    
    const documentDto: CreateDocumentDto = {
      name: fileName,
      title: fileName, // Use filename as the title
      description: `Uploaded on ${new Date().toISOString()}`,
      status: DocumentStatus.DRAFT,
    };
    
    // Create the document with the file
    return this.create(documentDto, userId, file);
  }
}
