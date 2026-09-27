"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const config_1 = require("@nestjs/config");
const process_service_1 = require("../src/process/process.service");
const storage_service_1 = require("../src/storage/storage.service");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
async function main() {
    const testOutputsDir = path.resolve(__dirname, '../test_outputs');
    await fs.mkdir(testOutputsDir, { recursive: true });
    const tempStorageRoot = path.join(os.tmpdir(), 'ijitest-storage-test-' + Date.now());
    const tempSubmissionsDir = path.join(tempStorageRoot, 'submissions');
    const tempPublishedDir = path.join(tempStorageRoot, 'published');
    await fs.mkdir(tempSubmissionsDir, { recursive: true });
    await fs.mkdir(tempPublishedDir, { recursive: true });
    try {
        const moduleRef = await testing_1.Test.createTestingModule({
            imports: [
                config_1.ConfigModule.forRoot({
                    isGlobal: true,
                    load: [
                        () => ({
                            ASSETS_DIR: path.resolve(__dirname, '../assets'),
                            STORAGE_DIR: tempStorageRoot,
                        }),
                    ],
                }),
            ],
            providers: [process_service_1.ProcessService, storage_service_1.StorageService],
        }).compile();
        const processService = moduleRef.get(process_service_1.ProcessService);
        const sourcePdfPath = path.resolve(__dirname, '../../updated_files/new_template/Templete_new.pdf');
        const tempSubmissionsRelPath = 'submissions/templete_sample.pdf';
        const targetSubmissionsAbsPath = path.join(tempStorageRoot, tempSubmissionsRelPath);
        await fs.copyFile(sourcePdfPath, targetSubmissionsAbsPath);
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
        const brandedAbsPath = path.join(tempStorageRoot, brandedRelPath);
        const testOutputBrandedPdf = path.join(testOutputsDir, 'branded_output.pdf');
        await fs.copyFile(brandedAbsPath, testOutputBrandedPdf);
        console.log(`Generated branded output at: ${testOutputBrandedPdf}`);
    }
    finally {
        try {
            await fs.rm(tempStorageRoot, { recursive: true, force: true });
        }
        catch {
        }
    }
}
main().catch((err) => {
    console.error('Error generating test output:', err);
    process.exit(1);
});
//# sourceMappingURL=generate-test-output.js.map