/**
 * Creates (or promotes) the admin user defined by ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD.
 * Admins cannot be created through the public API on purpose.
 *   npm run seed:admin
 */
import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { registerSchema } from '../schemas/auth.schema';
import { hashPassword } from '../utils/password';

async function seedAdmin() {
  const input = registerSchema.parse({
    username: process.env.ADMIN_USERNAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });

  await connectDatabase(env.MONGO_URI);
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    existing.role = 'admin';
    await existing.save();
    console.log(`User ${existing.email} promoted to admin`);
  } else {
    await User.create({
      username: input.username,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: 'admin',
    });
    console.log(`Admin ${input.email} created`);
  }
  await disconnectDatabase();
}

seedAdmin().catch(async (err) => {
  console.error(err);
  await disconnectDatabase();
  process.exit(1);
});
