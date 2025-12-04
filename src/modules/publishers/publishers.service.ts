import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/config/database/database.config';
import {
  PublisherDto,
  CreatePublisherDto,
  UpdatePublisherDto,
} from './publisher.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class PublishersService {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async findAll(
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<PublisherDto>> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    const countResult = await this.pool.query(
      'SELECT COUNT(*) FROM publishers',
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await this.pool.query(
      'SELECT * FROM publishers ORDER BY name LIMIT $1 OFFSET $2',
      [limit, offset],
    );

    return {
      data: result.rows as PublisherDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<PublisherDto | null> {
    const result = await this.pool.query(
      'SELECT * FROM publishers WHERE id = $1',
      [id],
    );
    return (result.rows[0] as PublisherDto) || null;
  }

  async create(createPublisherDto: CreatePublisherDto): Promise<PublisherDto> {
    const { name, address, city, country, phone, email, website } =
      createPublisherDto;

    const result = await this.pool.query(
      `INSERT INTO publishers (name, address, city, country, phone, email, website)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        address || null,
        city || null,
        country || null,
        phone || null,
        email || null,
        website || null,
      ],
    );

    return result.rows[0] as PublisherDto;
  }

  async update(
    id: string,
    updatePublisherDto: UpdatePublisherDto,
  ): Promise<PublisherDto> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Publisher not found');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updatePublisherDto).forEach(([key, value]) => {
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
      `UPDATE publishers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0] as PublisherDto;
  }

  async remove(id: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM publishers WHERE id = $1',
      [id],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Publisher not found');
    }
  }
}
