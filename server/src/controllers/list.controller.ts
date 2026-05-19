import type { Request, Response } from 'express';
import { db } from '../db';
import { ApiError } from '../utils/ApiError';
import { currentUser } from '../middleware/auth';
import { listSchema, validate } from '../utils/validation';
import { getOwnedBoard } from './board.controller';
import type { ListRow } from '../types';

/** Fetch a list and confirm the owning board belongs to the user, or 404. */
export function getOwnedList(listId: number, userId: number): ListRow {
  const row = db
    .prepare(
      `SELECT l.* FROM lists l
         JOIN boards b ON b.id = l.board_id
        WHERE l.id = ? AND b.user_id = ?`,
    )
    .get(listId, userId) as ListRow | undefined;

  if (!row) {
    throw ApiError.notFound('List not found');
  }
  return row;
}

export async function createList(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const board = getOwnedBoard(Number(req.params.boardId), user.id);
  const { title } = validate(listSchema, req.body);

  const { count } = db
    .prepare('SELECT COUNT(*) AS count FROM lists WHERE board_id = ?')
    .get(board.id) as { count: number };

  const result = db
    .prepare('INSERT INTO lists (board_id, title, position) VALUES (?, ?, ?)')
    .run(board.id, title, count);

  const list = db
    .prepare('SELECT * FROM lists WHERE id = ?')
    .get(result.lastInsertRowid) as ListRow;

  res.status(201).json({ list: { ...list, cards: [] } });
}

export async function updateList(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const list = getOwnedList(Number(req.params.id), user.id);
  const { title } = validate(listSchema, req.body);

  db.prepare('UPDATE lists SET title = ? WHERE id = ?').run(title, list.id);
  const updated = db
    .prepare('SELECT * FROM lists WHERE id = ?')
    .get(list.id) as ListRow;

  res.json({ list: updated });
}

export async function deleteList(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const list = getOwnedList(Number(req.params.id), user.id);

  db.prepare('DELETE FROM lists WHERE id = ?').run(list.id);
  res.status(204).end();
}
