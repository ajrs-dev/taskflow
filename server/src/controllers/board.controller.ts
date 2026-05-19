import type { Request, Response } from 'express';
import { db } from '../db';
import { ApiError } from '../utils/ApiError';
import { currentUser } from '../middleware/auth';
import { boardSchema, validate } from '../utils/validation';
import type { BoardRow, CardRow, ListRow } from '../types';

const DEFAULT_LISTS = ['To Do', 'In Progress', 'Done'];

/** Fetch a board and confirm it belongs to the given user, or 404. */
export function getOwnedBoard(boardId: number, userId: number): BoardRow {
  const board = db
    .prepare('SELECT * FROM boards WHERE id = ?')
    .get(boardId) as BoardRow | undefined;

  if (!board || board.user_id !== userId) {
    throw ApiError.notFound('Board not found');
  }
  return board;
}

export async function listBoards(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const boards = db
    .prepare(
      `SELECT b.*, COUNT(c.id) AS card_count
         FROM boards b
         LEFT JOIN lists l ON l.board_id = b.id
         LEFT JOIN cards c ON c.list_id = l.id
        WHERE b.user_id = ?
        GROUP BY b.id
        ORDER BY b.created_at DESC`,
    )
    .all(user.id);

  res.json({ boards });
}

export async function createBoard(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const { title } = validate(boardSchema, req.body);

  const create = db.transaction((boardTitle: string) => {
    const result = db
      .prepare('INSERT INTO boards (user_id, title) VALUES (?, ?)')
      .run(user.id, boardTitle);
    const boardId = Number(result.lastInsertRowid);

    const insertList = db.prepare(
      'INSERT INTO lists (board_id, title, position) VALUES (?, ?, ?)',
    );
    DEFAULT_LISTS.forEach((listTitle, index) => {
      insertList.run(boardId, listTitle, index);
    });

    return boardId;
  });

  const boardId = create(title);
  const board = db
    .prepare('SELECT * FROM boards WHERE id = ?')
    .get(boardId) as BoardRow;

  res.status(201).json({ board });
}

export async function getBoard(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const board = getOwnedBoard(Number(req.params.id), user.id);

  const lists = db
    .prepare('SELECT * FROM lists WHERE board_id = ? ORDER BY position')
    .all(board.id) as ListRow[];

  const cardsByList = db
    .prepare(
      `SELECT c.* FROM cards c
         JOIN lists l ON l.id = c.list_id
        WHERE l.board_id = ?
        ORDER BY c.position`,
    )
    .all(board.id) as CardRow[];

  const listsWithCards = lists.map((list) => ({
    ...list,
    cards: cardsByList.filter((card) => card.list_id === list.id),
  }));

  res.json({ board: { ...board, lists: listsWithCards } });
}

export async function updateBoard(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const board = getOwnedBoard(Number(req.params.id), user.id);
  const { title } = validate(boardSchema, req.body);

  db.prepare('UPDATE boards SET title = ? WHERE id = ?').run(title, board.id);
  const updated = db
    .prepare('SELECT * FROM boards WHERE id = ?')
    .get(board.id) as BoardRow;

  res.json({ board: updated });
}

export async function deleteBoard(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const board = getOwnedBoard(Number(req.params.id), user.id);

  db.prepare('DELETE FROM boards WHERE id = ?').run(board.id);
  res.status(204).end();
}
