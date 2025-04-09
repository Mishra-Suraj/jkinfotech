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
import { ApiTags, ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';

/**
 * Configure storage for uploaded files
 * Sets destination folder and generates unique filenames while preserving original names
 * to prevent filename conflicts but maintain file identification
 */
const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    // Generate unique filename with original name included
    const fileNameWithoutExt = file.originalname.replace(/\.[^/.]+$/, "");
    // Sanitize filename to avoid path issues
    const sanitizedName = fileNameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, "_");
    const uniqueFilename = `${sanitizedName}-${uuidv4()}${extname(file.originalname)}`;
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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The document file to upload',
        },
        name: { type: 'string', description: 'Document name' },
        title: { type: 'string', description: 'Document title' },
        description: { type: 'string', description: 'Document description' },
        status: { 
          type: 'string', 
          enum: ['draft', 'published', 'archived'],
          description: 'Document status' 
        },
        category: { 
          type: 'string', 
          enum: ['general', 'financial', 'legal', 'technical', 'marketing', 'hr', 'other'],
          description: 'Document category'
        },
        author: { type: 'string', description: 'Document author' },
        version: { type: 'string', description: 'Document version' },
        documentDate: { type: 'string', format: 'date', description: 'Document date' },
      },
      required: ['file', 'name', 'title'],
    },
  })
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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The document file to upload',
        },
        name: { type: 'string', description: 'Document name' },
        title: { type: 'string', description: 'Document title' },
        description: { type: 'string', description: 'Document description' },
        status: { 
          type: 'string', 
          enum: ['draft', 'published', 'archived'],
          description: 'Document status' 
        },
        category: { 
          type: 'string', 
          enum: ['general', 'financial', 'legal', 'technical', 'marketing', 'hr', 'other'],
          description: 'Document category'
        },
        author: { type: 'string', description: 'Document author' },
        version: { type: 'string', description: 'Document version' },
        documentDate: { type: 'string', format: 'date', description: 'Document date' },
      },
      required: ['file', 'name', 'title'],
    },
  })
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
   * @returns File download response with original filename
   */
  @Get(':id/download')
  async download(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    const fileInfo = await this.documentsService.getFilePath(id, req.user.id, isAdmin);
    
    // Return the file as download with the original filename
    return res.download(fileInfo.path, fileInfo.filename, (err) => {
      if (err) {
        console.error(`Error downloading file: ${err.message}`);
      } else {
        // Clean up the temporary file after download
        try {
          // Give a small delay to ensure download has completed
          setTimeout(() => {
            if (require('fs').existsSync(fileInfo.path)) {
              require('fs').unlinkSync(fileInfo.path);
            }
          }, 1000);
        } catch (error) {
          console.error(`Error deleting temporary file: ${error.message}`);
        }
      }
    });
  }
}
