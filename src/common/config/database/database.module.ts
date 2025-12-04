import { Module, Global, forwardRef } from '@nestjs/common';
import { databaseProvider } from './database.config';
import { LoggingModule } from '../../logging/logging.module';

@Global()
@Module({
  imports: [forwardRef(() => LoggingModule)],
  providers: [databaseProvider],
  exports: [databaseProvider],
})
export class DatabaseModule {}
