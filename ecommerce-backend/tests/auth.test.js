import request from 'supertest';
import app from '../src/app.js';

import prisma from '../src/config/prisma.js';
import redisClient from '../src/config/redis.js';

describe('Auth API Endpoints', () => {
  it('should fail login with incorrect credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrong@raco.ai',
        password: 'wrongpassword',
      });
    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  if (redisClient) await redisClient.quit();
});