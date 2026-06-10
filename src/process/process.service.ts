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
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { PDFPage, PDFFont, Color } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export class BrandingMetadata {
  journalName!: string;
  journalShortName!: string;
  volume!: string | number;
  issue!: string | number;
  year!: string | number;
  monthRange!: string;
  issn!: string;
  website!: string;
  paperId!: string;
  startPage?: number | null;
  endPage?: number | null;
}

/* =========================================================
   HEADER CONFIGURATION
   ========================================================= */
const HEADER_FIRST_PAGE_ONLY = true;
const HEADER_HEIGHT = 90;
const HEADER_CONTENT_TOP_OFFSET = 26;
const HEADER_LOGO_X = 30;
const HEADER_LOGO_Y_OFFSET = 35;
const HEADER_LOGO_HEIGHT = 33;
const HEADER_TITLE_X = 105;
const HEADER_TITLE_Y_OFFSET = 18;
const HEADER_SUBTITLE_X = 105;
const HEADER_SUBTITLE_Y_OFFSET = 32;
const HEADER_INFO_Y_OFFSET = 48;
const HEADER_LINE_Y_OFFSET = 62;
const HEADER_LINE_X_MARGIN = 50;

const HEADER_TITLE_FONT_SIZE = 11;
const HEADER_SUBTITLE_FONT_SIZE = 11;
const HEADER_INFO_FONT_SIZE = 11;
const HEADER_LETTER_SPACING = 0.5;

const HEADER_TEXT_COLOR = rgb(0.705, 0.137, 0.623);
const HEADER_LINE_COLOR = rgb(0.705, 0.137, 0.623);

/* =========================================================
   FOOTER CONFIGURATION
   ========================================================= */
const FOOTER_HEIGHT = 55;
const FOOTER_WIDTH_PERCENT = 0.87;
const FOOTER_IMAGE_Y = 8;
const FOOTER_IMAGE_X_ADJUST = 5;
const FOOTER_FONT_SIZE = 11;
const FOOTER_TEXT_PADDING = 10;
const CENTER_TEXT_X_ADJUST = 20;
const TEXT_Y_ADJUST = 0;

/* =========================================================
   HELPERS
   ========================================================= */
function drawTextWithSpacing(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color: Color,
  spacing = 0,
) {
  let currentX = x;
  for (const char of text) {
    page.drawText(char, {
      x: currentX,
      y,
      size,
      font,
      color,
    });
    currentX += font.widthOfTextAtSize(char, size) + spacing;
  }
}

