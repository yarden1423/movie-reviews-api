import { User, type UserDocument } from '../models/user.model';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';
import { comparePassword, hashPassword } from '../utils/password';

interface AuthResult {
  user: UserDocument;
  token: string;
}

function issueToken(user: UserDocument) {
  return signToken({ sub: user.id, role: user.role });
}

async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await User.findOne({
    $or: [{ email: input.email }, { username: input.username }],
  });
  if (existing) {
    const field = existing.email === input.email ? 'Email' : 'Username';
    throw AppError.conflict(`${field} is already registered`);
  }

  const user = await User.create({
    username: input.username,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: 'user',
  });
  return { user, token: issueToken(user) };
}

async function login(input: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  // Same message for unknown email and wrong password, so emails can't be enumerated.
  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    throw AppError.unauthorized('Invalid email or password');
  }
  return { user, token: issueToken(user) };
}

async function getById(id: string): Promise<UserDocument> {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound('User');
  return user;
}

export const authService = { register, login, getById };
