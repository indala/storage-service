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
import { PDFDocument, rgb, StandardFonts, PDFName, PDFArray, PDFString } from 'pdf-lib';
import type { PDFPage, PDFFont, PDFImage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {
  BrandingMetadataDto,
  IssueBookMetadataDto,
} from './dto/process-metadata.dto';

interface CustomFontEmbedder {
  fontFeatures?: {
    liga?: boolean;
    clig?: boolean;
    dlig?: boolean;
    hlig?: boolean;
  };
}

/* =========================================================
   BRANDING CONFIGURATION & CONSTANTS (New Template Specs)
   ========================================================= */
const BRAND_RED = rgb(1, 0, 0); // #FF0000 Primary Academic Red Accent
const BRAND_BLACK = rgb(0, 0, 0); // #000000 Body & Running Metadata
const LINK_BLUE = rgb(0.05, 0.4, 0.85); // Standard academic hyperlink blue
const WHITE = rgb(1, 1, 1);

// Page 1 Header
const P1_HEADER_HEIGHT = 75;
const P1_MARGIN_X = 46.8; // 0.65 inch margin
const P1_LOGO_HEIGHT = 32.2;
const P1_LOGO_MAX_WIDTH = 78;

// Running Headers (Pages 2+)
const RUNNING_HEADER_HEIGHT = 54;
const RUNNING_HEADER_Y_OFFSET = 53.0;
const RUNNING_HEADER_FONT_SIZE = 10;

// Page 1 Footer (4-Tier Block matching template Image 1)
const P1_FOOTER_HEIGHT = 80;
const P1_FOOTER_FONT_SIZE = 9;
const P1_FOOTER_LINE1_Y = 58;
const P1_FOOTER_LINE2_Y = 46;
const P1_FOOTER_LINE3_Y = 34;
const P1_FOOTER_LINE4_Y = 22;

// Running Footers (Pages 2+)
const RUNNING_FOOTER_HEIGHT = 45;
const RUNNING_PAGE_NUM_FONT_SIZE = 11;
const RUNNING_FOOTER_Y = 24;

/* =========================================================
   HELPERS
   ========================================================= */
function addLinkAnnotation(
  pdfDoc: PDFDocument,
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  url: string,
) {
  if (!url) return;
  const linkAnnot = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [x, y - 2, x + width, y + height + 2],
    Border: [0, 0, 0],
    A: {
      Type: 'Action',
      S: 'URI',
      URI: PDFString.of(url),
      F: 1,
    },
  });
  const linkAnnotRef = pdfDoc.context.register(linkAnnot);
  if (page.node.has(PDFName.of('Annots'))) {
    const annots = page.node.get(PDFName.of('Annots'));
    if (annots instanceof PDFArray) {
      annots.push(linkAnnotRef);
    }
  } else {
    page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkAnnotRef]));
  }
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
    metadata: BrandingMetadataDto,
  ): Promise<void> {
    try {
      // 1. Fetch file stream from storage and convert to Buffer
      const fileStream = await this.storageService.getFileStream(inputPath);
      const pdfBytes = await this.streamToBuffer(fileStream);

      // 2. Load PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // 3. Resolve Assets and Embed Authentic Calibri Fonts (with ligature-free OpenType layout)
      const configuredAssetsDir = this.configService.get<string>('ASSETS_DIR');
      const assetsDir = configuredAssetsDir
        ? path.resolve(configuredAssetsDir)
        : path.resolve(process.cwd(), './assets');

      pdfDoc.registerFontkit(fontkit);

      let fontRegular: PDFFont;
      let fontBold: PDFFont;

      try {
        const calibriRegularPath = path.join(assetsDir, 'fonts', 'Calibri.ttf');
        const calibriBoldPath = path.join(assetsDir, 'fonts', 'Calibri-Bold.ttf');

        const [regularBytes, boldBytes] = await Promise.all([
          fs.readFile(calibriRegularPath),
          fs.readFile(calibriBoldPath),
        ]);

        fontRegular = await pdfDoc.embedFont(regularBytes);
        const regularEmbedder = Reflect.get(fontRegular, 'embedder') as CustomFontEmbedder | undefined;
        if (regularEmbedder) {
          regularEmbedder.fontFeatures = {
            liga: false,
            clig: false,
            dlig: false,
            hlig: false,
          };
        }

        fontBold = await pdfDoc.embedFont(boldBytes);
        const boldEmbedder = Reflect.get(fontBold, 'embedder') as CustomFontEmbedder | undefined;
        if (boldEmbedder) {
          boldEmbedder.fontFeatures = {
            liga: false,
            clig: false,
            dlig: false,
            hlig: false,
          };
        }
      } catch (fontErr) {
        console.warn('[brandPdf] Falling back to standard Helvetica fonts:', fontErr);
        fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      }

      // 4. Load Logo image
      const logoPath = path.join(assetsDir, 'logo.png');
      let logoImage: PDFImage | null = null;
      try {
        const logoBytes = await fs.readFile(logoPath);
        logoImage = await pdfDoc.embedPng(logoBytes);
      } catch (logoErr) {
        console.warn(`[brandPdf] Could not load logo image from ${logoPath}:`, logoErr);
      }

      // Format clean URLs and strings
      const cleanWebsite = (metadata.website || 'www.ijitest.org')
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '');
      const globalWebsiteUrl = metadata.website?.startsWith('http')
        ? metadata.website
        : `https://${cleanWebsite}`;

      const articleUrl = `${globalWebsiteUrl}/article/${metadata.paperId}`;

      const cleanDoiSuffix = metadata.doi
        ? metadata.doi.replace(/^https?:\/\/doi\.org\//, '').trim()
        : '';
      const globalDoiUrl = cleanDoiSuffix
        ? (metadata.doi?.startsWith('http') ? metadata.doi : `https://doi.org/${cleanDoiSuffix}`)
        : null;

      const monthText = metadata.monthRange ? `${metadata.monthRange} ` : '';

      // 5. Process all pages
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (!page) continue;

        const { width, height } = page.getSize();
        const currentPageNumber = (metadata.startPage || 1) + i;
        const isFirstPage = i === 0;
        const isEvenPage = (i + 1) % 2 === 0;

        // =========================================================
        // HEADER OVERLAY
        // =========================================================
        if (isFirstPage) {
          // Page 1 Header Overlay (Clean white box covering top 75pt)
          page.drawRectangle({
            x: 0,
            y: height - P1_HEADER_HEIGHT,
            width,
            height: P1_HEADER_HEIGHT,
            color: WHITE,
          });

          // Header Text on Right (Line 1: Journal Title BOLD, Line 2: Website | ISSN BOLD)
          const line1Text = metadata.journalName;
          const line2Text = `${cleanWebsite} | E-ISSN: ${metadata.issn}`;

          let line1Size = 13.2;
          let line2Size = 12.2;

          const actualLine1Width = fontBold.widthOfTextAtSize(line1Text, line1Size);
          const line1Y = height - 36.0 - (line1Size * 0.85);

          const actualLine2Width = fontBold.widthOfTextAtSize(line2Text, line2Size);
          const line2Y = line1Y - (line1Size * 1.3);

          // Logo on Left (Vertically centered with the 2-line header text block)
          let logoWidth = 0;
          if (logoImage) {
            const calculatedWidth = (logoImage.width / logoImage.height) * P1_LOGO_HEIGHT;
            logoWidth = Math.min(calculatedWidth, P1_LOGO_MAX_WIDTH);
            // Visual optical center alignment: word 'ijitest' aligns with text block
            const logoY = height - 58.0;

            page.drawImage(logoImage, {
              x: P1_MARGIN_X,
              y: logoY,
              width: logoWidth,
              height: P1_LOGO_HEIGHT,
            });
          }

          const maxTextWidth = width - P1_MARGIN_X - (P1_MARGIN_X + logoWidth + 4);
          if (actualLine1Width > maxTextWidth) {
            line1Size = Math.max(9.0, (maxTextWidth / actualLine1Width) * line1Size);
          }
          if (actualLine2Width > maxTextWidth) {
            line2Size = Math.max(8.0, (maxTextWidth / actualLine2Width) * line2Size);
          }

          const finalLine1Width = fontBold.widthOfTextAtSize(line1Text, line1Size);
          const line1X = width - P1_MARGIN_X - finalLine1Width + 3.0;

          page.drawText(line1Text, {
            x: line1X,
            y: line1Y,
            size: line1Size,
            font: fontBold,
            color: BRAND_RED,
          });

          const finalLine2Width = fontBold.widthOfTextAtSize(line2Text, line2Size);
          const line2X = width - P1_MARGIN_X - finalLine2Width + 3.0;

          page.drawText(line2Text, {
            x: line2X,
            y: line2Y,
            size: line2Size,
            font: fontBold,
            color: BRAND_RED,
          });

          // Hotspot link for website in Header Line 2
          const websitePartWidth = fontBold.widthOfTextAtSize(cleanWebsite, line2Size);
          addLinkAnnotation(
            pdfDoc,
            page,
            line2X,
            line2Y,
            websitePartWidth,
            line2Size,
            globalWebsiteUrl,
          );
        } else {
          // Running Headers (Pages 2+)
          page.drawRectangle({
            x: 0,
            y: height - RUNNING_HEADER_HEIGHT,
            width,
            height: RUNNING_HEADER_HEIGHT,
            color: WHITE,
          });

          const runningHeaderY = height - RUNNING_HEADER_Y_OFFSET;

          if (isEvenPage) {
            // Even Page Header: Left: ©Year ShortName || Website, Right: Author et al.
            const evenLeftText = `©${metadata.year} ${metadata.journalShortName || 'IJITEST'} ||${cleanWebsite}`;
            page.drawText(evenLeftText, {
              x: P1_MARGIN_X,
              y: runningHeaderY,
              size: RUNNING_HEADER_FONT_SIZE,
              font: fontRegular,
              color: BRAND_RED,
            });

            const evenPrefix = `©${metadata.year} ${metadata.journalShortName || 'IJITEST'} ||`;
            const prefixWidth = fontRegular.widthOfTextAtSize(evenPrefix, RUNNING_HEADER_FONT_SIZE);
            const webWidth = fontRegular.widthOfTextAtSize(cleanWebsite, RUNNING_HEADER_FONT_SIZE);
            addLinkAnnotation(
              pdfDoc,
              page,
              P1_MARGIN_X + prefixWidth,
              runningHeaderY,
              webWidth,
              RUNNING_HEADER_FONT_SIZE,
              globalWebsiteUrl,
            );

            const authorText = metadata.firstAuthor
              ? `${metadata.firstAuthor} et al.`
              : 'Author et al.';
            const authorWidth = fontRegular.widthOfTextAtSize(authorText, RUNNING_HEADER_FONT_SIZE);
            page.drawText(authorText, {
              x: width - P1_MARGIN_X - authorWidth,
              y: runningHeaderY,
              size: RUNNING_HEADER_FONT_SIZE,
              font: fontRegular,
              color: BRAND_RED,
            });
          } else {
          // Odd Page Header: Running Short Title (Left-aligned)
            let oddTitle = metadata.runningTitle || metadata.journalName;
            const maxOddWidth = width - P1_MARGIN_X * 2;
            if (fontRegular.widthOfTextAtSize(oddTitle, RUNNING_HEADER_FONT_SIZE) > maxOddWidth) {
              while (
                oddTitle.length > 10 &&
                fontRegular.widthOfTextAtSize(`${oddTitle}…`, RUNNING_HEADER_FONT_SIZE) > maxOddWidth
              ) {
                oddTitle = oddTitle.slice(0, -1);
              }
              oddTitle = `${oddTitle}…`;
            }

            page.drawText(oddTitle, {
              x: P1_MARGIN_X,
              y: runningHeaderY,
              size: RUNNING_HEADER_FONT_SIZE,
              font: fontRegular,
              color: BRAND_RED,
            });
          }
        }

        // =========================================================
        // FOOTER OVERLAY
        // =========================================================
        if (isFirstPage) {
          // Page 1 Footer Overlay (4-tier left-aligned block matching exact template)
          page.drawRectangle({
            x: 0,
            y: 0,
            width,
            height: P1_FOOTER_HEIGHT,
            color: WHITE,
          });

          // Left Line 1 (y=58): DOI
          const doiDisplay = cleanDoiSuffix
            ? `DOI: 10.68139/${cleanDoiSuffix.replace(/^10\.68139\//, '')}`
            : (metadata.doi || 'DOI: 10.68139.');

          page.drawText(doiDisplay, {
            x: P1_MARGIN_X,
            y: P1_FOOTER_LINE1_Y,
            size: P1_FOOTER_FONT_SIZE,
            font: fontBold,
            color: BRAND_RED,
          });

          if (globalDoiUrl) {
            const doiWidth = fontBold.widthOfTextAtSize(doiDisplay, P1_FOOTER_FONT_SIZE);
            addLinkAnnotation(
              pdfDoc,
              page,
              P1_MARGIN_X,
              P1_FOOTER_LINE1_Y,
              doiWidth,
              P1_FOOTER_FONT_SIZE,
              globalDoiUrl,
            );
          }

          // Left Line 2 (y=46): Paper ID | Volume ...
          const line2LeftText = `${metadata.paperId} | Volume ${metadata.volume}, Issue ${metadata.issue}, ${monthText}${metadata.year} | ISSN: ${metadata.issn}`;
          page.drawText(line2LeftText, {
            x: P1_MARGIN_X,
            y: P1_FOOTER_LINE2_Y,
            size: P1_FOOTER_FONT_SIZE,
            font: fontBold,
            color: BRAND_RED,
          });

          // Paper ID hotspot link in Line 2
          const paperIdWidth = fontBold.widthOfTextAtSize(metadata.paperId, P1_FOOTER_FONT_SIZE);
          addLinkAnnotation(
            pdfDoc,
            page,
            P1_MARGIN_X,
            P1_FOOTER_LINE2_Y,
            paperIdWidth,
            P1_FOOTER_FONT_SIZE,
            articleUrl,
          );

          // Right Line 2 (y=46): Website URL in blue hyperlink style
          const rightWebText = cleanWebsite;
          const rightWebWidth = fontBold.widthOfTextAtSize(rightWebText, P1_FOOTER_FONT_SIZE);
          const rightWebX = width - P1_MARGIN_X - rightWebWidth;

          page.drawText(rightWebText, {
            x: rightWebX,
            y: P1_FOOTER_LINE2_Y,
            size: P1_FOOTER_FONT_SIZE,
            font: fontBold,
            color: LINK_BLUE,
          });

          // Underline for website link
          page.drawLine({
            start: { x: rightWebX, y: P1_FOOTER_LINE2_Y - 2 },
            end: { x: rightWebX + rightWebWidth, y: P1_FOOTER_LINE2_Y - 2 },
            thickness: 0.8,
            color: LINK_BLUE,
          });

          addLinkAnnotation(
            pdfDoc,
            page,
            rightWebX,
            P1_FOOTER_LINE2_Y,
            rightWebWidth,
            P1_FOOTER_FONT_SIZE,
            globalWebsiteUrl,
          );

          // Left Line 3 (y=34): Creative Commons License
          const licenseText =
            metadata.license || 'Creative Commons Attribution 4.0 International License';

          page.drawText(licenseText, {
            x: P1_MARGIN_X,
            y: P1_FOOTER_LINE3_Y,
            size: P1_FOOTER_FONT_SIZE,
            font: fontBold,
            color: BRAND_RED,
          });

          // Left Line 4 (y=22): Lifecycle Dates (Article Received | Accepted)
          const received = metadata.receivedDate || 'Month Date, Year';
          const accepted = metadata.acceptedDate || 'Month Date, Year';
          const datesLine = `Article Received: ${received} | Accepted: ${accepted}`;

          page.drawText(datesLine, {
            x: P1_MARGIN_X,
            y: P1_FOOTER_LINE4_Y,
            size: P1_FOOTER_FONT_SIZE,
            font: fontBold,
            color: BRAND_RED,
          });

          // Right Line 4 (y=22): Page Number (e.g. "1")
          const p1NumText = `${currentPageNumber}`;
          const p1NumWidth = fontRegular.widthOfTextAtSize(p1NumText, 10);
          page.drawText(p1NumText, {
            x: width - P1_MARGIN_X - p1NumWidth,
            y: P1_FOOTER_LINE4_Y,
            size: 10,
            font: fontRegular,
            color: BRAND_BLACK,
          });
        } else {
          // Running Footers (Pages 2+) - Only display Page Number
          page.drawRectangle({
            x: 0,
            y: 0,
            width,
            height: RUNNING_FOOTER_HEIGHT,
            color: WHITE,
          });

          // Right: Dynamic Page Number
          const pageNumText = `${currentPageNumber}`;
          const pageNumWidth = fontRegular.widthOfTextAtSize(
            pageNumText,
            RUNNING_PAGE_NUM_FONT_SIZE,
          );
          page.drawText(pageNumText, {
            x: width - P1_MARGIN_X - pageNumWidth,
            y: RUNNING_FOOTER_Y,
            size: RUNNING_PAGE_NUM_FONT_SIZE,
            font: fontRegular,
            color: BRAND_BLACK,
          });
        }
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

  /**
   * Generates a unified Issue Full-Book PDF with Table of Contents (TOC) and merges all published articles.
   */
  async generateIssueBook(
    outputPath: string,
    metadata: IssueBookMetadataDto,
  ): Promise<{
    success: boolean;
    outputPath: string;
    totalPages: number;
    articleCount: number;
    fileSize: number;
  }> {
    try {
      const pdfDoc = await PDFDocument.create();

      // Standard A4 dimensions (595.28 x 841.89 points)
      const pageWidth = 595.28;
      const pageHeight = 841.89;

      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

      const primaryColor = rgb(0.12, 0.23, 0.38); // Academic Navy
      const goldColor = rgb(0.79, 0.64, 0.28);    // Rich Gold
      const charcoalColor = rgb(0.2, 0.2, 0.2);
      const mutedColor = rgb(0.45, 0.45, 0.45);

      // Helper: Draw centered text
      const drawCentered = (
        targetPage: PDFPage,
        text: string,
        y: number,
        font: PDFFont,
        size: number,
        color = charcoalColor,
      ) => {
        const textWidth = font.widthOfTextAtSize(text, size);
        const x = (pageWidth - textWidth) / 2;
        targetPage.drawText(text, { x, y, size, font, color });
      };

      // Helper: Wrap text to max width
      const wrapText = (
        text: string,
        font: PDFFont,
        size: number,
        maxWidth: number,
      ): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
      };

      // Helper: Initialize a styled Table of Contents page
      const createTocPage = (pageNumber: number): { page: PDFPage; startY: number } => {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Dual Decorative Borders
        page.drawRectangle({
          x: 25,
          y: 25,
          width: pageWidth - 50,
          height: pageHeight - 50,
          borderWidth: 2,
          borderColor: primaryColor,
        });
        page.drawRectangle({
          x: 31,
          y: 31,
          width: pageWidth - 62,
          height: pageHeight - 62,
          borderWidth: 1,
          borderColor: goldColor,
        });

        // Journal Header
        let y = pageHeight - 65;
        drawCentered(page, metadata.journalName.toUpperCase(), y, fontBold, 11, primaryColor);

        y -= 14;
        const sub = `ISSN: ${metadata.issn} (Online)  |  CrossRef Official Prefix: 10.68139  |  Open Access`;
        drawCentered(page, sub, y, fontRegular, 8.5, goldColor);

        y -= 12;
        page.drawLine({
          start: { x: 50, y },
          end: { x: pageWidth - 50, y },
          thickness: 0.8,
          color: goldColor,
        });

        y -= 26;
        const issueTitle = `Volume ${metadata.volume}, Issue ${metadata.issue} (${metadata.monthRange ? metadata.monthRange + ' ' : ''}${metadata.year})`;
        drawCentered(page, issueTitle, y, fontBold, 13, primaryColor);

        y -= 18;
        drawCentered(
          page,
          pageNumber === 1 ? 'TABLE OF CONTENTS' : 'TABLE OF CONTENTS (CONTINUED)',
          y,
          fontBold,
          10.5,
          goldColor,
        );

        y -= 10;
        page.drawLine({
          start: { x: 180, y },
          end: { x: pageWidth - 180, y },
          thickness: 1,
          color: goldColor,
        });

        y -= 22;
        return { page, startY: y };
      };

      // 1. Build Table of Contents Pages
      let tocPageCount = 1;
      let { page: currentTocPage, startY: currentY } = createTocPage(tocPageCount);

      const contentLeftX = 55;
      const contentRightX = pageWidth - 55;
      const maxContentWidth = contentRightX - contentLeftX - 70; // Leave space for page tag on right

      for (let i = 0; i < metadata.articles.length; i++) {
        const article = metadata.articles[i];
        if (!article) continue;

        const titleLines = wrapText(article.title, fontBold, 9.5, maxContentWidth);
        const authorsText = article.authors.length > 0 ? article.authors.join(', ') : 'Author(s)';
        const authorsLines = wrapText(authorsText, fontOblique, 8.5, maxContentWidth);

        // Required height for this article block
        const blockHeight = (titleLines.length * 12) + (authorsLines.length * 11) + 18 + 14;

        // Check if we need a new TOC page
        if (currentY - blockHeight < 60) {
          tocPageCount++;
          const next = createTocPage(tocPageCount);
          currentTocPage = next.page;
          currentY = next.startY;
        }

        // Article Title
        for (const tLine of titleLines) {
          currentTocPage.drawText(tLine, {
            x: contentLeftX,
            y: currentY,
            size: 9.5,
            font: fontBold,
            color: primaryColor,
          });
          currentY -= 12;
        }

        // Authors
        for (const aLine of authorsLines) {
          currentTocPage.drawText(aLine, {
            x: contentLeftX,
            y: currentY,
            size: 8.5,
            font: fontOblique,
            color: charcoalColor,
          });
          currentY -= 11;
        }

        // Meta (DOI & Paper ID)
        const metaStr = article.doi ? `DOI: 10.68139/${article.doi.replace(/^10\.68139\//, '')}  |  Paper ID: ${article.paperId}` : `Paper ID: ${article.paperId}`;
        currentTocPage.drawText(metaStr, {
          x: contentLeftX,
          y: currentY,
          size: 7.5,
          font: fontRegular,
          color: mutedColor,
        });

        // Page Range on the right
        const pageLabel = article.startPage && article.endPage
          ? `pp. ${article.startPage}–${article.endPage}`
          : `Article ${i + 1}`;
        const pageLabelWidth = fontBold.widthOfTextAtSize(pageLabel, 9);
        currentTocPage.drawText(pageLabel, {
          x: contentRightX - pageLabelWidth,
          y: currentY + 12,
          size: 9,
          font: fontBold,
          color: goldColor,
        });

        // Subtle divider
        currentY -= 10;
        currentTocPage.drawLine({
          start: { x: contentLeftX, y: currentY },
          end: { x: contentRightX, y: currentY },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.85),
        });

        currentY -= 14;
      }

      // 2. Concatenate Article PDFs
      let successfullyMerged = 0;
      for (const article of metadata.articles) {
        try {
          const cleanArticlePath = article.pdfPath
            .replace(/^[/\\]+/, '')
            .replace(/^api[/\\]files[/\\]/i, '')
            .replace(/^uploads[/\\]/i, '');
          const fileStream = await this.storageService.getFileStream(cleanArticlePath);
          const pdfBuffer = await this.streamToBuffer(fileStream);
          const articleDoc = await PDFDocument.load(pdfBuffer);
          const copiedPages = await pdfDoc.copyPages(articleDoc, articleDoc.getPageIndices());

          for (const cPage of copiedPages) {
            pdfDoc.addPage(cPage);
          }
          successfullyMerged++;
        } catch (mergeErr) {
          console.warn(`[generateIssueBook] Could not merge ${article.paperId} from ${article.pdfPath}:`, mergeErr);
        }
      }

      // 3. Save combined PDF and upload to storage
      const finalPdfBytes = await pdfDoc.save();
      const readablePdf = Readable.from(Buffer.from(finalPdfBytes));
      await this.storageService.uploadFile(outputPath, readablePdf);

      return {
        success: true,
        outputPath,
        totalPages: pdfDoc.getPageCount(),
        articleCount: successfullyMerged,
        fileSize: finalPdfBytes.length,
      };
    } catch (error) {
      console.error('Complete Issue Book Generation Error:', error);
      throw new BadRequestException(
        `Failed to generate complete issue book: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