function widthOfTextWithSpacing(
  text: string,
  size: number,
  font: PDFFont,
  spacing = 0,
) {
  const baseWidth = font.widthOfTextAtSize(text, size);
  const totalSpacing = Math.max(0, text.length - 1) * spacing;
  return baseWidth + totalSpacing;
}

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
      console.warn(
        'ILOVEPDF API keys are not configured in storage-service environment.',
      );
    }

    this.publicKey = pub ?? '';
    this.secretKey = sec ?? '';
  }

  /**
   * Helper to convert a readable stream into a buffer.
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Reads a docx file from storage, converts it to PDF using iLovePDF, and saves the PDF back to storage.
   */
  async convertDocxToPdf(
    inputPath: string,
    outputPath: string,
  ): Promise<{ pdfPath: string; fileSize: number }> {
    if (!this.publicKey || !this.secretKey) {
      throw new BadRequestException(
        'iLovePDF API keys are not configured on the storage server.',
      );
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
      throw new BadRequestException(
        'Failed to convert document via iLovePDF API.',
      );
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

  /**
   * Reads a PDF from storage, applies header/footer branding, and saves the branded PDF back to storage.
   */
  async brandPdf(
    inputPath: string,
    outputPath: string,
    metadata: BrandingMetadata,
  ): Promise<void> {
    try {
      // 1. Fetch file stream from storage and convert to Buffer
      const fileStream = await this.storageService.getFileStream(inputPath);
      const pdfBytes = await this.streamToBuffer(fileStream);

      // 2. Load PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pdfDoc.registerFontkit(fontkit);
      const pages = pdfDoc.getPages();

      // 3. Embed fonts
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // 4. Load logo and footer branding images
      const configuredAssetsDir = this.configService.get<string>('ASSETS_DIR');
      const assetsDir = configuredAssetsDir
        ? path.resolve(configuredAssetsDir)
        : path.resolve(process.cwd(), './assets');

      const logoPath = path.join(assetsDir, 'logo.png');
      const footerPath = path.join(assetsDir, 'footer.png');

      const logoBytes = await fs.readFile(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);

      const footerBytes = await fs.readFile(footerPath);
      const footerImage = await pdfDoc.embedPng(footerBytes);

      // 5. Process all pages
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (!page) continue;

        const { width, height } = page.getSize();
        const currentPageNumber = (metadata.startPage || 1) + i;

        // --- HEADER OVERLAY ---
        const shouldRenderHeader = HEADER_FIRST_PAGE_ONLY ? i === 0 : true;
        if (shouldRenderHeader) {
          page.drawRectangle({
            x: 0,
            y: height - HEADER_HEIGHT,
            width,
            height: HEADER_HEIGHT,
            color: rgb(1, 1, 1),
          });

          const logoWidth =
            (logoImage.width / logoImage.height) * HEADER_LOGO_HEIGHT;
          page.drawImage(logoImage, {
            x: HEADER_LOGO_X,
            y: height - HEADER_LOGO_Y_OFFSET - HEADER_CONTENT_TOP_OFFSET,
            width: logoWidth,
            height: HEADER_LOGO_HEIGHT,
          });

          // TITLE with Spacing
          drawTextWithSpacing(
            page,
            metadata.journalName,
            HEADER_TITLE_X,
            height - HEADER_TITLE_Y_OFFSET - HEADER_CONTENT_TOP_OFFSET,
            HEADER_TITLE_FONT_SIZE,
            boldFont,
            HEADER_TEXT_COLOR,
            HEADER_LETTER_SPACING,
          );

          // SUBTITLE with Spacing
          drawTextWithSpacing(
            page,
            `A Peer-Reviewed International Research Journal (${metadata.journalShortName})`,
            HEADER_SUBTITLE_X,
            height - HEADER_SUBTITLE_Y_OFFSET - HEADER_CONTENT_TOP_OFFSET,
            HEADER_SUBTITLE_FONT_SIZE,
            boldFont,
            HEADER_TEXT_COLOR,
            HEADER_LETTER_SPACING,
          );

          // WEBSITE | ISSN
          const infoText = `${metadata.website} | E-ISSN: ${metadata.issn}`;
          const infoWidth = widthOfTextWithSpacing(
            infoText,
            HEADER_INFO_FONT_SIZE,
            boldFont,
            HEADER_LETTER_SPACING,
          );

          drawTextWithSpacing(
            page,
            infoText,
            (width - infoWidth) / 2,
            height - HEADER_INFO_Y_OFFSET - HEADER_CONTENT_TOP_OFFSET,
            HEADER_INFO_FONT_SIZE,
            boldFont,
            HEADER_TEXT_COLOR,
            HEADER_LETTER_SPACING,
          );

          page.drawLine({
            start: {
              x: HEADER_LINE_X_MARGIN,
              y: height - HEADER_LINE_Y_OFFSET - HEADER_CONTENT_TOP_OFFSET,
            },
            end: {
              x: width - HEADER_LINE_X_MARGIN,
              y: height - HEADER_LINE_Y_OFFSET - HEADER_CONTENT_TOP_OFFSET,
            },
            thickness: 0.8,
            color: HEADER_LINE_COLOR,
            dashArray: [2, 2],
          });
        }

        // --- FOOTER OVERLAY ---
        page.drawRectangle({
          x: 0,
          y: 0,
          width,
          height: FOOTER_HEIGHT,
          color: rgb(1, 1, 1),
        });

        const targetWidth = width * FOOTER_WIDTH_PERCENT;
        const scale = targetWidth / footerImage.width;
        const targetHeight = footerImage.height * scale;
        const fx = (width - targetWidth + FOOTER_IMAGE_X_ADJUST) / 2;
        const fy = FOOTER_IMAGE_Y;

        page.drawImage(footerImage, {
          x: fx,
          y: fy,
          width: targetWidth,
          height: targetHeight,
        });
        const fTextY =
          fy + targetHeight / 2 - FOOTER_FONT_SIZE / 2 + TEXT_Y_ADJUST;

        // Left: Paper ID
        page.drawText(`Paper ID: ${metadata.paperId}`, {
          x: fx + FOOTER_TEXT_PADDING,
          y: fTextY,
          size: FOOTER_FONT_SIZE,
          font: boldFont,
          color: rgb(1, 1, 1),
        });

        // Center: Volume, Issue, Date
        const centerText = `${metadata.website}    Volume ${metadata.volume} Issue ${metadata.issue}, ${metadata.monthRange} ${metadata.year}`;
        const centerTextWidth = boldFont.widthOfTextAtSize(
          centerText,
          FOOTER_FONT_SIZE,
        );
        page.drawText(centerText, {
          x: fx + targetWidth / 2 - centerTextWidth / 2 + CENTER_TEXT_X_ADJUST,
          y: fTextY,
          size: FOOTER_FONT_SIZE,
          font: boldFont,
          color: rgb(1, 1, 1),
        });

        // Right: Page Number
        const pText = `${currentPageNumber}`;
        const pWidth = boldFont.widthOfTextAtSize(pText, FOOTER_FONT_SIZE);
        page.drawText(pText, {
          x: fx + targetWidth - pWidth - FOOTER_TEXT_PADDING,
          y: fTextY,
          size: FOOTER_FONT_SIZE,
          font: boldFont,
          color: rgb(1, 1, 1),
        });
      }

      // 6. Save PDF and upload back to storage
      const brandedBytes = await pdfDoc.save();
      const brandedBuffer = Buffer.from(brandedBytes);
      const readablePdf = Readable.from(brandedBuffer);
      await this.storageService.uploadFile(outputPath, readablePdf);
    } catch (error) {
      console.error('PDF Branding Error in Backend:', error);
      throw new BadRequestException(
        `Failed to brand PDF: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
