import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/config/database/database.config';
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

@Injectable()
export class OrdersService {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async findAll(
    pagination: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<OrderDto>> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const queryParams: any[] = [];

    if (userId) {
      whereClause = 'WHERE user_id = $1';
      queryParams.push(userId);
    }

    const countQuery = `SELECT COUNT(*) FROM orders ${whereClause}`;
    const countResult = await this.pool.query(
      whereClause ? countQuery : countQuery.replace('WHERE', ''),
      queryParams,
    );
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    const result = await this.pool.query(dataQuery, [
      ...queryParams,
      limit,
      offset,
    ]);

    return {
      data: result.rows as OrderDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string): Promise<OrderDto | null> {
    const result = await this.pool.query('SELECT * FROM orders WHERE id = $1', [
      id,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const order = result.rows[0] as OrderDto;

    // Check if user has permission to view this order
    if (userId && order.user_id !== userId) {
      throw new ForbiddenException('You can only view your own orders');
    }

    return order;
  }

  async create(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderDto> {
    const { address_id, discount_code } = createOrderDto;

    // Use the stored procedure to process checkout
    await this.pool.query('CALL process_checkout($1, $2, $3)', [
      userId,
      address_id,
      discount_code || null,
    ]);

    // Get the created order
    const result = await this.pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId],
    );

    return result.rows[0] as OrderDto;
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderDto> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    const { status } = updateOrderStatusDto;
    const updateFields: string[] = [
      'status = $1',
      'updated_at = CURRENT_TIMESTAMP',
    ];

    if (status === 'shipped') {
      updateFields.push('shipped_at = CURRENT_TIMESTAMP');
    } else if (status === 'delivered') {
      updateFields.push('delivered_at = CURRENT_TIMESTAMP');
    }

    // status is $1, id is $2
    const result = await this.pool.query(
      `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $2 RETURNING *`,
      [status, id],
    );

    return result.rows[0] as OrderDto;
  }

  async findOrderItems(orderId: string): Promise<OrderItemDto[]> {
    const result = await this.pool.query(
      `SELECT 
        oi.id,
        oi.order_id,
        oi.book_id,
        oi.quantity,
        oi.unit_price,
        oi.subtotal,
        oi.created_at,
        b.title,
        b.isbn,
        b.cover_image_url
      FROM order_items oi
      JOIN books b ON oi.book_id = b.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at`,
      [orderId],
    );
    return result.rows as OrderItemDto[];
  }

  async findMyPurchasedBooks(userId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT
        b.id,
        b.title,
        b.isbn,
        b.price,
        b.cover_image_url,
        b.description,
        b.language,
        b.pages,
        b.publication_date,
        MAX(o.created_at) as last_purchased_at,
        CASE WHEN r.id IS NOT NULL THEN true ELSE false END as has_review,
        r.id as review_id,
        r.rating as review_rating,
        r.comment as review_comment
      FROM books b
      INNER JOIN order_items oi ON b.id = oi.book_id
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN reviews r ON b.id = r.book_id AND r.user_id = $1
      WHERE o.user_id = $1 
        AND o.status IN ('shipped', 'delivered', 'completed')
      GROUP BY b.id, b.title, b.isbn, b.price, b.cover_image_url, b.description, 
               b.language, b.pages, b.publication_date, r.id, r.rating, r.comment
      ORDER BY last_purchased_at DESC`,
      [userId],
    );
    return result.rows;
  }
}
