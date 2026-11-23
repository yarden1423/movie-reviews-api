import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { paginationQuerySchema } from '../schemas/common.schema';

export const usersRouter = Router();

usersRouter.get('/me', authenticate, authController.me);
usersRouter.get(
  '/me/reviews',
  authenticate,
  validate({ query: paginationQuerySchema }),
  reviewController.listMine,
);
