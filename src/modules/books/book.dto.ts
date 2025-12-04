import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  IsDateString,
} from 'class-validator';

export class BookDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  isbn: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  stock: number;

  @ApiProperty({ required: false })
  pages?: number;

  @ApiProperty({ required: false })
  publication_date?: Date;

  @ApiProperty()
  language: string;

  @ApiProperty({ required: false })
  publisher_id?: string;

  @ApiProperty({ required: false })
  category_id?: string;

  @ApiProperty({ required: false })
  cover_image_url?: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty()
  is_active: boolean;
}

export class CreateBookDto {
  @ApiProperty()
  @IsString()
  isbn: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  pages?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  publication_date?: string;

  @ApiProperty({ required: false, default: 'Spanish' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  publisher_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cover_image_url?: string;
}

export class UpdateBookDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  isbn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  pages?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  publication_date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  publisher_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cover_image_url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class BookSearchResultDto {
  @ApiProperty()
  book_id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  average_rating: number;

  @ApiProperty()
  total_reviews: number;

  @ApiProperty({ required: false })
  publisher_name?: string;

  @ApiProperty({ required: false })
  category_name?: string;
}
