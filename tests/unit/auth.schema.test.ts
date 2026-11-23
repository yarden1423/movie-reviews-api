import { loginSchema, registerSchema } from '../../src/schemas/auth.schema';

describe('auth schemas', () => {
  const valid = { username: 'yarden_1', email: 'Yarden@Example.com', password: 'Passw0rd!' };

  it('accepts a valid registration and normalizes the email', () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe('yarden@example.com');
  });

  it.each([
    ['username too short', { username: 'ab' }],
    ['username with spaces', { username: 'bad name' }],
    ['invalid email', { email: 'not-an-email' }],
    ['password too short', { password: 'Ab1!' }],
    ['password without a digit', { password: 'Password!' }],
    ['password without a letter', { password: '12345678' }],
  ])('rejects %s', (_label, override) => {
    expect(registerSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });

  it('does not let a client choose its own role', () => {
    const result = registerSchema.parse({ ...valid, role: 'admin' });
    expect(result).not.toHaveProperty('role');
  });

  it('requires email and password on login', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });
});
