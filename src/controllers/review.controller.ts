import type { Request, Response } from 'express';
import { currentUser } from '../middlewares/auth';
import type { PaginationQuery } from '../schemas/common.schema';
import { reviewService } from '../services/review.service';

type IdParams = { id: string };

export const reviewController = {
  async listForMovie(req: Request<IdParams>, res: Response) {
    res.json(
      await reviewService.listByMovie(req.params.id, req.query as unknown as PaginationQuery),
    );
  },

  async createForMovie(req: Request<IdParams>, res: Response) {
    const review = await reviewService.create(req.params.id, req.body, currentUser(req));
    res.status(201).location(`/api/reviews/${review.id}`).json(review);
  },

  async listMine(req: Request, res: Response) {
    res.json(
      await reviewService.listByUser(currentUser(req).id, req.query as unknown as PaginationQuery),
    );
  },

  async getById(req: Request<IdParams>, res: Response) {
    res.json(await reviewService.getById(req.params.id));
  },

  async update(req: Request<IdParams>, res: Response) {
    res.json(await reviewService.update(req.params.id, req.body, currentUser(req)));
  },

  async remove(req: Request<IdParams>, res: Response) {
    await reviewService.remove(req.params.id, currentUser(req));
    res.status(204).send();
  },
};
