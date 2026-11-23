import type { Request, Response } from 'express';
import { currentUser } from '../middlewares/auth';
import type { ListMoviesQuery, TopRatedQuery } from '../schemas/movie.schema';
import { movieService } from '../services/movie.service';

export const movieController = {
  async list(req: Request, res: Response) {
    res.json(await movieService.list(req.query as unknown as ListMoviesQuery));
  },

  async topRated(req: Request, res: Response) {
    res.json(await movieService.topRated(req.query as unknown as TopRatedQuery));
  },

  async getById(req: Request<{ id: string }>, res: Response) {
    res.json(await movieService.getById(req.params.id));
  },

  async create(req: Request, res: Response) {
    const movie = await movieService.create(req.body, currentUser(req));
    res.status(201).location(`/api/movies/${movie.id}`).json(movie);
  },

  async update(req: Request<{ id: string }>, res: Response) {
    res.json(await movieService.update(req.params.id, req.body, currentUser(req)));
  },

  async remove(req: Request<{ id: string }>, res: Response) {
    await movieService.remove(req.params.id, currentUser(req));
    res.status(204).send();
  },
};
