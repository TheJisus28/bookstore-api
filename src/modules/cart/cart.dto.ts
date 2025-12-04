import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min } from 'class-validator';

export class CartItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  book_id: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty()
  title: string;

  @ApiProperty()
  price: number;

  @ApiProperty({ required: false })
  cover_image_url?: string;
}

export class AddToCartDto {
  @ApiProperty()
  @IsUUID()
  book_id: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;
}
