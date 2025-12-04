import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class AuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiProperty({ required: false })
  bio?: string;

  @ApiProperty({ required: false })
  birth_date?: Date;

  @ApiProperty({ required: false })
  nationality?: string;

  @ApiProperty()
  created_at: Date;
}

export class CreateAuthorDto {
  @ApiProperty()
  @IsString()
  first_name: string;

  @ApiProperty()
  @IsString()
  last_name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nationality?: string;
}

export class UpdateAuthorDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nationality?: string;
}

