import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional } from 'class-validator';

export class OrderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  address_id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  total_amount: number;

  @ApiProperty()
  shipping_cost: number;

  @ApiProperty()
  discount_amount: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({ required: false })
  shipped_at?: Date;

  @ApiProperty({ required: false })
  delivered_at?: Date;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsUUID()
  address_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  discount_code?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty()
  @IsString()
  status: string;
}

export class OrderItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  order_id: string;

  @ApiProperty()
  book_id: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unit_price: number;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  created_at: Date;
}
