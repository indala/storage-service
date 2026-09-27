import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  IssueBookPathQueryDto,
  ProcessPathQueryDto,
} from './process-path-query.dto';

describe('process path DTOs', () => {
  it('rejects traversal in processing paths', async () => {
    const dto = plainToInstance(ProcessPathQueryDto, {
      inputPath: 'submissions/input.docx',
      outputPath: '../outside/output.pdf',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('accepts valid issue-book output paths', async () => {
    const dto = plainToInstance(IssueBookPathQueryDto, {
      outputPath: 'issues/volume-1-issue-1.pdf',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
