import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/config/database/database.config';
import {
  CartItemDto,
  AddToCartDto,
  UpdateCartItemDto,
} from './cart.dto';

@Injectable()
export class CartService {
  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  async findByUser(userId: string): Promise<CartItemDto[]> {
    const result = await this.pool.query(
      `SELECT ci.*, b.title, b.price, b.cover_image_url, b.stock
       FROM cart_items ci 
       INNER JOIN books b ON ci.book_id = b.id 
       WHERE ci.user_id = $1 AND b.is_active = true
       ORDER BY ci.created_at DESC`,
      [userId],
    );
    return result.rows as CartItemDto[];
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<CartItemDto> {
    const { book_id, quantity } = addToCartDto;

    // Check if book exists and has stock
    const bookResult = await this.pool.query(
      'SELECT id, stock, is_active FROM books WHERE id = $1',
      [book_id],
    );

    if (bookResult.rows.length === 0) {
      throw new NotFoundException('Book not found');
    }

    const book = bookResult.rows[0];
    if (!book.is_active) {
      throw new BadRequestException('Book is not available');
    }

    if (book.stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Check if item already in cart
    const existingResult = await this.pool.query(
      'SELECT * FROM cart_items WHERE user_id = $1 AND book_id = $2',
      [userId, book_id],
    );

    if (existingResult.rows.length > 0) {
      // Update quantity
      const newQuantity = existingResult.rows[0].quantity + quantity;
      if (book.stock < newQuantity) {
        throw new BadRequestException('Insufficient stock');
      }

      const updateResult = await this.pool.query(
        `UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $2 AND book_id = $3 
         RETURNING *`,
        [newQuantity, userId, book_id],
      );

      return await this.getCartItemWithBook(updateResult.rows[0].id);
    }

    // Insert new item
    const insertResult = await this.pool.query(
      `INSERT INTO cart_items (user_id, book_id, quantity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, book_id, quantity],
    );

    return await this.getCartItemWithBook(insertResult.rows[0].id);
  }

  async updateItem(
    userId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartItemDto> {
    const { quantity } = updateCartItemDto;

    // Get cart item
    const itemResult = await this.pool.query(
      'SELECT * FROM cart_items WHERE id = $1 AND user_id = $2',
      [itemId, userId],
    );

    if (itemResult.rows.length === 0) {
      throw new NotFoundException('Cart item not found');
    }

    // Check stock
    const bookResult = await this.pool.query(
      'SELECT stock FROM books WHERE id = $1',
      [itemResult.rows[0].book_id],
    );

    if (bookResult.rows[0].stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    await this.pool.query(
      `UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND user_id = $3`,
      [quantity, itemId, userId],
    );

    return await this.getCartItemWithBook(itemId);
  }

  async removeItem(userId: string, itemId: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
      [itemId, userId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Cart item not found');
    }
  }

  async clearCart(userId: string): Promise<void> {
    await this.pool.query('DELETE FROM cart_items WHERE user_id = $1', [
      userId,
    ]);
  }

  private async getCartItemWithBook(itemId: string): Promise<CartItemDto> {
    const result = await this.pool.query(
      `SELECT ci.*, b.title, b.price, b.cover_image_url 
       FROM cart_items ci 
       INNER JOIN books b ON ci.book_id = b.id 
       WHERE ci.id = $1`,
      [itemId],
    );
    return result.rows[0] as CartItemDto;
  }
}
