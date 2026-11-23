import { Router } from 'express';
import { movieController } from '../controllers/movie.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { idParamsSchema } from '../schemas/common.schema';
import {
  createMovieSchema,
  listMoviesQuerySchema,
  updateMovieSchema,
} from '../schemas/movie.schema';

export const moviesRouter = Router();

moviesRouter.get('/', validate({ query: listMoviesQuerySchema }), movieController.list);
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
