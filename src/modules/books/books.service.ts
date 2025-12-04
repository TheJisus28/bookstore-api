import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/config/database/database.config';
import {
  BookDto,
  BookSearchResultDto,
  CreateBookDto,
  UpdateBookDto,
} from './book.dto';
import {
  BookAuthorDto,
  AddAuthorToBookDto,
  BookWithAuthorsDto,
} from './book-authors.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class BooksService {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async findAll(
    pagination: PaginationDto,
    includeInactive = false,
  ): Promise<PaginatedResponseDto<BookDto>> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    const whereClause = includeInactive ? '' : 'WHERE is_active = true';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM books ${whereClause}`,
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await this.pool.query(
      `SELECT 
        b.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', a.id,
              'first_name', a.first_name,
              'last_name', a.last_name,
              'is_primary', ba.is_primary
            )
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'::json
        ) as authors
      FROM books b
      LEFT JOIN book_authors ba ON b.id = ba.book_id
      LEFT JOIN authors a ON ba.author_id = a.id
      ${whereClause}
      GROUP BY b.id
      ORDER BY b.title
      LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return {
      data: result.rows.map((row: any) => ({
        ...row,
        authors: row.authors || [],
      })) as BookDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<BookDto | null> {
    const result = await this.pool.query(
      `SELECT 
        b.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', a.id,
              'first_name', a.first_name,
              'last_name', a.last_name,
              'is_primary', ba.is_primary
            )
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'::json
        ) as authors
      FROM books b
      LEFT JOIN book_authors ba ON b.id = ba.book_id
      LEFT JOIN authors a ON ba.author_id = a.id
      WHERE b.id = $1
      GROUP BY b.id`,
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      authors: row.authors || [],
    } as BookDto;
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

    const bookId = result.rows[0].id;

    // Associate authors if provided
    if (createBookDto.author_ids && createBookDto.author_ids.length > 0) {
      const primaryAuthorId =
        createBookDto.primary_author_id || createBookDto.author_ids[0];

      for (const authorId of createBookDto.author_ids) {
        const isPrimary = authorId === primaryAuthorId;
        await this.pool.query(
          `INSERT INTO book_authors (book_id, author_id, is_primary)
           VALUES ($1, $2, $3)
           ON CONFLICT (book_id, author_id) DO UPDATE SET is_primary = $3`,
          [bookId, authorId, isPrimary],
        );
      }
    }

    // Return the book with authors
    return this.findOne(bookId) as Promise<BookDto>;
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<BookDto> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Book not found');
    }

    // Extract author_ids and primary_author_id before processing other fields
    const { author_ids, primary_author_id, ...bookFields } = updateBookDto;

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(bookFields).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    // Update book fields if there are any
    if (fields.length > 0) {
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      await this.pool.query(
        `UPDATE books SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
        values,
      );
    }

    // Update authors if provided
    if (author_ids !== undefined) {
      // Delete existing author relationships
      await this.pool.query('DELETE FROM book_authors WHERE book_id = $1', [
        id,
      ]);

      // Add new author relationships
      if (author_ids.length > 0) {
        const primaryId = primary_author_id || author_ids[0];

        for (const authorId of author_ids) {
          const isPrimary = authorId === primaryId;
          await this.pool.query(
            `INSERT INTO book_authors (book_id, author_id, is_primary)
             VALUES ($1, $2, $3)`,
            [id, authorId, isPrimary],
          );
        }
      }
    }

    // Return the updated book with authors
    return this.findOne(id) as Promise<BookDto>;
  }

  async remove(id: string): Promise<void> {
    const result = await this.pool.query('DELETE FROM books WHERE id = $1', [
      id,
    ]);

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
    authorId: string | null,
    publisherId: string | null,
    minPrice: number | null,
    maxPrice: number | null,
    minRating: number | null,
    language: string | null,
    minStock: number | null,
    maxStock: number | null,
    startDate: string | null,
    endDate: string | null,
    sortBy: string | null,
    sortOrder: string | null,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<BookSearchResultDto>> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    // Get total count first - use a subquery to avoid ORDER BY issues
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM (
        SELECT DISTINCT b.id
        FROM books b
        LEFT JOIN publishers p ON b.publisher_id = p.id
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN book_authors ba ON b.id = ba.book_id
        LEFT JOIN (
            SELECT 
                r.book_id as review_book_id,
                AVG(r.rating)::NUMERIC(3, 2) as avg_rating,
                COUNT(*) as review_count
            FROM reviews r
            GROUP BY r.book_id
        ) book_ratings ON b.id = book_ratings.review_book_id
        WHERE 
            b.is_active = TRUE
            AND ($1::TEXT IS NULL OR 
                 to_tsvector('spanish', coalesce(b.title, '') || ' ' || coalesce(b.description, '')) 
                 @@ plainto_tsquery('spanish', $1)
                 OR LOWER(b.title) LIKE '%' || LOWER($1) || '%')
            AND ($2::UUID IS NULL OR b.category_id = $2)
            AND ($3::UUID IS NULL OR ba.author_id = $3)
            AND ($4::UUID IS NULL OR b.publisher_id = $4)
            AND ($5::NUMERIC IS NULL OR b.price >= $5)
            AND ($6::NUMERIC IS NULL OR b.price <= $6)
            AND ($7::NUMERIC IS NULL OR COALESCE(book_ratings.avg_rating, 0) >= $7)
            AND ($8::TEXT IS NULL OR LOWER(b.language) = LOWER($8))
            AND ($9::INTEGER IS NULL OR b.stock >= $9)
            AND ($10::INTEGER IS NULL OR b.stock <= $10)
            AND ($11::DATE IS NULL OR b.publication_date >= $11)
            AND ($12::DATE IS NULL OR b.publication_date <= $12)
      ) as filtered_books`,
      [
        searchTerm,
        categoryId,
        authorId,
        publisherId,
        minPrice,
        maxPrice,
        minRating,
        language,
        minStock,
        maxStock,
        startDate,
        endDate,
      ],
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const result = await this.pool.query(
      `SELECT 
        book_id,
        title,
        price,
        stock,
        average_rating,
        total_reviews,
        publisher_name,
        category_name,
        publication_date,
        language,
        cover_image_url
      FROM search_books_extended($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) LIMIT $15 OFFSET $16`,
      [
        searchTerm,
        categoryId,
        authorId,
        publisherId,
        minPrice,
        maxPrice,
        minRating,
        language,
        minStock,
        maxStock,
        startDate,
        endDate,
        sortBy || 'title',
        sortOrder || 'ASC',
        limit,
        offset,
      ],
    );

    // Get authors for each book
    const booksWithAuthors = await Promise.all(
      result.rows.map(async (book: any) => {
        const authorsResult = await this.pool.query(
          `SELECT 
            a.id,
            a.first_name,
            a.last_name,
            ba.is_primary
          FROM book_authors ba
          INNER JOIN authors a ON ba.author_id = a.id
          WHERE ba.book_id = $1
          ORDER BY ba.is_primary DESC, a.last_name, a.first_name`,
          [book.book_id],
        );

        return {
          ...book,
          authors: authorsResult.rows.map((row: any) => ({
            id: row.id,
            first_name: row.first_name,
            last_name: row.last_name,
            is_primary: row.is_primary,
          })),
        };
      }),
    );

    return {
      data: booksWithAuthors as BookSearchResultDto[],
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
      [
        bookId,
        addAuthorToBookDto.author_id,
        addAuthorToBookDto.is_primary || false,
      ],
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
