import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  BrandingMetadataDto,
  IssueBookMetadataDto,
} from './process-metadata.dto';

const validBrandingMetadata = {
  journalName: 'IJITEST Journal',
  journalShortName: 'IJT',
  volume: 1,
  issue: 1,
  year: 2026,
  issn: '1234-5678',
  website: 'https://ijitest.org',
  paperId: 'paper-1',
};

describe('process metadata DTOs', () => {
  it('accepts valid branding metadata', async () => {
    const dto = plainToInstance(BrandingMetadataDto, validBrandingMetadata);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts valid branding metadata with optional fields', async () => {
    const dto = plainToInstance(BrandingMetadataDto, {
      ...validBrandingMetadata,
      receivedDate: 'March 15, 2026',
      acceptedDate: 'April 20, 2026',
      runningTitle: 'A Deep Learning Study on IoT Systems',
      firstAuthor: 'Smith',
      license: 'Creative Commons Attribution 4.0 International License',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid issue metadata values', async () => {
    const dto = plainToInstance(BrandingMetadataDto, {
      ...validBrandingMetadata,
      volume: 0,
      year: 1899,
      website: '',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('rejects unsafe paths in nested issue articles', async () => {
    const dto = plainToInstance(IssueBookMetadataDto, {
      journalName: 'IJITEST Journal',
      journalShortName: 'IJT',
      volume: 1,
      issue: 1,
      year: 2026,
      issn: '1234-5678',
      articles: [
        {
          paperId: 'paper-1',
          title: 'A published article',
          authors: ['Author One'],
          pdfPath: '../outside.pdf',
        },
      ],
    });

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });
});
