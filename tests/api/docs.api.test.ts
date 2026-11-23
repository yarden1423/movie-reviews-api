import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('API documentation', () => {
  it('serves the OpenAPI document as JSON', async () => {
    const res = await request(app).get('/api-docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.info.title).toBe('Movie Reviews API');
  });

  it('documents every endpoint', async () => {
    const { body } = await request(app).get('/api-docs.json');
    const documented = Object.entries(body.paths).flatMap(([path, ops]) =>
      Object.keys(ops as object).map((method) => `${method.toUpperCase()} ${path}`),
    );

    expect(documented).toEqual(
      expect.arrayContaining([
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/users/me',
        'GET /api/users/me/reviews',
        'GET /api/movies',
        'GET /api/movies/top',
        'POST /api/movies',
        'GET /api/movies/{id}',
        'PATCH /api/movies/{id}',
        'DELETE /api/movies/{id}',
        'GET /api/movies/{id}/reviews',
        'POST /api/movies/{id}/reviews',
        'GET /api/reviews/{id}',
        'PATCH /api/reviews/{id}',
        'DELETE /api/reviews/{id}',
      ]),
    );
  });

  it('marks protected endpoints with bearer auth', async () => {
    const { body } = await request(app).get('/api-docs.json');
    expect(body.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
    expect(body.paths['/api/movies'].post.security).toEqual([{ bearerAuth: [] }]);
    expect(body.paths['/api/movies'].get.security).toBeUndefined();
  });

  it('serves the Swagger UI', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});
