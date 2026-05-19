import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Spinner from '../components/Spinner';
import type { BoardSummary } from '../types';

export default function BoardsPage() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const loadBoards = () => {
    setLoading(true);
    api
      .get<{ boards: BoardSummary[] }>('/boards')
      .then((res) => setBoards(res.boards))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load boards'),
      )
      .finally(() => setLoading(false));
  };

  useEffect(loadBoards, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api.post('/boards', { title: newTitle.trim() });
      setNewTitle('');
      loadBoards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (board: BoardSummary) => {
    if (!confirm(`Delete board “${board.title}”? This cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/boards/${board.id}`);
      setBoards((prev) => prev.filter((b) => b.id !== board.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete board');
    }
  };

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>Your boards</h1>
          <p className="muted">
            Each board is a project. Click one to open its Kanban view.
          </p>
        </div>
      </div>

      <form className="board-create" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New board title…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          maxLength={120}
        />
        <button
          className="btn btn--primary"
          type="submit"
          disabled={creating || !newTitle.trim()}
        >
          {creating ? 'Creating…' : 'Create board'}
        </button>
      </form>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <Spinner />
      ) : boards.length === 0 ? (
        <div className="empty">
          <p>No boards yet — create your first one above. 🎯</p>
        </div>
      ) : (
        <ul className="board-grid">
          {boards.map((board) => (
            <li key={board.id} className="board-tile">
              <Link to={`/boards/${board.id}`} className="board-tile__main">
                <h3>{board.title}</h3>
                <span className="badge">
                  {board.card_count}{' '}
                  {board.card_count === 1 ? 'card' : 'cards'}
                </span>
              </Link>
              <button
                className="board-tile__delete"
                title="Delete board"
                onClick={() => handleDelete(board)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
