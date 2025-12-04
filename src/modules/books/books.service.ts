import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/config/database/database.config';
import {
  BookDto,
  BookSearchResultDto,
  CreateBookDto,
  UpdateBookDto,
} from './book.dto';
import { BookAuthorDto, AddAuthorToBookDto, BookWithAuthorsDto } from './book-authors.dto';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class BooksService {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async findAll(
    pagination: PaginationDto,
    includeInactive = false,
  ): Promise<PaginatedResponseDto<BookDto>> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    const whereClause = includeInactive
      ? ''
      : 'WHERE is_active = true';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM books ${whereClause}`,
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await this.pool.query(
      `SELECT * FROM books ${whereClause} ORDER BY title LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return {
      data: result.rows as BookDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<BookDto | null> {
    const result = await this.pool.query('SELECT * FROM books WHERE id = $1', [
      id,
    ]);
    return (result.rows[0] as BookDto) || null;
  }

  async create(createBookDto: CreateBookDto): Promise<BookDto> {
    const {
      isbn,
      title,
      description,
      price,
      stock,
      pages,
      publication_date,
      language = 'Spanish',
      publisher_id,
      category_id,
      cover_image_url,
    } = createBookDto;

    const result = await this.pool.query(
      `INSERT INTO books (
        isbn, title, description, price, stock, pages, publication_date,
        language, publisher_id, category_id, cover_image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        isbn,
        title,
        description || null,
        price,
        stock,
        pages || null,
        publication_date || null,
        language,
        publisher_id || null,
        category_id || null,
        cover_image_url || null,
      ],
    );

    return result.rows[0] as BookDto;
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<BookDto> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Book not found');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateBookDto).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await this.pool.query(
      `UPDATE books SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0] as BookDto;
  }

  async remove(id: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM books WHERE id = $1',
      [id],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Book not found');
    }
  }

  async search(
    searchTerm: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<BookSearchResultDto>> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    const result = await this.pool.query(
      `SELECT * FROM search_books($1, NULL, NULL, NULL, NULL) LIMIT $2 OFFSET $3`,
      [searchTerm, limit, offset],
    );

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM search_books($1, NULL, NULL, NULL, NULL)`,
      [searchTerm],
    );
    const total = parseInt(countResult.rows[0].count);

    return {
      data: result.rows as BookSearchResultDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async advancedSearch(
    searchTerm: string | null,
    categoryId: string | null,
    minPrice: number | null,
    maxPrice: number | null,
    minRating: number | null,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<BookSearchResultDto>> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    const result = await this.pool.query(
      `SELECT * FROM search_books($1, $2, $3, $4, $5) LIMIT $6 OFFSET $7`,
      [searchTerm, categoryId, minPrice, maxPrice, minRating, limit, offset],
    );

    // Count total (simplified - in production would use a separate count function)
    const allResults = await this.pool.query(
      `SELECT * FROM search_books($1, $2, $3, $4, $5)`,
      [searchTerm, categoryId, minPrice, maxPrice, minRating],
    );
    const total = allResults.rows.length;

    return {
      data: result.rows as BookSearchResultDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBestsellers(
    limit: number = 10,
    startDate?: string,
    endDate?: string,
  ): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM get_bestsellers($1, $2, $3)`,
      [limit, startDate || null, endDate || null],
    );
    return result.rows;
  }

  async getBookAuthors(bookId: string): Promise<BookWithAuthorsDto[]> {
    const result = await this.pool.query(
      `SELECT 
        ba.book_id,
        b.title as book_title,
        ba.author_id,
        a.first_name || ' ' || a.last_name as author_name,
        ba.is_primary
       FROM book_authors ba
       INNER JOIN books b ON ba.book_id = b.id
       INNER JOIN authors a ON ba.author_id = a.id
       WHERE ba.book_id = $1
       ORDER BY ba.is_primary DESC, a.last_name`,
      [bookId],
    );
    return result.rows as BookWithAuthorsDto[];
  }

  async addAuthorToBook(
    bookId: string,
    addAuthorToBookDto: AddAuthorToBookDto,
  ): Promise<BookAuthorDto> {
    // Verify book exists
    const book = await this.findOne(bookId);
    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Verify author exists
    const authorResult = await this.pool.query(
      'SELECT id FROM authors WHERE id = $1',
      [addAuthorToBookDto.author_id],
    );
    if (authorResult.rows.length === 0) {
      throw new NotFoundException('Author not found');
    }

    // Check if relationship already exists
    const existing = await this.pool.query(
      'SELECT * FROM book_authors WHERE book_id = $1 AND author_id = $2',
      [bookId, addAuthorToBookDto.author_id],
    );

    if (existing.rows.length > 0) {
      throw new BadRequestException('Author is already assigned to this book');
    }

    // If setting as primary, unset other primary authors
    if (addAuthorToBookDto.is_primary) {
      await this.pool.query(
        'UPDATE book_authors SET is_primary = false WHERE book_id = $1',
        [bookId],
      );
    }

    const result = await this.pool.query(
      `INSERT INTO book_authors (book_id, author_id, is_primary)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [bookId, addAuthorToBookDto.author_id, addAuthorToBookDto.is_primary || false],
    );

    return result.rows[0] as BookAuthorDto;
  }

  async removeAuthorFromBook(bookId: string, authorId: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM book_authors WHERE book_id = $1 AND author_id = $2',
      [bookId, authorId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Author-book relationship not found');
    }
  }
}
