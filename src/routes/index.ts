import { Router } from 'express';
import { authRouter } from './auth.routes';
import { usersRouter } from './users.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
