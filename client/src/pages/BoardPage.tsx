import {
  type DragEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import Spinner from '../components/Spinner';
import type { Board, Card, List } from '../types';

interface DragInfo {
  cardId: number;
  fromListId: number;
}

/** Pure helper: returns the new lists array after moving a card. */
function moveCardInLists(
  lists: List[],
  cardId: number,
  fromListId: number,
  toListId: number,
  beforeCardId: number | null,
): { lists: List[]; index: number } {
  const next = lists.map((l) => ({ ...l, cards: [...l.cards] }));
  const from = next.find((l) => l.id === fromListId)!;
  const cardIdx = from.cards.findIndex((c) => c.id === cardId);
  const [card] = from.cards.splice(cardIdx, 1);

  const to = next.find((l) => l.id === toListId)!;
  let index =
    beforeCardId == null
      ? to.cards.length
      : to.cards.findIndex((c) => c.id === beforeCardId);
  if (index === -1) index = to.cards.length;

  to.cards.splice(index, 0, { ...card, list_id: toListId });
  next.forEach((l) => l.cards.forEach((c, i) => (c.position = i)));
  return { lists: next, index };
}

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const boardId = Number(id);

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [addingListTitle, setAddingListTitle] = useState('');
  const [addCardFor, setAddCardFor] = useState<number | null>(null);
  const [addCardText, setAddCardText] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ board: Board }>(`/boards/${boardId}`)
      .then((res) => setBoard(res.board))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load board'),
      )
      .finally(() => setLoading(false));
  }, [boardId]);

  useEffect(load, [load]);

  const patchBoardState = (mutate: (b: Board) => Board) =>
    setBoard((prev) => (prev ? mutate(structuredClone(prev)) : prev));

  // ---- Board ----------------------------------------------------------
  const renameBoard = async (title: string) => {
    if (!board || !title.trim() || title === board.title) return;
    try {
      await api.patch(`/boards/${board.id}`, { title: title.trim() });
      patchBoardState((b) => ({ ...b, title: title.trim() }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  const deleteBoard = async () => {
    if (!board || !confirm(`Delete board “${board.title}”?`)) return;
    try {
      await api.delete(`/boards/${board.id}`);
      navigate('/boards');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // ---- Lists ----------------------------------------------------------
  const addList = async (e: FormEvent) => {
    e.preventDefault();
    if (!addingListTitle.trim()) return;
    try {
      const res = await api.post<{ list: List }>(
        `/boards/${boardId}/lists`,
        { title: addingListTitle.trim() },
      );
      patchBoardState((b) => ({ ...b, lists: [...b.lists, res.list] }));
      setAddingListTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add list');
    }
  };

  const renameList = async (list: List, title: string) => {
    if (!title.trim() || title === list.title) return;
    try {
      await api.patch(`/lists/${list.id}`, { title: title.trim() });
      patchBoardState((b) => ({
        ...b,
        lists: b.lists.map((l) =>
          l.id === list.id ? { ...l, title: title.trim() } : l,
        ),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  const deleteList = async (list: List) => {
    if (!confirm(`Delete list “${list.title}” and its cards?`)) return;
    try {
      await api.delete(`/lists/${list.id}`);
      patchBoardState((b) => ({
        ...b,
        lists: b.lists.filter((l) => l.id !== list.id),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // ---- Cards ----------------------------------------------------------
  const addCard = async (listId: number) => {
    if (!addCardText.trim()) return;
    try {
      const res = await api.post<{ card: Card }>(`/lists/${listId}/cards`, {
        title: addCardText.trim(),
      });
      patchBoardState((b) => ({
        ...b,
        lists: b.lists.map((l) =>
          l.id === listId ? { ...l, cards: [...l.cards, res.card] } : l,
        ),
      }));
      setAddCardText('');
      setAddCardFor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add card');
    }
  };

  const saveCard = async (
    cardId: number,
    changes: { title?: string; description?: string },
  ) => {
    try {
      const res = await api.patch<{ card: Card }>(
        `/cards/${cardId}`,
        changes,
      );
      patchBoardState((b) => ({
        ...b,
        lists: b.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) => (c.id === cardId ? res.card : c)),
        })),
      }));
      setActiveCard(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save card');
    }
  };

  const deleteCard = async (cardId: number) => {
    try {
      await api.delete(`/cards/${cardId}`);
      patchBoardState((b) => ({
        ...b,
        lists: b.lists.map((l) => ({
          ...l,
          cards: l.cards.filter((c) => c.id !== cardId),
        })),
      }));
      setActiveCard(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete card');
    }
  };

  // ---- Drag & drop ----------------------------------------------------
  const onCardDragStart =
    (cardId: number, fromListId: number) => (e: DragEvent) => {
      setDrag({ cardId, fromListId });
      e.dataTransfer.effectAllowed = 'move';
    };

  const handleDrop = (toListId: number, beforeCardId: number | null) => {
    if (!board || !drag) return;
    const { cardId, fromListId } = drag;
    const { lists, index } = moveCardInLists(
      board.lists,
      cardId,
      fromListId,
      toListId,
      beforeCardId,
    );
    setBoard({ ...board, lists });
    setDrag(null);
    api
      .put(`/cards/${cardId}/move`, { listId: toListId, position: index })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Move failed');
        load();
      });
  };

  const allowDrop = (e: DragEvent) => e.preventDefault();

  // ---- Render ---------------------------------------------------------
  if (loading) return <Spinner />;
  if (error && !board) return <div className="alert container">{error}</div>;
  if (!board) return null;

  return (
    <div className="board-page">
      <div className="container board-page__head">
        <button className="link-back" onClick={() => navigate('/boards')}>
          ← All boards
        </button>
        <input
          className="board-title"
          defaultValue={board.title}
          onBlur={(e) => renameBoard(e.target.value)}
          aria-label="Board title"
        />
        <button className="btn btn--danger-ghost" onClick={deleteBoard}>
          Delete board
        </button>
      </div>

      {error && <div className="alert container">{error}</div>}

      <div className="board">
        {board.lists.map((list) => (
          <section
            key={list.id}
            className="list"
            onDragOver={allowDrop}
            onDrop={() => handleDrop(list.id, null)}
          >
            <header className="list__head">
              <input
                className="list__title"
                defaultValue={list.title}
                key={list.title}
                onBlur={(e) => renameList(list, e.target.value)}
              />
              <button
                className="icon-btn"
                title="Delete list"
                onClick={() => deleteList(list)}
              >
                ✕
              </button>
            </header>

            <div className="list__cards">
              {list.cards.map((card) => (
                <article
                  key={card.id}
                  className="kanban-card"
                  draggable
                  onDragStart={onCardDragStart(card.id, list.id)}
                  onDragOver={allowDrop}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDrop(list.id, card.id);
                  }}
                  onClick={() => setActiveCard(card)}
                >
                  <p className="kanban-card__title">{card.title}</p>
                  {card.description && (
                    <span className="kanban-card__desc-dot" title="Has notes">
                      ≣
                    </span>
                  )}
                </article>
              ))}
              {list.cards.length === 0 && (
                <p className="list__empty">Drop cards here</p>
              )}
            </div>

            {addCardFor === list.id ? (
              <form
                className="add-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  addCard(list.id);
                }}
              >
                <textarea
                  autoFocus
                  placeholder="Card title…"
                  value={addCardText}
                  onChange={(e) => setAddCardText(e.target.value)}
                />
                <div className="add-card__actions">
                  <button className="btn btn--primary btn--sm" type="submit">
                    Add
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setAddCardFor(null);
                      setAddCardText('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                className="list__add"
                onClick={() => {
                  setAddCardFor(list.id);
                  setAddCardText('');
                }}
              >
                + Add a card
              </button>
            )}
          </section>
        ))}

        <form className="list list--ghost" onSubmit={addList}>
          <input
            className="list__title"
            placeholder="+ Add a list"
            value={addingListTitle}
            onChange={(e) => setAddingListTitle(e.target.value)}
          />
          {addingListTitle.trim() && (
            <button className="btn btn--primary btn--sm" type="submit">
              Add list
            </button>
          )}
        </form>
      </div>

      {activeCard && (
        <CardModal
          card={activeCard}
          onClose={() => setActiveCard(null)}
          onSave={saveCard}
          onDelete={deleteCard}
        />
      )}
    </div>
  );
}

function CardModal({
  card,
  onClose,
  onSave,
  onDelete,
}: {
  card: Card;
  onClose: () => void;
  onSave: (
    id: number,
    changes: { title?: string; description?: string },
  ) => void;
  onDelete: (id: number) => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <label htmlFor="card-title">Title</label>
        <input
          id="card-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label htmlFor="card-desc">Description</label>
        <textarea
          id="card-desc"
          rows={6}
          placeholder="Add more detail…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="modal__actions">
          <button
            className="btn btn--primary"
            onClick={() => onSave(card.id, { title, description })}
            disabled={!title.trim()}
          >
            Save
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--danger-ghost modal__delete"
            onClick={() => onDelete(card.id)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
