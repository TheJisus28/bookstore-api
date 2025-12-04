import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/config/database/database.config';
import { AuthorDto, CreateAuthorDto, UpdateAuthorDto } from './author.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class AuthorsService {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async findAll(
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<AuthorDto>> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    const countResult = await this.pool.query('SELECT COUNT(*) FROM authors');
    const total = parseInt(countResult.rows[0].count);

    const result = await this.pool.query(
      'SELECT * FROM authors ORDER BY last_name, first_name LIMIT $1 OFFSET $2',
      [limit, offset],
    );

    return {
      data: result.rows as AuthorDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<AuthorDto | null> {
    const result = await this.pool.query('SELECT * FROM authors WHERE id = $1', [
      id,
    ]);
    return (result.rows[0] as AuthorDto) || null;
  }

  async create(createAuthorDto: CreateAuthorDto): Promise<AuthorDto> {
    const { first_name, last_name, bio, birth_date, nationality } =
      createAuthorDto;

    const result = await this.pool.query(
      `INSERT INTO authors (first_name, last_name, bio, birth_date, nationality)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        first_name,
        last_name,
        bio || null,
        birth_date || null,
        nationality || null,
      ],
    );

    return result.rows[0] as AuthorDto;
  }

  async update(id: string, updateAuthorDto: UpdateAuthorDto): Promise<AuthorDto> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Author not found');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateAuthorDto).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return existing;
    }

    values.push(id);

    const result = await this.pool.query(
      `UPDATE authors SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0] as AuthorDto;
  }

  async remove(id: string): Promise<void> {
    const result = await this.pool.query('DELETE FROM authors WHERE id = $1', [
      id,
    ]);

    if (result.rowCount === 0) {
      throw new NotFoundException('Author not found');
    }
  }
}

