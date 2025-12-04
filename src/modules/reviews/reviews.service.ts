import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/config/database/database.config';
import { ReviewDto, CreateReviewDto, UpdateReviewDto } from './review.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class ReviewsService {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async findByBook(
    bookId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<ReviewDto>> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    const countResult = await this.pool.query(
      'SELECT COUNT(*) FROM reviews WHERE book_id = $1',
      [bookId],
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await this.pool.query(
      `SELECT r.*, u.first_name, u.last_name 
       FROM reviews r 
       INNER JOIN users u ON r.user_id = u.id 
       WHERE r.book_id = $1 
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [bookId, limit, offset],
    );

    return {
      data: result.rows as ReviewDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<ReviewDto | null> {
    const result = await this.pool.query(
      `SELECT r.*, u.first_name, u.last_name 
       FROM reviews r 
       INNER JOIN users u ON r.user_id = u.id 
       WHERE r.id = $1`,
      [id],
    );
    return (result.rows[0] as ReviewDto) || null;
  }

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<ReviewDto> {
    const { book_id, rating, comment } = createReviewDto;

    // Check if book exists
    const bookResult = await this.pool.query(
      'SELECT id FROM books WHERE id = $1',
      [book_id],
    );

    if (bookResult.rows.length === 0) {
      throw new NotFoundException('Book not found');
    }

    // Check if user has purchased this book
    const purchaseCheck = await this.pool.query(
      `SELECT oi.id 
       FROM order_items oi
       INNER JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.book_id = $2 AND o.status IN ('shipped', 'delivered', 'completed')
       LIMIT 1`,
      [userId, book_id],
    );

    if (purchaseCheck.rows.length === 0) {
      throw new BadRequestException('You can only review books you have purchased');
    }

    // Check if user already reviewed this book
    const existingReview = await this.pool.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND book_id = $2',
      [userId, book_id],
    );

    if (existingReview.rows.length > 0) {
      throw new BadRequestException('You have already reviewed this book');
    }

    const result = await this.pool.query(
      `INSERT INTO reviews (user_id, book_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, book_id, rating, comment || null],
    );

    return await this.findOne(result.rows[0].id);
  }

  async update(
    userId: string,
    id: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewDto> {
    const existing = await this.findOne(id);

    if (!existing) {
      throw new NotFoundException('Review not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const { rating, comment } = updateReviewDto;

    const result = await this.pool.query(
      `UPDATE reviews SET rating = $1, comment = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [rating, comment || null, id],
    );

    return await this.findOne(result.rows[0].id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.findOne(id);

    if (!existing) {
      throw new NotFoundException('Review not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.pool.query('DELETE FROM reviews WHERE id = $1', [id]);
  }

  async canReview(userId: string, bookId: string): Promise<{ canReview: boolean; hasReviewed: boolean }> {
    // Check if user has purchased this book
    const purchaseCheck = await this.pool.query(
      `SELECT oi.id 
       FROM order_items oi
       INNER JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.book_id = $2 AND o.status IN ('shipped', 'delivered', 'completed')
       LIMIT 1`,
      [userId, bookId],
    );

    const hasPurchased = purchaseCheck.rows.length > 0;

    // Check if user already reviewed this book
    const existingReview = await this.pool.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND book_id = $2',
      [userId, bookId],
    );

    const hasReviewed = existingReview.rows.length > 0;

    return {
      canReview: hasPurchased && !hasReviewed,
      hasReviewed,
    };
  }
}
