import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Pool } from 'pg';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { DATABASE_POOL } from '../../common/config/database/database.config';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let pool: jest.Mocked<Pool>;
  let jwtService: jest.Mocked<JwtService>;

  const mockPool = {
    query: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DATABASE_POOL,
          useValue: mockPool,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    pool = module.get(DATABASE_POOL);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      };

      // Mock: user doesn't exist
      pool.query.mockResolvedValueOnce({ rows: [] } as any);
      // Mock: insert user
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-id',
            email: registerDto.email,
            first_name: registerDto.first_name,
            last_name: registerDto.last_name,
            role: 'customer',
            phone: null,
            created_at: new Date(),
          },
        ],
      } as any);

      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error if email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      };

      // Mock: user exists
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-user-id' }],
      } as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);

      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-id',
            email: loginDto.email,
            password_hash: hashedPassword,
            first_name: 'Test',
            last_name: 'User',
            role: 'customer',
            phone: null,
            created_at: new Date(),
            is_active: true,
          },
        ],
      } as any);

      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw error with invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      pool.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

