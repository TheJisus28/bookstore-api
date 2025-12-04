import { Module, Global } from '@nestjs/common';
import { CustomLoggerService } from './logger.service';
import { HttpLoggerInterceptor } from './http-logger.interceptor';
import { DatabaseLoggerService } from './database-logger.service';
import { DatabaseModule } from '../config/database/database.module';

/**
 * Global module that provides logging services throughout the application
 */
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    CustomLoggerService,
    HttpLoggerInterceptor,
    DatabaseLoggerService,
  ],
  exports: [CustomLoggerService, HttpLoggerInterceptor, DatabaseLoggerService],
})
export class LoggingModule {}
