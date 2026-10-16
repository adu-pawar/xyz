import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Project } from '../src/models/Project.js';

describe('Cross-User Resource Isolation Suite', () => {
  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: /@isolation\.io/ });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@isolation\.io/ });
    await closeDB();
  });

  let userACookie = '';
  let userBCookie = '';
  let projectAId = '';

  it('Setup: creates User A and User B', async () => {
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'User A', email: 'userA@isolation.io', password: 'Password123!' });
    userACookie = resA.headers['set-cookie'][0];

    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'User B', email: 'userB@isolation.io', password: 'Password123!' });
    userBCookie = resB.headers['set-cookie'][0];
  });

  it('User A creates Project A', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', userACookie)
      .send({
        name: 'Secret Project A',
        description: 'Internal project',
        authorizedTargetOrigins: ['https://example.com'],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    projectAId = res.body.data.project._id;
  });

  it('User B is blocked from reading User A project', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectAId}`)
      .set('Cookie', userBCookie)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('User B is blocked from modifying User A project', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectAId}`)
      .set('Cookie', userBCookie)
      .send({ name: 'Hacked Name' })
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('User B is blocked from deleting User A project', async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${projectAId}`)
      .set('Cookie', userBCookie)
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});
