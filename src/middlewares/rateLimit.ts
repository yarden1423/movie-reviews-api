import rateLimit from 'express-rate-limit';

/** Slows down brute-force attempts on login/register. Disabled in tests. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, please try again later' },
  },
});
