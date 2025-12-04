import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/config/database/database.config';
import {
  AddressDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './address.dto';

@Injectable()
export class AddressesService {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async findByUser(userId: string): Promise<AddressDto[]> {
    const result = await this.pool.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [userId],
    );
    return result.rows as AddressDto[];
  }

  async findOne(id: string, userId?: string): Promise<AddressDto | null> {
    const result = await this.pool.query(
      'SELECT * FROM addresses WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const address = result.rows[0] as AddressDto;

    if (userId && address.user_id !== userId) {
      throw new ForbiddenException('You can only view your own addresses');
    }

    return address;
  }

  async create(userId: string, createAddressDto: CreateAddressDto): Promise<AddressDto> {
    const { street, city, state, postal_code, country, is_default } =
      createAddressDto;

    // If this is set as default, unset others
    if (is_default) {
      await this.pool.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [userId],
      );
    }

    const result = await this.pool.query(
      `INSERT INTO addresses (user_id, street, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        street,
        city,
        state || null,
        postal_code,
        country,
        is_default || false,
      ],
    );

    return result.rows[0] as AddressDto;
  }

  async update(
    userId: string,
    id: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<AddressDto> {
    const existing = await this.findOne(id, userId);

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    // If setting as default, unset others
    if (updateAddressDto.is_default === true) {
      await this.pool.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1 AND id != $2',
        [userId, id],
      );
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateAddressDto).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return existing;
    }

    values.push(id, userId);

    const result = await this.pool.query(
      `UPDATE addresses SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values,
    );

    return result.rows[0] as AddressDto;
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2',
      [id, userId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Address not found');
    }
  }
}

