import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const RELATIVE_PATH_PATTERN =
  /^(?![\\/])(?![A-Za-z]:[\\/])(?!.*(?:^|[\\/])\.\.(?:[\\/]|$))[^\0]+$/;

export class BrandingMetadataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  journalName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  journalShortName!: string;

  @IsInt()
  @Min(1)
  volume!: number;

  @IsInt()
  @Min(1)
  issue!: number;

  @IsInt()
  @Min(1900)
  year!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  monthRange?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  issn!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  website!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  paperId!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  startPage?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  endPage?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  doi?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  license?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  receivedDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  acceptedDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  runningTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstAuthor?: string | null;
}

export class IssueArticleItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  paperId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  authors!: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(RELATIVE_PATH_PATTERN, {
    message: 'pdfPath must be a relative path without traversal segments',
  })
  pdfPath!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  startPage?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  endPage?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  doi?: string | null;
}

export class IssueBookMetadataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  journalName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  journalShortName!: string;

  @IsInt()
  @Min(1)
  volume!: number;

  @IsInt()
  @Min(1)
  issue!: number;

  @IsInt()
  @Min(1900)
  year!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  monthRange?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  issn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IssueArticleItemDto)
  articles!: IssueArticleItemDto[];
}
