import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';

export const usersRouter = Router();

usersRouter.get('/me', authenticate, authController.me);
