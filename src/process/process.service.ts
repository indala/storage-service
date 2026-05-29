import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
import ILovePDFApi from '@ilovepdf/ilovepdf-nodejs';
import ILovePDFFile from '@ilovepdf/ilovepdf-nodejs/ILovePDFFile';
import * as fs from 'fs/promises';
import { createWriteStream } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

@Injectable()
export class ProcessService {
  private readonly publicKey: string;
  private readonly secretKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {
    const pub = this.configService.get<string>('ILOVEPDF_PUBLIC_KEY');
    const sec = this.configService.get<string>('ILOVEPDF_SECRET_KEY');

    if (!pub || !sec) {
      // We will not crash the app, but throw error during service call if not configured
      console.warn('ILOVEPDF API keys are not configured in storage-service environment.');
    }

    this.publicKey = pub ?? '';
    this.secretKey = sec ?? '';
  }

  /**
   * Reads a docx file from storage, converts it to PDF using iLovePDF, and saves the PDF back to storage.
   */
  async convertDocxToPdf(inputPath: string, outputPath: string): Promise<{ pdfPath: string; fileSize: number }> {
    if (!this.publicKey || !this.secretKey) {
      throw new BadRequestException('iLovePDF API keys are not configured on the storage server.');
    }

    let tempInputPath: string | null = null;
    try {
      // 1. Fetch file stream from storage
      const fileStream = await this.storageService.getFileStream(inputPath);

      // 2. Write file to temporary folder (since iLovePDF SDK expects a file path on disk)
      const tempDir = os.tmpdir();
      const uniqueName = `${Date.now()}-${path.basename(inputPath)}`;
      tempInputPath = path.join(tempDir, uniqueName);

      // Helper to consume the ReadStream into a file on disk
      await pipeline(fileStream, createWriteStream(tempInputPath));

      // 3. Initialize iLovePDF
      const instance = new ILovePDFApi(this.publicKey, this.secretKey);
      const task = instance.newTask('officepdf');
      await task.start();

      // 4. Add file
      const file = new ILovePDFFile(tempInputPath);
      await task.addFile(file);

      // 5. Process
      await task.process();

      // 6. Download converted PDF file buffer
      const pdfData = await task.download();
      const pdfBuffer = Buffer.from(pdfData);

      // 7. Write converted file back to storage using StorageService
      const readablePdf = Readable.from(pdfBuffer);
      await this.storageService.uploadFile(outputPath, readablePdf);

      return { pdfPath: outputPath, fileSize: pdfBuffer.length };
    } catch (error) {
      console.error('iLovePDF Conversion error in Storage Service:', error);
      throw new BadRequestException('Failed to convert document via iLovePDF API.');
    } finally {
      // Cleanup temp input file
      if (tempInputPath) {
        try {
          await fs.unlink(tempInputPath);
        } catch (err) {
          console.error('Failed to unlink temp conversion file:', err);
        }
      }
    }
  }
}
