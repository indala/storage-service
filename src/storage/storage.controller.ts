import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import * as fastify from 'fastify';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { StorageService } from './storage.service';
import * as path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

@Controller('storage')
@UseGuards(ApiKeyGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Uploads a file stream to storage.
   * Expects query param ?path=submissions/filename.docx
   */
  @Post('upload')
  async upload(
    @Query('path') targetPath: string,
    @Req() req: fastify.FastifyRequest,
  ): Promise<{ success: boolean; filePath: string }> {
    if (!targetPath) {
      throw new BadRequestException('Query parameter "path" is required.');
    }

    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file payload found in the request.');
    }

    const filePath = await this.storageService.uploadFile(
      targetPath,
      data.file,
    );
    return { success: true, filePath };
  }

  /**
   * Downloads/Streams a file from storage.
   * Expects query param ?path=submissions/filename.docx
   */
  @Get('download')
  async download(
    @Query('path') targetPath: string,
    @Res({ passthrough: true }) res: fastify.FastifyReply,
  ): Promise<StreamableFile> {
    if (!targetPath) {
      throw new BadRequestException('Query parameter "path" is required.');
    }

    const stream = await this.storageService.getFileStream(targetPath);
    const filename = path.basename(targetPath);
    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.headers({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    return new StreamableFile(stream);
  }

  /**
   * Deletes a file from storage.
   * Expects query param ?path=submissions/filename.docx
   */
  @Delete('delete')
  async delete(
    @Query('path') targetPath: string,
  ): Promise<{ success: boolean }> {
    if (!targetPath) {
      throw new BadRequestException('Query parameter "path" is required.');
    }

    await this.storageService.deleteFile(targetPath);
    return { success: true };
  }

  /**
   * Returns the total storage size of files in bytes.
   */
  @Get('size')
  async getStorageSize(): Promise<{ sizeBytes: number }> {
    const sizeBytes = await this.storageService.getStorageSize();
    return { sizeBytes };
  }
}
