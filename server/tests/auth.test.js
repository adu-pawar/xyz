import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';

describe('Authentication & Authorization Suite', () => {
  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: /@testauth\.io/ });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@testauth\.io/ });
    await closeDB();
  });

  const testUser = {
    name: 'QA Lead',
    email: 'lead@testauth.io',
    password: 'SecurePassword123!',
  };

  let sessionCookie = '';

  it('POST /api/v1/auth/register - registers new user and sets HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.headers['set-cookie']).toBeDefined();
    sessionCookie = res.headers['set-cookie'][0];
  });

  it('POST /api/v1/auth/register - rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login - authenticates user with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe(testUser.name);
  });

  it('POST /api/v1/auth/login - rejects invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword999!' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/auth/me - returns user profile with valid cookie', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('GET /api/v1/auth/me - denies access without credentials', async () => {
    const res = await request(app).get('/api/v1/auth/me').expect(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/logout - clears authentication cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout').expect(200);
    expect(res.body.success).toBe(true);
  });
});
