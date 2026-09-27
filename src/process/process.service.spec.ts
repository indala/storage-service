import 'reflect-metadata';
import { describe, expect, it, jest } from '@jest/globals';
import { Readable } from 'stream';
import { PDFDocument } from 'pdf-lib';
import { ProcessService } from './process.service';
import * as path from 'path';

describe('ProcessService - brandPdf', () => {
  it('brands a multi-page PDF document with academic header and footer overlays', async () => {
    // 1. Create a dummy 3-page PDF
    const testDoc = await PDFDocument.create();
    testDoc.addPage([595.28, 841.89]); // Page 1
    testDoc.addPage([595.28, 841.89]); // Page 2 (Even)
    testDoc.addPage([595.28, 841.89]); // Page 3 (Odd)
    const initialPdfBytes = await testDoc.save();

    let uploadedBuffer: Buffer | null = null;

    const mockStorageService = {
      getFileStream: jest.fn().mockImplementation(() => {
        return Readable.from(Buffer.from(initialPdfBytes));
      }),
      uploadFile: jest.fn(async (outputPath: string, stream: Readable) => {
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk as Uint8Array);
        }
        uploadedBuffer = Buffer.concat(chunks);
        return outputPath;
      }),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'ASSETS_DIR') {
          return path.resolve(process.cwd(), 'assets');
        }
        return null;
      }),
    };

    const service = new ProcessService(
      mockConfigService as never,
      mockStorageService as never,
    );

    const brandingMeta = {
      journalName: 'International Journal of Innovative Trends in Engineering Science and Technology',
      journalShortName: 'IJITEST',
      volume: 1,
      issue: 1,
      year: 2026,
      monthRange: 'Jan-Feb',
      issn: '3139-6887',
      website: 'www.ijitest.org',
      paperId: 'IJITEST-2026-001',
      startPage: 1,
      endPage: 3,
      doi: '10.68139/ijitest.2026.01.001',
      receivedDate: 'January 10, 2026',
      acceptedDate: 'February 15, 2026',
      runningTitle: 'A Novel Deep Learning Architecture for IoT Networks',
      firstAuthor: 'A. Sharma',
      license: 'Creative Commons Attribution 4.0 International License',
    };

    await expect(
      service.brandPdf(
        'submissions/sample.pdf',
        'published/sample-branded.pdf',
        brandingMeta,
      ),
    ).resolves.toBeUndefined();

    expect(mockStorageService.getFileStream).toHaveBeenCalledWith('submissions/sample.pdf');
    expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
      'published/sample-branded.pdf',
      expect.any(Readable),
    );

    expect(uploadedBuffer).not.toBeNull();
    const resultDoc = await PDFDocument.load(uploadedBuffer!);
    expect(resultDoc.getPageCount()).toBe(3);
  });
});
