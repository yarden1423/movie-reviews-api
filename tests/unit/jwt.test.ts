import jwt from 'jsonwebtoken';
import { signToken, verifyToken } from '../../src/utils/jwt';

describe('jwt utils', () => {
  it('signs and verifies a token round-trip', () => {
    const token = signToken({ sub: 'abc123', role: 'user' });
    const payload = verifyToken(token);
    expect(payload.sub).toBe('abc123');
    expect(payload.role).toBe('user');
  });

  it('throws 401 for a tampered token', () => {
    const token = signToken({ sub: 'abc123', role: 'user' }) + 'x';
    expect(() => verifyToken(token)).toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  it('throws 401 for a token signed with another secret', () => {
    const token = jwt.sign({ sub: 'abc123', role: 'admin' }, 'some-other-secret-value');
    expect(() => verifyToken(token)).toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  it('throws 401 for an expired token', () => {
    const token = jwt.sign({ sub: 'abc123', role: 'user' }, process.env.JWT_SECRET!, {
      expiresIn: -10,
    });
    expect(() => verifyToken(token)).toThrow(expect.objectContaining({ statusCode: 401 }));
  });
});
