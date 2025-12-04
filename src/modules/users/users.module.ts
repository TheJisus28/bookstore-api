import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController] as const,
  providers: [UsersService] as const,
})
export class UsersModule {}
