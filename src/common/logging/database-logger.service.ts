import { Injectable, Inject } from '@nestjs/common';
import { Pool, QueryResult, QueryResultRow } from 'pg';
import { DATABASE_POOL } from '../config/database/database.config';
import { CustomLoggerService } from './logger.service';

/**
 * Service that wraps the database pool to log all SQL queries
 * User information is passed explicitly to methods that need it
 */
@Injectable()
export class DatabaseLoggerService {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly logger: CustomLoggerService,
  ) {}

  /**
   * Execute a query with logging
   * User info is optional and should be passed from the calling context
   */
  async query<T extends QueryResultRow = any>(
    queryText: string,
    params?: any[],
    userContext?: { userId?: number; userEmail?: string },
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    let error: string | undefined;

    try {
      const result = await this.pool.query<T>(queryText, params);
      const duration = Date.now() - startTime;

      this.logger.logSqlQuery({
        query: queryText,
        params,
        duration,
        userId: userContext?.userId,
        userEmail: userContext?.userEmail,
      });

      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      error = err instanceof Error ? err.message : String(err);

      this.logger.logSqlQuery({
        query: queryText,
        params,
        duration,
        userId: userContext?.userId,
        userEmail: userContext?.userEmail,
        error,
      });

      throw err;
    }
  }

  /**
   * Get the underlying pool for direct access if needed
   * Note: Direct pool access bypasses logging
   */
  getPool(): Pool {
    return this.pool;
  }
}
