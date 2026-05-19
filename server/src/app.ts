import express, { type Express } from 'express';
import cors from 'cors';
import { config } from './config';
import './db'; // ensure the database is initialised on boot
import authRoutes from './routes/auth.routes';
import boardRoutes from './routes/board.routes';
import listRoutes from './routes/list.routes';
import cardRoutes from './routes/card.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

/** Build and configure the Express application (kept separate so tests can import it). */
export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/boards', boardRoutes);
  app.use('/api/lists', listRoutes);
  app.use('/api/cards', cardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
