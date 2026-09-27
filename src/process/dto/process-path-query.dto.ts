import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

const RELATIVE_PATH_PATTERN =
  /^(?![\\/])(?![A-Za-z]:[\\/])(?!.*(?:^|[\\/])\.\.(?:[\\/]|$))[^\0]+$/;

export class ProcessPathQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(RELATIVE_PATH_PATTERN, {
    message: 'inputPath must be a relative path without traversal segments',
  })
  inputPath!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(RELATIVE_PATH_PATTERN, {
    message: 'outputPath must be a relative path without traversal segments',
  })
  outputPath!: string;
}

export class IssueBookPathQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(RELATIVE_PATH_PATTERN, {
    message: 'outputPath must be a relative path without traversal segments',
  })
  outputPath!: string;
}
