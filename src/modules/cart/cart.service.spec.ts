import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { CartService } from './cart.service';
import { DATABASE_POOL } from '../../common/config/database/database.config';

describe('CartService', () => {
  let service: CartService;
  let pool: jest.Mocked<Pool>;

  const mockPool = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: DATABASE_POOL,
          useValue: mockPool,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    pool = module.get(DATABASE_POOL);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToCart', () => {
    it('should add item to cart successfully', async () => {
      const userId = 'user-id';
      const addToCartDto = {
        book_id: 'book-id',
        quantity: 2,
      };

      const mockBook = {
        id: 'book-id',
        stock: 10,
        is_active: true,
      };

      pool.query
        .mockResolvedValueOnce({
          rows: [mockBook],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'cart-item-id',
              user_id: userId,
              book_id: 'book-id',
              quantity: 2,
            },
          ],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'cart-item-id',
              user_id: userId,
              book_id: 'book-id',
              quantity: 2,
              title: 'Test Book',
              price: 29.99,
            },
          ],
        } as any);

      const result = await service.addToCart(userId, addToCartDto);

      expect(result).toHaveProperty('id');
      expect(result.book_id).toBe(addToCartDto.book_id);
      expect(result.quantity).toBe(addToCartDto.quantity);
    });

    it('should throw NotFoundException if book not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        service.addToCart('user-id', {
          book_id: 'non-existent',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      const mockBook = {
        id: 'book-id',
        stock: 1,
        is_active: true,
      };

      pool.query.mockResolvedValueOnce({
        rows: [mockBook],
      } as any);

      await expect(
        service.addToCart('user-id', {
          book_id: 'book-id',
          quantity: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 1 } as any);

      await service.removeItem('user-id', 'cart-item-id');

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
        ['cart-item-id', 'user-id'],
      );
    });

    it('should throw NotFoundException if item not found', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 0 } as any);

      await expect(
        service.removeItem('user-id', 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
