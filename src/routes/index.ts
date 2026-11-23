import { Router } from 'express';
import { authRouter } from './auth.routes';
import { moviesRouter } from './movies.routes';
import { usersRouter } from './users.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/movies', moviesRouter);
