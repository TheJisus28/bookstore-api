import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { BooksService } from './books.service';
import { DATABASE_POOL } from '../../common/config/database/database.config';

describe('BooksService', () => {
  let service: BooksService;
  let pool: jest.Mocked<Pool>;

  const mockPool = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: DATABASE_POOL,
          useValue: mockPool,
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
    pool = module.get(DATABASE_POOL);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated books', async () => {
      const mockBooks = [
        { id: '1', title: 'Book 1', is_active: true },
        { id: '2', title: 'Book 2', is_active: true },
      ];

      pool.query
        .mockResolvedValueOnce({
          rows: [{ count: '2' }],
        } as any)
        .mockResolvedValueOnce({
          rows: mockBooks,
        } as any);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 2);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return a book by id', async () => {
      const mockBook = {
        id: 'book-id',
        title: 'Test Book',
        isbn: '1234567890',
      };

      pool.query.mockResolvedValueOnce({
        rows: [mockBook],
      } as any);

      const result = await service.findOne('book-id');

      expect(result).toEqual(mockBook);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM books WHERE id = $1',
        ['book-id'],
      );
    });

    it('should return null if book not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.findOne('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new book', async () => {
      const createBookDto = {
        isbn: '1234567890',
        title: 'New Book',
        price: 29.99,
        stock: 10,
        language: 'Spanish',
      };

      const mockCreatedBook = {
        id: 'new-book-id',
        ...createBookDto,
        created_at: new Date(),
      };

      pool.query.mockResolvedValueOnce({
        rows: [mockCreatedBook],
      } as any);

      const result = await service.create(createBookDto);

      expect(result).toEqual(mockCreatedBook);
      expect(pool.query).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a book', async () => {
      const existingBook = {
        id: 'book-id',
        title: 'Old Title',
        price: 20.0,
      };

      pool.query
        .mockResolvedValueOnce({ rows: [existingBook] } as any)
        .mockResolvedValueOnce({
          rows: [{ ...existingBook, title: 'New Title' }],
        } as any);

      const result = await service.update('book-id', { title: 'New Title' });

      expect(result.title).toBe('New Title');
    });

    it('should throw NotFoundException if book not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        service.update('non-existent-id', { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a book', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 1 } as any);

      await service.remove('book-id');

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM books WHERE id = $1',
        ['book-id'],
      );
    });

    it('should throw NotFoundException if book not found', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 0 } as any);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

