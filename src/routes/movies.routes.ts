import { Router } from 'express';
import { movieController } from '../controllers/movie.controller';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { idParamsSchema, paginationQuerySchema } from '../schemas/common.schema';
import {
  createMovieSchema,
  listMoviesQuerySchema,
  topRatedQuerySchema,
  updateMovieSchema,
} from '../schemas/movie.schema';
import { createReviewSchema } from '../schemas/review.schema';

export const moviesRouter = Router();

moviesRouter.get('/', validate({ query: listMoviesQuerySchema }), movieController.list);
// Must be registered before '/:id' so "top" is not treated as an id.
moviesRouter.get('/top', validate({ query: topRatedQuerySchema }), movieController.topRated);
moviesRouter.get('/:id', validate({ params: idParamsSchema }), movieController.getById);
moviesRouter.post('/', authenticate, validate({ body: createMovieSchema }), movieController.create);
moviesRouter.patch(
  '/:id',
  authenticate,
  validate({ params: idParamsSchema, body: updateMovieSchema }),
  movieController.update,
);
moviesRouter.delete(
  '/:id',
  authenticate,
  validate({ params: idParamsSchema }),
  movieController.remove,
);

// Reviews nested under a movie
moviesRouter.get(
  '/:id/reviews',
  validate({ params: idParamsSchema, query: paginationQuerySchema }),
  reviewController.listForMovie,
);
moviesRouter.post(
  '/:id/reviews',
  authenticate,
  validate({ params: idParamsSchema, body: createReviewSchema }),
  reviewController.createForMovie,
);
