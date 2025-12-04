import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import {
  CartItemDto,
  AddToCartDto,
  UpdateCartItemDto,
} from './cart.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get my cart items (customer only)' })
  @ApiResponse({
    status: 200,
    description: 'List of cart items',
    type: [CartItemDto],
  })
  findByUser(@Request() req): Promise<CartItemDto[]> {
    return this.cartService.findByUser(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add item to cart (customer only)' })
  @ApiResponse({
    status: 201,
    description: 'Item added to cart',
    type: CartItemDto,
  })
  addToCart(
    @Request() req,
    @Body() addToCartDto: AddToCartDto,
  ): Promise<CartItemDto> {
    return this.cartService.addToCart(req.user.id, addToCartDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update cart item quantity (customer only)' })
  @ApiParam({ name: 'id', description: 'Cart item UUID' })
  @ApiResponse({
    status: 200,
    description: 'Cart item updated',
    type: CartItemDto,
  })
  updateItem(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartItemDto> {
    return this.cartService.updateItem(req.user.id, id, updateCartItemDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove item from cart (customer only)' })
  @ApiParam({ name: 'id', description: 'Cart item UUID' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  removeItem(@Request() req, @Param('id') id: string): Promise<void> {
    return this.cartService.removeItem(req.user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart (customer only)' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  clearCart(@Request() req): Promise<void> {
    return this.cartService.clearCart(req.user.id);
  }
}
