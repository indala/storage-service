import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ProcessService } from '../src/process/process.service';
import { StorageService } from '../src/storage/storage.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

async function main() {
  const testOutputsDir = path.resolve(__dirname, '../test_outputs');
  await fs.mkdir(testOutputsDir, { recursive: true });

  // Use an isolated temporary directory so live storage/ is never touched
  const tempStorageRoot = path.join(os.tmpdir(), 'ijitest-storage-test-' + Date.now());
  const tempSubmissionsDir = path.join(tempStorageRoot, 'submissions');
  const tempPublishedDir = path.join(tempStorageRoot, 'published');
  await fs.mkdir(tempSubmissionsDir, { recursive: true });
  await fs.mkdir(tempPublishedDir, { recursive: true });

  try {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              ASSETS_DIR: path.resolve(__dirname, '../assets'),
              STORAGE_DIR: tempStorageRoot,
            }),
          ],
        }),
      ],
      providers: [ProcessService, StorageService],
    }).compile();

    const processService = moduleRef.get<ProcessService>(ProcessService);

    // 1. Copy Templete_new.pdf into isolated temporary test storage
    const sourcePdfPath = path.resolve(__dirname, '../../updated_files/new_template/Templete_new.pdf');
    const tempSubmissionsRelPath = 'submissions/templete_sample.pdf';
    const targetSubmissionsAbsPath = path.join(tempStorageRoot, tempSubmissionsRelPath);
    await fs.copyFile(sourcePdfPath, targetSubmissionsAbsPath);

    // 2. Brand Templete_new.pdf
    const brandedRelPath = 'published/Templete_new_branded.pdf';
    const metadata = {
      journalName: 'International Journal of Innovative Trends in Engineering Science and Technology',
      journalShortName: 'IJITEST',
      volume: 1,
      issue: 1,
      year: 2026,
      monthRange: 'March',
      issn: '3139-6887',
      website: 'www.ijitest.org',
      paperId: 'IJITEST-2026-020',
      startPage: 1,
      endPage: 4,
      doi: '10.68139',
      receivedDate: 'Month Date, Year',
      acceptedDate: 'Month Date, Year',
      runningTitle: 'International Journal of Innovative Trends in Engineering Science and Technology',
      firstAuthor: 'Author',
      license: 'Creative Commons Attribution 4.0 International License',
    };

    console.log('Branding Templete_new.pdf in isolated test environment...');
    await processService.brandPdf(tempSubmissionsRelPath, brandedRelPath, metadata);

    // 3. Copy resulting branded PDF solely to test_outputs/branded_output.pdf
    const brandedAbsPath = path.join(tempStorageRoot, brandedRelPath);
    const testOutputBrandedPdf = path.join(testOutputsDir, 'branded_output.pdf');
    await fs.copyFile(brandedAbsPath, testOutputBrandedPdf);
    console.log(`Generated branded output at: ${testOutputBrandedPdf}`);
  } finally {
    // Cleanup temporary isolated storage
    try {
      await fs.rm(tempStorageRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

main().catch((err) => {
  console.error('Error generating test output:', err);
  process.exit(1);
});
