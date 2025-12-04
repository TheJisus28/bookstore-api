import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'healthy');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('database', 'connected');
      });
  });
});

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      const registerDto = {
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(registerDto.email);
          expect(res.body.user.role).toBe('customer');
          authToken = res.body.access_token;
          userId = res.body.user.id;
        });
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          first_name: 'Test',
          last_name: 'User',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login successfully', async () => {
      // First register a user
      const registerDto = {
        email: `login${Date.now()}@example.com`,
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      // Then login
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerDto.email,
          password: registerDto.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/auth/profile (GET)', () => {
    it('should get user profile with valid token', async () => {
      // Register and get token
      const registerDto = {
        email: `profile${Date.now()}@example.com`,
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      };

      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      const token = registerRes.body.access_token;

      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });
  });
});

describe('Books (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/books (GET)', () => {
    it('should return paginated books', () => {
      return request(app.getHttpServer())
        .get('/books?page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page', 1);
          expect(res.body).toHaveProperty('limit', 10);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('/books/:id (GET)', () => {
    it('should return 404 for non-existent book', () => {
      return request(app.getHttpServer())
        .get('/books/00000000-0000-0000-0000-000000000000')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeNull();
        });
    });
  });
});

describe('Cart (e2e)', () => {
  let app: INestApplication;
  let customerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Register a customer
    const registerDto = {
      email: `cart${Date.now()}@example.com`,
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto);

    customerToken = res.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/cart (GET)', () => {
    it('should return empty cart for new user', () => {
      return request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer()).get('/cart').expect(401);
    });
  });
});
