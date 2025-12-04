import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/config/database/database.config';
import { UserDto, UpdateUserDto } from './user.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async findAll(
    pagination: PaginationDto,
    role?: string,
  ): Promise<PaginatedResponseDto<UserDto>> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const queryParams: any[] = [];

    if (role) {
      whereClause = 'WHERE role = $1';
      queryParams.push(role);
    }

    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await this.pool.query(
      whereClause ? countQuery : countQuery.replace('WHERE', ''),
      queryParams,
    );
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `SELECT id, email, first_name, last_name, role, phone, created_at, updated_at, is_active 
                       FROM users ${whereClause} 
                       ORDER BY created_at DESC 
                       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    const result = await this.pool.query(dataQuery, [
      ...queryParams,
      limit,
      offset,
    ]);

    return {
      data: result.rows as UserDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserDto | null> {
    const result = await this.pool.query(
      'SELECT id, email, first_name, last_name, role, phone, created_at, updated_at, is_active FROM users WHERE id = $1',
      [id],
    );
    return (result.rows[0] as UserDto) || null;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDto> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateUserDto).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return existing;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await this.pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, first_name, last_name, role, phone, created_at, updated_at, is_active`,
      values,
    );

    return result.rows[0] as UserDto;
  }
}

