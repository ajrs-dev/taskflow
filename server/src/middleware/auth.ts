import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ApiError } from '../utils/ApiError';
import type { AuthUser } from '../types';

/**
 * Express middleware that requires a valid `Authorization: Bearer <token>`
 * header. On success it attaches the decoded user to `req.user`.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser & {
      iat: number;
      exp: number;
    };
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

/** Helper to read the authenticated user or fail loudly. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  return req.user;
}
