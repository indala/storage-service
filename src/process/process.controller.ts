import {
  Controller,
  Post,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ProcessService, BrandingMetadata } from './process.service';

@Controller('process')
@UseGuards(ApiKeyGuard)
export class ProcessController {
  constructor(private readonly processService: ProcessService) {}

  /**
   * Triggers docx-to-pdf conversion.
   * Expects query params:
   * ?inputPath=submissions/file.docx&outputPath=submissions/file.pdf
   */
  @Post('docx-to-pdf')
  async convertDocxToPdf(
    @Query('inputPath') inputPath: string,
    @Query('outputPath') outputPath: string,
  ): Promise<{ success: boolean; pdfPath: string; fileSize: number }> {
    if (!inputPath || !outputPath) {
      throw new BadRequestException(
        'Query parameters "inputPath" and "outputPath" are both required.',
      );
    }

    const result = await this.processService.convertDocxToPdf(
      inputPath,
      outputPath,
    );
    return {
      success: true,
      pdfPath: result.pdfPath,
      fileSize: result.fileSize,
    };
  }

  /**
   * Applies header/footer branding to a PDF file in storage.
   * Expects query params:
   * ?inputPath=submissions/file.pdf&outputPath=published/file-branded.pdf
   * Expects JSON body with BrandingMetadata fields.
   */
  @Post('brand-pdf')
  async brandPdf(
    @Query('inputPath') inputPath: string,
    @Query('outputPath') outputPath: string,
    @Body() metadata: BrandingMetadata,
  ): Promise<{ success: boolean }> {
    if (!inputPath || !outputPath) {
      throw new BadRequestException(
        'Query parameters "inputPath" and "outputPath" are both required.',
      );
    }

    await this.processService.brandPdf(inputPath, outputPath, metadata);
    return { success: true };
  }
}
