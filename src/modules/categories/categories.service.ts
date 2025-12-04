import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/config/database/database.config';
import {
  CategoryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './category.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class CategoriesService {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async findAll(
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<CategoryDto>> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    const countResult = await this.pool.query(
      'SELECT COUNT(*) FROM categories',
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await this.pool.query(
      'SELECT * FROM categories ORDER BY name LIMIT $1 OFFSET $2',
      [limit, offset],
    );

    return {
      data: result.rows as CategoryDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<CategoryDto | null> {
    const result = await this.pool.query(
      'SELECT * FROM categories WHERE id = $1',
      [id],
    );
    return (result.rows[0] as CategoryDto) || null;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryDto> {
    const { name, description, parent_id } = createCategoryDto;

    const result = await this.pool.query(
      `INSERT INTO categories (name, description, parent_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description || null, parent_id || null],
    );

    return result.rows[0] as CategoryDto;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateCategoryDto).forEach(([key, value]) => {
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
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0] as CategoryDto;
  }

  async remove(id: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM categories WHERE id = $1',
      [id],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Category not found');
    }
  }
}
