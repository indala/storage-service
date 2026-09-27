import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class StoragePathQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(/^(?![\\/])(?![A-Za-z]:[\\/])(?!.*(?:^|[\\/])\.\.(?:[\\/]|$))[^\0]+$/, {
    message: 'path must be a relative path without traversal segments',
  })
  path!: string;
}
