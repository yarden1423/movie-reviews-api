import { AppError } from '../../src/utils/AppError';

describe('AppError', () => {
  it.each([
    ['badRequest', AppError.badRequest('x'), 400, 'BAD_REQUEST'],
    ['unauthorized', AppError.unauthorized(), 401, 'UNAUTHORIZED'],
    ['forbidden', AppError.forbidden(), 403, 'FORBIDDEN'],
    ['notFound', AppError.notFound('Movie'), 404, 'NOT_FOUND'],
    ['conflict', AppError.conflict('dup'), 409, 'CONFLICT'],
  ])('%s() returns status %i with code %s', (_name, error, status, code) => {
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
