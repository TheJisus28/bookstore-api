import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
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
import { OrdersService } from './orders.service';
import {
  OrderDto,
  OrderItemDto,
  CreateOrderDto,
  UpdateOrderStatusDto,
} from './order.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of all orders',
    type: PaginatedResponseDto<OrderDto>,
  })
  findAllAdmin(
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<OrderDto>> {
    return this.ordersService.findAll(pagination);
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my orders (customer)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of my orders',
    type: PaginatedResponseDto<OrderDto>,
  })
  findMyOrders(
    @Request() req,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<OrderDto>> {
    return this.ordersService.findAll(pagination, req.user.id);
  }

  @Get('my-books')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my purchased books (customer)' })
  @ApiResponse({
    status: 200,
    description: 'List of purchased books with review status',
  })
  findMyBooks(@Request() req): Promise<any[]> {
    return this.ordersService.findMyPurchasedBooks(req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create order from cart (customer)' })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: OrderDto,
  })
  create(
    @Request() req,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderDto> {
    return this.ordersService.create(req.user.id, createOrderDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order details', type: OrderDto })
  findOne(@Request() req, @Param('id') id: string): Promise<OrderDto | null> {
    const userId = req.user.role === 'admin' ? undefined : req.user.id;
    return this.ordersService.findOne(id, userId);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (admin only)' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated',
    type: OrderDto,
  })
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderDto> {
    return this.ordersService.updateStatus(id, updateOrderStatusDto);
  }

  @Get(':id/items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order items' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Order items',
    type: [OrderItemDto],
  })
  async findOrderItems(
    @Request() req,
    @Param('id') id: string,
  ): Promise<OrderItemDto[]> {
    // Verify user has access to this order
    const userId = req.user.role === 'admin' ? undefined : req.user.id;
    await this.ordersService.findOne(id, userId);
    return this.ordersService.findOrderItems(id);
  }
}
