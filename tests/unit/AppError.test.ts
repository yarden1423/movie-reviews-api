import { AppError } from '../../src/utils/AppError';

describe('AppError', () => {
  it.each([
    [AppError.badRequest('x'), 400, 'BAD_REQUEST'],
    [AppError.unauthorized(), 401, 'UNAUTHORIZED'],
    [AppError.forbidden(), 403, 'FORBIDDEN'],
    [AppError.notFound('Movie'), 404, 'NOT_FOUND'],
    [AppError.conflict('dup'), 409, 'CONFLICT'],
  ])('builds %s with the right status and code', (error, status, code) => {
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
