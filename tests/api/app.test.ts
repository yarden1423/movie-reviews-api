import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('App basics', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns a uniform 404 error for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('returns 400 for malformed JSON bodies', async () => {
    const res = await request(app)
      .post('/api/anything')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Malformed JSON body');
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
