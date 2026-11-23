import { useTestDatabase } from '../helpers/db';
import { authService } from '../../src/services/auth.service';
import { User } from '../../src/models/user.model';
import { verifyToken } from '../../src/utils/jwt';

useTestDatabase();

const input = { username: 'yarden', email: 'yarden@example.com', password: 'Passw0rd!' };

describe('authService (integration)', () => {
  describe('register', () => {
    it('creates a user with role "user" and a hashed password', async () => {
      const { user, token } = await authService.register(input);

      expect(user.role).toBe('user');
      const stored = await User.findById(user.id).select('+passwordHash');
      expect(stored!.passwordHash).not.toBe(input.password);
      expect(verifyToken(token).sub).toBe(user.id);
    });

    it('rejects a duplicate email with 409', async () => {
      await authService.register(input);
      await expect(authService.register({ ...input, username: 'other' })).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it('rejects a duplicate username with 409', async () => {
      await authService.register(input);
      await expect(
        authService.register({ ...input, email: 'other@example.com' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('login', () => {
    it('returns a token for valid credentials', async () => {
      const { user } = await authService.register(input);
      const result = await authService.login({ email: input.email, password: input.password });
      expect(result.user.id).toBe(user.id);
      expect(verifyToken(result.token).role).toBe('user');
    });

    it('rejects a wrong password with 401', async () => {
      await authService.register(input);
      await expect(
        authService.login({ email: input.email, password: 'WrongPass1' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('rejects an unknown email with the same 401 message', async () => {
      await expect(
        authService.login({ email: 'nobody@example.com', password: 'Passw0rd!' }),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
    });
  });
});
