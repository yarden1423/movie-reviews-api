import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { idParamsSchema } from '../schemas/common.schema';
import { updateReviewSchema } from '../schemas/review.schema';

export const reviewsRouter = Router();

reviewsRouter.get('/:id', validate({ params: idParamsSchema }), reviewController.getById);
reviewsRouter.patch(
  '/:id',
  authenticate,
  validate({ params: idParamsSchema, body: updateReviewSchema }),
  reviewController.update,
);
reviewsRouter.delete(
  '/:id',
  authenticate,
  validate({ params: idParamsSchema }),
  reviewController.remove,
);
