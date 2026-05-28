import { Controller, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ProcessService } from './process.service';

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
      throw new BadRequestException('Query parameters "inputPath" and "outputPath" are both required.');
    }

    const result = await this.processService.convertDocxToPdf(inputPath, outputPath);
    return { success: true, pdfPath: result.pdfPath, fileSize: result.fileSize };
  }
}
