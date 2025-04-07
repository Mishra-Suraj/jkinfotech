/**
 * Documents Controller
 * 
 * Handles HTTP requests related to document operations including creation, retrieval,
 * updates, deletion and downloading of documents. Implements authorization checks
 * to ensure users can only access their own documents unless they have admin privileges.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Configure storage for uploaded files
 * Sets destination folder and generates unique filenames using UUID
 * to prevent filename conflicts
 */
const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueFilename = `${uuidv4()}${extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

/**
 * Documents controller handling document-related endpoints
 * Protected with JWT authentication and role-based access control
 */
@ApiTags('documents')
@ApiBearerAuth('access-token')
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Create a new document
   * 
   * @param createDocumentDto - Document metadata
   * @param file - The uploaded file
   * @param req - Request object containing authenticated user information
   * @returns Newly created document entity
   */
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage }))
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.documentsService.create(
      createDocumentDto,
      req.user.id,
      file,
    );
  }

  /**
   * Retrieve all documents
   * Admin users can see all documents, regular users only see their own
   * 
   * @param req - Request object containing authenticated user information
   * @returns Array of document entities
   */
  @Get()
  async findAll(@Request() req) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    return this.documentsService.findAll(req.user.id, isAdmin);
  }

  /**
   * Retrieve a specific document by ID
   * 
   * @param id - Document unique identifier
   * @param req - Request object containing authenticated user information
   * @returns Document entity if authorized to access
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    return this.documentsService.findOne(id, req.user.id, isAdmin);
  }

  /**
   * Update an existing document
   * 
   * @param id - Document unique identifier
   * @param updateDocumentDto - Updated document metadata
   * @param file - New file to replace existing document (optional)
   * @param req - Request object containing authenticated user information
   * @returns Updated document entity
   */
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    return this.documentsService.update(
      id,
      updateDocumentDto,
      file,
      req.user.id,
      isAdmin,
    );
  }

  /**
   * Delete a document
   * 
   * @param id - Document unique identifier
   * @param req - Request object containing authenticated user information
   * @returns Success response with 200 status code
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    await this.documentsService.remove(id, req.user.id, isAdmin);
    return { statusCode: HttpStatus.OK, message: 'Document deleted successfully' };
  }

  /**
   * Download a document file
   * 
   * @param id - Document unique identifier
   * @param req - Request object containing authenticated user information
   * @param res - Response object used to send the file
   * @returns File download response
   */
  @Get(':id/download')
  async download(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    const filePath = await this.documentsService.getFilePath(id, req.user.id, isAdmin);
    
    // Return the file as download
    return res.download(filePath);
  }
}
