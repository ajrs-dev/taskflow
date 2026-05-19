import type { Request, Response } from 'express';
import { db } from '../db';
import { ApiError } from '../utils/ApiError';
import { currentUser } from '../middleware/auth';
import {
  createCardSchema,
  moveCardSchema,
  updateCardSchema,
  validate,
} from '../utils/validation';
import { getOwnedList } from './list.controller';
import type { CardRow } from '../types';

/** Fetch a card and confirm the owning board belongs to the user, or 404. */
function getOwnedCard(cardId: number, userId: number): CardRow {
  const row = db
    .prepare(
      `SELECT c.* FROM cards c
         JOIN lists l ON l.id = c.list_id
         JOIN boards b ON b.id = l.board_id
        WHERE c.id = ? AND b.user_id = ?`,
    )
    .get(cardId, userId) as CardRow | undefined;

  if (!row) {
    throw ApiError.notFound('Card not found');
  }
  return row;
}

function countCards(listId: number): number {
  const { count } = db
    .prepare('SELECT COUNT(*) AS count FROM cards WHERE list_id = ?')
    .get(listId) as { count: number };
  return count;
}

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export async function createCard(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const list = getOwnedList(Number(req.params.listId), user.id);
  const { title, description } = validate(createCardSchema, req.body);

  const position = countCards(list.id);
  const result = db
    .prepare(
      'INSERT INTO cards (list_id, title, description, position) VALUES (?, ?, ?, ?)',
    )
    .run(list.id, title, description ?? '', position);

  const card = db
    .prepare('SELECT * FROM cards WHERE id = ?')
    .get(result.lastInsertRowid) as CardRow;

  res.status(201).json({ card });
}

export async function updateCard(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const card = getOwnedCard(Number(req.params.id), user.id);
  const updates = validate(updateCardSchema, req.body);

  db.prepare(
    `UPDATE cards
        SET title = COALESCE(?, title),
            description = COALESCE(?, description)
      WHERE id = ?`,
  ).run(updates.title ?? null, updates.description ?? null, card.id);

  const updated = db
    .prepare('SELECT * FROM cards WHERE id = ?')
    .get(card.id) as CardRow;

  res.json({ card: updated });
}

export async function moveCard(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const card = getOwnedCard(Number(req.params.id), user.id);
  const { listId: targetListId, position } = validate(
    moveCardSchema,
    req.body,
  );

  const sourceList = getOwnedList(card.list_id, user.id);
  const targetList = getOwnedList(targetListId, user.id);

  if (sourceList.board_id !== targetList.board_id) {
    throw ApiError.badRequest('Cannot move a card to a different board');
  }

  const move = db.transaction(() => {
    const oldPos = card.position;

    if (card.list_id === targetListId) {
      const newPos = clamp(position, 0, Math.max(0, countCards(targetListId) - 1));
      if (newPos === oldPos) return;

      if (newPos < oldPos) {
        db.prepare(
          `UPDATE cards SET position = position + 1
            WHERE list_id = ? AND position >= ? AND position < ?`,
        ).run(targetListId, newPos, oldPos);
      } else {
        db.prepare(
          `UPDATE cards SET position = position - 1
            WHERE list_id = ? AND position > ? AND position <= ?`,
        ).run(targetListId, oldPos, newPos);
      }
      db.prepare('UPDATE cards SET position = ? WHERE id = ?').run(
        newPos,
        card.id,
      );
      return;
    }

    // Moving to a different list: close the gap in the old list...
    db.prepare(
      'UPDATE cards SET position = position - 1 WHERE list_id = ? AND position > ?',
    ).run(card.list_id, oldPos);

    // ...then open a slot in the new list and drop the card in.
    const newPos = clamp(position, 0, countCards(targetListId));
    db.prepare(
      'UPDATE cards SET position = position + 1 WHERE list_id = ? AND position >= ?',
    ).run(targetListId, newPos);
    db.prepare(
      'UPDATE cards SET list_id = ?, position = ? WHERE id = ?',
    ).run(targetListId, newPos, card.id);
  });

  move();

  const updated = db
    .prepare('SELECT * FROM cards WHERE id = ?')
    .get(card.id) as CardRow;

  res.json({ card: updated });
}

export async function deleteCard(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const card = getOwnedCard(Number(req.params.id), user.id);

  db.transaction(() => {
    db.prepare('DELETE FROM cards WHERE id = ?').run(card.id);
    db.prepare(
      'UPDATE cards SET position = position - 1 WHERE list_id = ? AND position > ?',
    ).run(card.list_id, card.position);
  })();

  res.status(204).end();
}
