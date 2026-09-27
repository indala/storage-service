import { Controller, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ProcessService } from './process.service';
import {
  BrandingMetadataDto,
  IssueBookMetadataDto,
} from './dto/process-metadata.dto';
import {
  IssueBookPathQueryDto,
  ProcessPathQueryDto,
} from './dto/process-path-query.dto';

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
    @Query() query: ProcessPathQueryDto,
  ): Promise<{ success: boolean; pdfPath: string; fileSize: number }> {
    const result = await this.processService.convertDocxToPdf(
      query.inputPath,
      query.outputPath,
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
    @Query() query: ProcessPathQueryDto,
    @Body() metadata: BrandingMetadataDto,
  ): Promise<{ success: boolean }> {
    await this.processService.brandPdf(
      query.inputPath,
      query.outputPath,
      metadata,
    );
    return { success: true };
  }

  /**
   * Generates a complete issue full-book PDF by creating a Table of Contents (TOC)
   * and merging all published article PDFs.
   * Expects query params:
   * ?outputPath=issues/volume-1-issue-1-fullbook.pdf
   * Expects JSON body with IssueBookMetadata fields.
   */
  @Post('issue-book')
  async generateIssueBook(
    @Query() query: IssueBookPathQueryDto,
    @Body() metadata: IssueBookMetadataDto,
  ): Promise<{
    success: boolean;
    outputPath: string;
    totalPages: number;
    articleCount: number;
    fileSize: number;
  }> {
    return await this.processService.generateIssueBook(
      query.outputPath,
      metadata,
    );
  }
}
