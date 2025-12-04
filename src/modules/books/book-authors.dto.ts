import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class BookAuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  book_id: string;

  @ApiProperty()
  author_id: string;

  @ApiProperty()
  is_primary: boolean;

  @ApiProperty()
  created_at: Date;
}

export class AddAuthorToBookDto {
  @ApiProperty()
  @IsUUID()
  author_id: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class BookWithAuthorsDto {
  @ApiProperty()
  book_id: string;

  @ApiProperty()
  book_title: string;

  @ApiProperty()
  author_id: string;

  @ApiProperty()
  author_name: string;

  @ApiProperty()
  is_primary: boolean;
}

