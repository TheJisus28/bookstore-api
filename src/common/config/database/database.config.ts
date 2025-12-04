import { Pool, QueryResult, QueryConfig } from 'pg';
import { CustomLoggerService } from '../../logging/logger.service';

export const databaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bookstore',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const DATABASE_POOL = 'DATABASE_POOL';

export const databaseProvider = {
  provide: DATABASE_POOL,
  useFactory: (logger: CustomLoggerService) => {
    const pool = new Pool(databaseConfig);

    pool.on('connect', () => {
      console.log('Connected to PostgreSQL database');
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    // Wrap the query method to automatically log all queries
    const originalQuery = pool.query.bind(pool) as (
      queryTextOrConfig: string | QueryConfig,
      values?: unknown[],
    ) => Promise<QueryResult>;

    // Create a proxy to intercept query calls
    const queryProxy = function (
      queryTextOrConfig: string | QueryConfig,
      values?: unknown[],
    ): Promise<QueryResult> {
      const startTime = Date.now();

      // Extract query text and params
      let queryText: string;
      let params: unknown[] | undefined;

      if (typeof queryTextOrConfig === 'string') {
        queryText = queryTextOrConfig;
        params = values;
      } else {
        queryText = queryTextOrConfig.text;
        params = queryTextOrConfig.values;
      }

      // Call original query method
      const queryPromise = originalQuery(queryTextOrConfig, values);

      // Log the query
      return queryPromise
        .then((result: QueryResult) => {
          const duration = Date.now() - startTime;
          logger.logSqlQuery({
            query: queryText,
            params,
            duration,
          });
          return result;
        })
        .catch((err: unknown) => {
          const duration = Date.now() - startTime;
          const errorMessage =
            err instanceof Error ? err.message : JSON.stringify(err);
          logger.logSqlQuery({
            query: queryText,
            params,
            duration,
            error: errorMessage,
          });
          throw err;
        });
    };

    // Replace the query method
    // @ts-expect-error - We're intentionally replacing the query method to add logging
    pool.query = queryProxy;

    return pool;
  },
  inject: [CustomLoggerService],
};
