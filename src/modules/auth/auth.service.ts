import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { DATABASE_POOL } from '../../common/config/database/database.config';
import { RegisterDto, LoginDto, AuthResponseDto, UserDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_POOL) private pool: Pool,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, first_name, last_name, phone } = registerDto;

    // Check if user already exists
    const existingUser = await this.pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );

    if (existingUser.rows.length > 0) {
      throw new UnauthorizedException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user as customer
    const result = await this.pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, 'customer')
       RETURNING id, email, first_name, last_name, role, phone, created_at`,
      [email, passwordHash, first_name, last_name, phone || null],
    );

    const user = result.rows[0] as UserDto;

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user
    const result = await this.pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, phone, created_at, is_active FROM users WHERE email = $1',
      [email],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    // Remove password_hash from response
    const { password_hash, ...userDto } = user;

    return {
      access_token,
      user: userDto as UserDto,
    };
  }

  async validateUser(userId: string): Promise<UserDto | null> {
    const result = await this.pool.query(
      'SELECT id, email, first_name, last_name, role, phone, created_at FROM users WHERE id = $1 AND is_active = true',
      [userId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as UserDto;
  }
}

