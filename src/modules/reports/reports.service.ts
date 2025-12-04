import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/config/database/database.config';

@Injectable()
export class ReportsService {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async generateSalesReport(startDate: string, endDate: string): Promise<any[]> {
    // Call the stored procedure
    await this.pool.query('CALL generate_sales_report($1, $2)', [
      startDate,
      endDate,
    ]);

    // The procedure uses RAISE NOTICE, so we need to query the data manually
    const result = await this.pool.query(
      `SELECT 
        DATE_TRUNC('day', o.created_at)::DATE as sale_date,
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT o.user_id) as unique_customers,
        SUM(oi.subtotal) as total_revenue,
        SUM(oi.quantity) as total_items_sold,
        AVG(order_totals.order_total) as average_order_value
      FROM orders o
      INNER JOIN order_items oi ON o.id = oi.order_id
      INNER JOIN (
        SELECT 
          order_id,
          SUM(subtotal) as order_total
        FROM order_items
        GROUP BY order_id
      ) order_totals ON o.id = order_totals.order_id
      WHERE 
        o.status IN ('shipped', 'delivered')
        AND o.created_at::DATE BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('day', o.created_at)::DATE
      ORDER BY sale_date`,
      [startDate, endDate],
    );

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
}

