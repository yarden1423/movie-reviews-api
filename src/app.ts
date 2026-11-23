import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
