import { AppError } from '../../src/utils/AppError';

describe('AppError', () => {
  it.each([
    ['badRequest', 400, 'BAD_REQUEST', AppError.badRequest('x')],
    ['unauthorized', 401, 'UNAUTHORIZED', AppError.unauthorized()],
    ['forbidden', 403, 'FORBIDDEN', AppError.forbidden()],
    ['notFound', 404, 'NOT_FOUND', AppError.notFound('Movie')],
    ['conflict', 409, 'CONFLICT', AppError.conflict('dup')],
  ])('%s() returns status %i with code %s', (_name, status, code, error) => {
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(status);
    expect(error.code).toBe(code);
  });

  it('includes the resource name in not-found messages', () => {
    expect(AppError.notFound('Movie').message).toBe('Movie not found');
  });

  it('carries field-level details for validation errors', () => {
    const error = AppError.validation([{ field: 'title', message: 'Required' }]);
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual([{ field: 'title', message: 'Required' }]);
  });
});
