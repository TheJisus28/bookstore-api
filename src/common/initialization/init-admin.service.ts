import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { DATABASE_POOL } from '../config/database/database.config';
import { CustomLoggerService } from '../logging/logger.service';

const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_FIRST_NAME = 'Admin';
const ADMIN_LAST_NAME = 'User';

const TESTER_EMAIL = 'tester@test.com';
const TESTER_PASSWORD = '123123123';
const TESTER_FIRST_NAME = 'Test';
const TESTER_LAST_NAME = 'User';

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: Date;
}

@Injectable()
export class InitAdminService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_POOL) private pool: Pool,
    private logger: CustomLoggerService,
  ) {}

  async onModuleInit() {
    await this.createAdminIfNotExists();
    await this.createTesterIfNotExists();
  }

  private async createAdminIfNotExists() {
    try {
      // Check if admin already exists
      const existingUser = await this.pool.query(
        'SELECT id, email FROM users WHERE email = $1',
        [ADMIN_EMAIL],
      );

      if (existingUser.rows.length > 0) {
        this.logger.log(
          `Admin user already exists: ${ADMIN_EMAIL}`,
          'InitAdminService',
        );
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

      // Create admin user
      const result = await this.pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, 'admin')
         RETURNING id, email, first_name, last_name, role, created_at`,
        [ADMIN_EMAIL, passwordHash, ADMIN_FIRST_NAME, ADMIN_LAST_NAME],
      );

      const admin = result.rows[0] as UserRow;

      this.logger.log(
        `✅ Admin user created successfully: ${admin.email} (ID: ${admin.id})`,
        'InitAdminService',
      );
    } catch (error) {
      this.logger.error(
        `❌ Error creating admin user: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        'InitAdminService',
      );
      // Don't throw error to prevent app from failing to start
    }
  }

  private async createTesterIfNotExists() {
    try {
      // Check if tester already exists
      const existingUser = await this.pool.query(
        'SELECT id, email FROM users WHERE email = $1',
        [TESTER_EMAIL],
      );

      if (existingUser.rows.length > 0) {
        this.logger.log(
          `Tester user already exists: ${TESTER_EMAIL}`,
          'InitAdminService',
        );
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(TESTER_PASSWORD, 10);

      // Create tester user (customer role)
      const result = await this.pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, 'customer')
         RETURNING id, email, first_name, last_name, role, created_at`,
        [TESTER_EMAIL, passwordHash, TESTER_FIRST_NAME, TESTER_LAST_NAME],
      );

      const tester = result.rows[0] as UserRow;

      this.logger.log(
        `✅ Tester user created successfully: ${tester.email} (ID: ${tester.id})`,
        'InitAdminService',
      );
    } catch (error) {
      this.logger.error(
        `❌ Error creating tester user: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        'InitAdminService',
      );
      // Don't throw error to prevent app from failing to start
    }
  }
}
