import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

/** Fallback 404 for unknown routes. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}

/**
 * Central error handler. Anything thrown in a route ends up here and is turned
 * into a consistent JSON error response.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Unique constraint etc. from SQLite.
  if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
    res.status(409).json({ error: 'That record already exists' });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
