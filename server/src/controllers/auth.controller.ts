import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { config } from '../config';
import { ApiError } from '../utils/ApiError';
import { currentUser } from '../middleware/auth';
import { loginSchema, registerSchema, validate } from '../utils/validation';
import type { UserRow } from '../types';

function signToken(user: { id: number; email: string }): string {
  const options: jwt.SignOptions = {
    expiresIn: config.jwtExpiresIn as unknown as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, options);
}

function publicUser(user: UserRow) {
  return { id: user.id, name: user.name, email: user.email };
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = validate(registerSchema, req.body);

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email);
  if (existing) {
    throw ApiError.conflict('An account with that email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = db
    .prepare(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)',
    )
    .run(email, name, passwordHash);

  const user = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(result.lastInsertRowid) as UserRow;

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = validate(loginSchema, req.body);

  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email) as UserRow | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  res.json({ token: signToken(user), user: publicUser(user) });
}

export async function me(req: Request, res: Response): Promise<void> {
  const { id } = currentUser(req);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
    | UserRow
    | undefined;

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  res.json({ user: publicUser(user) });
}
