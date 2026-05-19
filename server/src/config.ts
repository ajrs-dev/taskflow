import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralised, typed access to environment configuration.
 * Defaults are safe for local development only.
 */
export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'super-secret-dev-key-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // ":memory:" gives every process a fresh, throwaway database (used by tests).
  dbPath:
    process.env.DB_PATH === ':memory:'
      ? ':memory:'
      : path.resolve(process.cwd(), process.env.DB_PATH || 'taskflow.db'),
} as const;
