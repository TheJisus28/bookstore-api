import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/config/database/database.config';

@Injectable()
export class ReportsService {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async generateSalesReport(
    startDate: string,
    endDate: string,
    categoryId?: string,
    authorId?: string,
    publisherId?: string,
    bookId?: string,
    minPrice?: number,
    maxPrice?: number,
    orderStatus?: string,
  ): Promise<any[]> {
    // Build the query with optional filters
    let whereConditions = [
      `o.created_at::DATE BETWEEN $1 AND $2`,
    ];
    const queryParams: any[] = [startDate, endDate];
    let paramIndex = 3;

    // Status filter
    if (orderStatus) {
      whereConditions.push(`o.status = $${paramIndex}`);
      queryParams.push(orderStatus);
      paramIndex++;
    } else {
      whereConditions.push(`o.status IN ('shipped', 'delivered', 'completed')`);
    }

    // Category filter
    if (categoryId) {
      whereConditions.push(`b.category_id = $${paramIndex}`);
      queryParams.push(categoryId);
      paramIndex++;
    }

    // Author filter
    if (authorId) {
      whereConditions.push(`ba.author_id = $${paramIndex}`);
      queryParams.push(authorId);
      paramIndex++;
    }

    // Publisher filter
    if (publisherId) {
      whereConditions.push(`b.publisher_id = $${paramIndex}`);
      queryParams.push(publisherId);
      paramIndex++;
    }

    // Book filter
    if (bookId) {
      whereConditions.push(`oi.book_id = $${paramIndex}`);
      queryParams.push(bookId);
      paramIndex++;
    }

    // Price filters
    if (minPrice !== undefined && minPrice !== null) {
      whereConditions.push(`oi.unit_price >= $${paramIndex}`);
      queryParams.push(minPrice);
      paramIndex++;
    }

    if (maxPrice !== undefined && maxPrice !== null) {
      whereConditions.push(`oi.unit_price <= $${paramIndex}`);
      queryParams.push(maxPrice);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Build joins - always need books for filters
    let joins = `
      FROM orders o
      INNER JOIN order_items oi ON o.id = oi.order_id
      INNER JOIN books b ON oi.book_id = b.id
    `;

    // Add author join only if filtering by author
    if (authorId) {
      joins += ` INNER JOIN book_authors ba ON b.id = ba.book_id`;
    }

    // Always need order totals for average calculation
    joins += `
      INNER JOIN (
        SELECT 
          order_id,
          SUM(subtotal) as order_total
        FROM order_items
        GROUP BY order_id
      ) order_totals ON o.id = order_totals.order_id
    `;

    const query = `
      SELECT 
        DATE_TRUNC('day', o.created_at)::DATE as sale_date,
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT o.user_id) as unique_customers,
        SUM(oi.subtotal) as total_revenue,
        SUM(oi.quantity) as total_items_sold,
        AVG(order_totals.order_total) as average_order_value
      ${joins}
      WHERE ${whereClause}
      GROUP BY DATE_TRUNC('day', o.created_at)::DATE
      ORDER BY sale_date
    `;

    const result = await this.pool.query(query, queryParams);
    return result.rows;
  }

  async getBookCatalog(): Promise<any[]> {
    const result = await this.pool.query('SELECT * FROM book_catalog LIMIT 100');
    return result.rows;
  }

  async getOrderSummary(): Promise<any[]> {
    const result = await this.pool.query('SELECT * FROM order_summary LIMIT 100');
    return result.rows;
  }

  async getCustomerPurchaseHistory(): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM customer_purchase_history LIMIT 100',
    );
    return result.rows;
  }

  async getSoldBooks(
    startDate: string,
    endDate: string,
    categoryId?: string,
    authorId?: string,
    publisherId?: string,
    bookId?: string,
    minPrice?: number,
    maxPrice?: number,
    orderStatus?: string,
  ): Promise<any[]> {
    // Build the query with optional filters
    let whereConditions = [
      `o.created_at::DATE BETWEEN $1 AND $2`,
    ];
    const queryParams: any[] = [startDate, endDate];
    let paramIndex = 3;

    // Status filter
    if (orderStatus) {
      whereConditions.push(`o.status = $${paramIndex}`);
      queryParams.push(orderStatus);
      paramIndex++;
    } else {
      whereConditions.push(`o.status IN ('shipped', 'delivered', 'completed')`);
    }

    // Category filter
    if (categoryId) {
      whereConditions.push(`b.category_id = $${paramIndex}`);
      queryParams.push(categoryId);
      paramIndex++;
    }

    // Author filter
    if (authorId) {
      whereConditions.push(`ba.author_id = $${paramIndex}`);
      queryParams.push(authorId);
      paramIndex++;
    }

    // Publisher filter
    if (publisherId) {
      whereConditions.push(`b.publisher_id = $${paramIndex}`);
      queryParams.push(publisherId);
      paramIndex++;
    }

    // Book filter
    if (bookId) {
      whereConditions.push(`oi.book_id = $${paramIndex}`);
      queryParams.push(bookId);
      paramIndex++;
    }

    // Price filters
    if (minPrice !== undefined && minPrice !== null) {
      whereConditions.push(`oi.unit_price >= $${paramIndex}`);
      queryParams.push(minPrice);
      paramIndex++;
    }

    if (maxPrice !== undefined && maxPrice !== null) {
      whereConditions.push(`oi.unit_price <= $${paramIndex}`);
      queryParams.push(maxPrice);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Build joins
    let joins = `
      FROM orders o
      INNER JOIN order_items oi ON o.id = oi.order_id
      INNER JOIN books b ON oi.book_id = b.id
    `;

    // Add author join only if filtering by author
    if (authorId) {
      joins += ` INNER JOIN book_authors ba ON b.id = ba.book_id`;
    }

    const query = `
      SELECT 
        b.id as book_id,
        b.title,
        b.isbn,
        b.price,
        b.cover_image_url,
        c.name as category_name,
        p.name as publisher_name,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.subtotal) as total_revenue,
        COUNT(DISTINCT o.id) as orders_count,
        AVG(oi.unit_price) as average_sale_price
      ${joins}
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN publishers p ON b.publisher_id = p.id
      WHERE ${whereClause}
      GROUP BY b.id, b.title, b.isbn, b.price, b.cover_image_url, c.name, p.name
      ORDER BY total_quantity_sold DESC
    `;

    const result = await this.pool.query(query, queryParams);
    return result.rows;
  }
}

