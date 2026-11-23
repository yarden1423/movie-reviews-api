import { comparePassword, hashPassword } from '../../src/utils/password';

describe('password utils', () => {
  it('hashes a password so the plain text is not stored', async () => {
    const hash = await hashPassword('Passw0rd!');
    expect(hash).not.toBe('Passw0rd!');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('matches the correct password', async () => {
    const hash = await hashPassword('Passw0rd!');
    await expect(comparePassword('Passw0rd!', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('Passw0rd!');
    await expect(comparePassword('wrong-pass1', hash)).resolves.toBe(false);
  });
});
