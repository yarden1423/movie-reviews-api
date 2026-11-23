import type { Request, Response } from 'express';
import { currentUser } from '../middlewares/auth';
import { authService } from '../services/auth.service';

export const authController = {
  async register(req: Request, res: Response) {
    const { user, token } = await authService.register(req.body);
    res.status(201).json({ user, token });
  },

  async login(req: Request, res: Response) {
    const { user, token } = await authService.login(req.body);
    res.json({ user, token });
  },

  async me(req: Request, res: Response) {
    const user = await authService.getById(currentUser(req).id);
    res.json(user);
  },
};
