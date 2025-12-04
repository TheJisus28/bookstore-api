import { Module } from '@nestjs/common';
import { InitAdminService } from './init-admin.service';
import { DatabaseModule } from '../config/database/database.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [DatabaseModule, LoggingModule],
  providers: [InitAdminService],
})
export class InitializationModule {}
