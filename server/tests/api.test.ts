import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app';

let app: Express;

beforeAll(() => {
  app = createApp();
});

/** Helper: register a user and return their auth token. */
async function registerUser(email: string) {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Test User',
    email,
    password: 'password123',
  });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

describe('Auth', () => {
  it('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('rejects duplicate registrations', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada Again',
      email: 'ada@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('rejects invalid input with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf('string');
  });

  it('rejects a bad password on login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf('string');
  });
});

describe('Boards / lists / cards', () => {
  let token: string;

  beforeAll(async () => {
    token = await registerUser('owner@example.com');
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('blocks unauthenticated access', async () => {
    const res = await request(app).get('/api/boards');
    expect(res.status).toBe(401);
  });

  it('creates a board seeded with three default lists', async () => {
    const created = await request(app)
      .post('/api/boards')
      .set(auth())
      .send({ title: 'My Project' });
    expect(created.status).toBe(201);

    const boardId = created.body.board.id;
    const full = await request(app)
      .get(`/api/boards/${boardId}`)
      .set(auth());

    expect(full.status).toBe(200);
    expect(full.body.board.lists).toHaveLength(3);
    expect(full.body.board.lists.map((l: { title: string }) => l.title)).toEqual(
      ['To Do', 'In Progress', 'Done'],
    );
  });

  it('supports the full card lifecycle including moving between lists', async () => {
    const board = (
      await request(app)
        .post('/api/boards')
        .set(auth())
        .send({ title: 'Lifecycle' })
    ).body.board;

    const full = (
      await request(app).get(`/api/boards/${board.id}`).set(auth())
    ).body.board;
    const [todo, , done] = full.lists;

    // Add two cards to "To Do".
    const card1 = (
      await request(app)
        .post(`/api/lists/${todo.id}/cards`)
        .set(auth())
        .send({ title: 'First task' })
    ).body.card;
    await request(app)
      .post(`/api/lists/${todo.id}/cards`)
      .set(auth())
      .send({ title: 'Second task' });

    // Edit a card.
    const edited = await request(app)
      .patch(`/api/cards/${card1.id}`)
      .set(auth())
      .send({ description: 'Now with details' });
    expect(edited.status).toBe(200);
    expect(edited.body.card.description).toBe('Now with details');

    // Move card1 to the "Done" list.
    const moved = await request(app)
      .put(`/api/cards/${card1.id}/move`)
      .set(auth())
      .send({ listId: done.id, position: 0 });
    expect(moved.status).toBe(200);
    expect(moved.body.card.list_id).toBe(done.id);

    // The remaining card in "To Do" should have been re-indexed to 0.
    const after = (
      await request(app).get(`/api/boards/${board.id}`).set(auth())
    ).body.board;
    const todoAfter = after.lists.find(
      (l: { id: number }) => l.id === todo.id,
    );
    expect(todoAfter.cards).toHaveLength(1);
    expect(todoAfter.cards[0].position).toBe(0);

    // Delete the moved card.
    const del = await request(app)
      .delete(`/api/cards/${card1.id}`)
      .set(auth());
    expect(del.status).toBe(204);
  });

  it("does not let a user touch another user's board", async () => {
    const intruderToken = await registerUser('intruder@example.com');
    const board = (
      await request(app)
        .post('/api/boards')
        .set(auth())
        .send({ title: 'Private' })
    ).body.board;

    const res = await request(app)
      .get(`/api/boards/${board.id}`)
      .set({ Authorization: `Bearer ${intruderToken}` });

    expect(res.status).toBe(404);
  });
});
